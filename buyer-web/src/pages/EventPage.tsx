import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, getToken, type Listing, type SahraEvent, type Tier, type VenueSection, type WaitingRoomEntry } from '../lib/api';
import { MAX_PER_ORDER, RESALE_CAP_PCT } from '../lib/config';
import { allIn, formatEventDate, formatMoney } from '../lib/format';
import { useAuth } from '../lib/auth';
import { EmptyState, Spinner, Badge, countdownLine } from '../components/ui';
import { ArrowLeftIcon, MinusIcon, PlusIcon, TicketIcon } from '../components/icons';
import { EVENT_MEDIA_GRADIENT, eventSoldOut, remainingIn } from '../components/EventCard';

/** What the checkout page needs, the backend takes ONE line per intent. */
export interface CheckoutSelection {
  kind: 'tier' | 'section' | 'resale';
  eventId: string;
  tierId?: string;
  tierName?: string;
  sectionId?: string;
  sectionName?: string;
  seatLabels?: string[];
  listingCode?: string;
  priceCents: number;
  quantity: number;
  currency?: string;
  eventTitle: string;
  eventStartsAt: string;
  eventLocation: string;
}

type Selection =
  | { kind: 'tier'; tier: Tier }
  | { kind: 'listing'; listing: Listing }
  | null;

export default function EventPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, requireAuth } = useAuth();

  const [event, setEvent] = useState<SahraEvent | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [heldCount, setHeldCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [tierQty, setTierQty] = useState<Record<string, number>>({});
  const [remindState, setRemindState] = useState<'idle' | 'done' | 'unavailable'>('idle');

  useEffect(() => {
    let active = true;
    Promise.all([api.event(id), api.listings(id).catch(() => ({ listings: [] as Listing[] }))])
      .then(async ([evRes, lsRes]) => {
        if (!active) return;
        setEvent(evRes.event);
        setListings(lsRes.listings);
        if (getToken()) {
          try {
            const res = await api.tickets();
            if (active) {
              setHeldCount(
                res.tickets.filter((t) => t.eventId === evRes.event.id && t.status === 'VALID').length
              );
            }
          } catch {
            /* count is best-effort */
          }
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof ApiError ? e.message : 'Failed to load event');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const onSale = event?.status === 'PUBLISHED';
  const tiers = event?.tiers ?? [];
  const sections = event?.venueSections ?? [];
  const soldOut = event ? eventSoldOut(event) : false;

  // Resale sits inside the matching tier, cheapest first.
  const listingsByTier = useMemo(() => {
    const map = new Map<string, Listing[]>();
    for (const l of listings.filter((l) => l.status === 'ACTIVE')) {
      const arr = map.get(l.tierName) ?? [];
      arr.push(l);
      map.set(l.tierName, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.priceCents - b.priceCents);
    return map;
  }, [listings]);

  const tierCap = (t: Tier) => Math.min(remainingIn(t), MAX_PER_ORDER);
  const tierSoldOut = (t: Tier) => remainingIn(t) <= 0;

  function changeTierQty(tier: Tier, qty: number) {
    const clamped = Math.max(0, Math.min(qty, tierCap(tier)));
    // One line per order intent: adjusting a tier makes it the only line.
    setTierQty(clamped === 0 ? {} : { [tier.id]: clamped });
    setSelection(clamped === 0 ? null : { kind: 'tier', tier });
  }

  const totalCents =
    selection?.kind === 'tier'
      ? allIn(selection.tier.priceCents) * (tierQty[selection.tier.id] ?? 0)
      : selection?.kind === 'listing'
        ? allIn(selection.listing.priceCents)
        : 0;

  async function remindMe() {
    try {
      await api.reminder(id, true);
      setRemindState('done');
    } catch {
      setRemindState('unavailable');
    }
  }

  function buy() {
    if (!selection || !event) return;
    // A2: sign in over the page, then continue straight to checkout.
    // requireAuth runs the continuation immediately when already signed in.
    requireAuth('buy', goToCheckout);
  }

  function goToCheckout() {
    if (!selection || !event) return;
    const base = {
      eventId: event.id,
      currency: event.currency,
      eventTitle: event.title,
      eventStartsAt: event.startsAt,
      eventLocation: event.location,
    };
    const sel: CheckoutSelection =
      selection.kind === 'tier'
        ? {
            ...base,
            kind: 'tier',
            tierId: selection.tier.id,
            tierName: selection.tier.name,
            priceCents: selection.tier.priceCents,
            quantity: tierQty[selection.tier.id] ?? 1,
          }
        : {
            ...base,
            kind: 'resale',
            listingCode: selection.listing.ticketCode,
            tierName: selection.listing.tierName,
            priceCents: selection.listing.priceCents,
            quantity: 1,
          };
    navigate('/checkout', { state: { selection: sel } });
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <EmptyState title="Event not found">{error ?? 'This event is unavailable.'}</EmptyState>
      </div>
    );
  }

  const saleNote = (tier: Tier) => {
    if (tierSoldOut(tier)) return null;
    const left = remainingIn(tier);
    return left <= 10 ? `${left} left · selling fast` : `${left} left`;
  };

  return (
    <div className="mx-auto max-w-[1440px] px-6 pb-24 pt-8 lg:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-night-muted transition hover:text-sand"
      >
        <ArrowLeftIcon size={15} className="rtl-mirror" /> All events
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-10">
        {/* left column */}
        <div>
          <div className={`relative h-[300px] overflow-hidden rounded-card bg-gradient-to-br ${EVENT_MEDIA_GRADIENT}`}>
            {event.imageUrl ? (
              <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="font-display text-8xl font-extrabold text-sand/15">{event.title.charAt(0)}</span>
              </div>
            )}
            <div className="absolute end-4 top-4">
              <Badge tone="gold">{event.category}</Badge>
            </div>
          </div>

          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-sand">
            {event.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-night-muted">
            <span>
              {formatEventDate(event.startsAt)} · {event.location}
            </span>
            {event.startsAt ? (
              <span className="rounded-full bg-night-surface px-3 py-1 text-xs font-semibold text-gold">
                {countdownLine(event.startsAt)}
              </span>
            ) : null}
          </div>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-sand/75">{event.description}</p>
        </div>

        {/* tickets panel */}
        <aside className="h-fit rounded-card bg-night-surface p-5 lg:sticky lg:top-24">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-extrabold tracking-wide text-gold">TICKETS</h2>
            {heldCount > 0 ? (
              <Link to="/tickets" className="text-xs font-semibold text-gold hover:underline">
                You have {heldCount} ticket{heldCount === 1 ? '' : 's'} →
              </Link>
            ) : null}
          </div>

          {onSale ? (
            <div className="flex flex-col gap-5">
              {tiers.map((tier) => {
                const out = tierSoldOut(tier);
                const tierListings = listingsByTier.get(tier.name) ?? [];
                const qty = tierQty[tier.id] ?? 0;
                return (
                  <div key={tier.id} className="flex flex-col gap-2.5 border-b border-night-border/60 py-3 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-sand">{tier.name}</div>
                        <div className={`tnum text-[13px] ${out ? 'text-night-muted' : 'text-gold'}`}>
                          {out ? '' : `${formatMoney(allIn(tier.priceCents), event.currency)}`}
                          {saleNote(tier) ? ` · ${saleNote(tier)}` : ''}
                        </div>
                      </div>
                      {out ? (
                        <span className="rounded-full bg-night-border px-3.5 py-1.5 text-xs text-sand/70">Sold out</span>
                      ) : (
                        <Stepper qty={qty} min={0} max={tierCap(tier)} onChange={(q) => changeTierQty(tier, q)} />
                      )}
                    </div>

                    {/* resale inside the tier, cheapest first */}
                    {tierListings.map((listing) => {
                      const mine = !!user && listing.sellerId === user.id;
                      const picked = selection?.kind === 'listing' && selection.listing.ticketCode === listing.ticketCode;
                      return (
                        <button
                          key={listing.ticketCode}
                          type="button"
                          disabled={mine}
                          onClick={() => {
                            setTierQty({});
                            setSelection(picked ? null : { kind: 'listing', listing });
                          }}
                          className={`flex items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                            picked
                              ? 'border-gold bg-gold/10'
                              : mine
                                ? 'border-night-border/60 opacity-60'
                                : 'border-night-border/60 hover:border-gold/60'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-sand">
                              {formatMoney(allIn(listing.priceCents), event.currency)}
                              <span className="ml-2 rounded-full bg-night-border px-2 py-0.5 text-[11px] font-medium text-sand/80">
                                Resale
                              </span>
                            </span>
                            <span className="block truncate text-xs text-night-muted">
                              {mine ? 'Your listing' : 'Fan resale'}
                            </span>
                          </span>
                          <span className="tnum shrink-0 text-xs text-night-muted">{listing.tierName}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* seated sections → seat selection */}
              {sections.map((section: VenueSection) => {
                const out = (section.remaining ?? section.available ?? 0) <= 0;
                return (
                  <div key={section.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-sand">{section.name}</div>
                      <div className="tnum text-[13px] text-gold">
                        {formatMoney(allIn(section.priceCents), event.currency)}
                        <span className="text-night-muted">
                          {' '}
                          · {section.remaining ?? section.available ?? 0} left
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={out}
                      onClick={() => navigate(`/events/${event.id}/seats?section=${encodeURIComponent(section.id)}`)}
                      className="shrink-0 rounded-full bg-gold px-4 py-2 text-[13px] font-bold text-night transition hover:brightness-95 disabled:opacity-40"
                    >
                      {out ? 'Sold out' : 'Choose seats'}
                    </button>
                  </div>
                );
              })}

              {soldOut && tiers.length > 0 ? (
                <div className="rounded-xl border border-night-border/60 p-4 text-sm text-sand/80">
                  Sold out. Want us to tell you if seats open up?{' '}
                  <button type="button" onClick={remindMe} className="font-semibold text-gold hover:underline">
                    Remind me
                  </button>
                  {remindState === 'unavailable' ? (
                    <span className="block pt-1 text-xs text-night-muted">Reminders aren’t available yet, check back soon.</span>
                  ) : remindState === 'done' ? (
                    <span className="block pt-1 text-xs text-gold">You’re on the list, we’ll tell you if seats open up.</span>
                  ) : null}
                </div>
              ) : null}

              {/* set your price on any sold-out tier (auto-buy watch) */}
              {tiers.some(tierSoldOut) ? (
                <Link
                  to={`/offers/new?eventId=${event.id}&tierName=${encodeURIComponent(
                    tiers.find(tierSoldOut)?.name ?? ''
                  )}`}
                  className="text-center text-sm font-semibold text-gold hover:underline"
                >
                  Set your price, we’ll flag it if a fan lists one
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-sand/80">
                {event.status === 'CANCELLED' ? 'This event is cancelled.' : 'This event isn’t on sale right now.'}
              </p>
              {event.status !== 'CANCELLED' ? (
                <button
                  type="button"
                  onClick={remindMe}
                  className="rounded-full border-[1.5px] border-gold px-5 py-2.5 text-sm font-bold text-gold transition hover:bg-gold hover:text-night"
                >
                  Remind me
                </button>
              ) : null}
              {remindState === 'unavailable' ? (
                <p className="text-xs text-night-muted">Reminders aren’t available yet, check back soon.</p>
              ) : remindState === 'done' ? (
                <p className="text-xs text-gold">You’re on the list, we’ll tell you the moment tickets go on sale.</p>
              ) : null}
            </div>
          )}

          <WaitingRoomCard eventId={event.id} />

          {/* total + CTA */}
          <div className="mt-5 flex items-center justify-between border-t border-night-border/60 pt-4 text-[15px]">
            <span className="font-semibold text-sand">Total</span>
            <span className="tnum font-extrabold text-gold">
              {totalCents > 0 ? formatMoney(totalCents, event.currency) : '-'}
            </span>
          </div>
          <button
            type="button"
            disabled={!selection || !onSale || totalCents <= 0}
            onClick={buy}
            className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-gold font-display text-[15px] font-bold text-night transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TicketIcon size={17} />
            {user ? 'Checkout' : 'Sign in to buy'}
          </button>
          <p className="pt-3 text-[13px] leading-[1.5] text-[#c9d3df]">
            Prices include the 7% Sahra fee. What you see is what you pay.
          </p>
          <p className="pt-1 text-xs leading-relaxed text-night-muted">
            Max {MAX_PER_ORDER} per order · resale capped at face +{RESALE_CAP_PCT}%
          </p>
        </aside>
      </div>
    </div>
  );
}

/** W4: waiting room — join ahead of the drop, see position, leave; admitted
 *  fans get a 10-minute hold before they're rotated to the back. The card is
 *  self-gating: it renders nothing when the event has no waiting room. */
function WaitingRoomCard({ eventId }: { eventId: string }) {
  const { user, requireAuth } = useAuth();
  const [entry, setEntry] = useState<WaitingRoomEntry | null | 'none'>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(false);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await api.waitingRoomStatus(eventId);
        if (alive) {
          setEntry(res.entry);
          setOpen(res.open === true);
        }
      } catch {
        if (alive) setEntry('none');
      }
    }
    poll();
    const t = setInterval(poll, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [eventId, user]);

  async function join() {
    setBusy(true);
    try {
      const res = await api.joinWaitingRoom(eventId);
      setEntry(res.entry);
      setLeft(false);
    } catch {
      setEntry('none');
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      await api.leaveWaitingRoom(eventId);
      setEntry('none');
      setLeft(true);
    } catch {} finally {
      setBusy(false);
    }
  }

  if (entry === 'none' && left) return null;
  if (entry === 'none' && user) return null;
  // The card only exists once the organiser opens the room (or the fan
  // already holds a place in it).
  if (!open) return null;

  const e = entry && entry !== 'none' ? entry : null;
  const statusLine = !e
    ? 'The waiting room is open for this event — grab your spot before tickets drop.'
    : e.status === 'admitted'
      ? "It's your turn — check out within your hold window."
      : e.status === 'queued' || e.status === 'waiting'
        ? `You're in line${e.position ? ` · position ${e.position}` : ''}. Order is set when the doors open.`
        : e.status === 'not_selected'
          ? 'The draw is done and this round didn’t pick you — rejoin for the next window.'
          : null;
  if (e && !statusLine) return null;

  return (
    <div className="mt-4 rounded-xl border border-gold/40 bg-night-deep p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Waiting room</div>
      <p className="mt-1.5 text-sm leading-relaxed text-sand/90">{statusLine}</p>
      <div className="mt-3 flex gap-2">
        {!e ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => (user ? void join() : requireAuth('buy', () => void join()))}
            className="rounded-full bg-gold px-5 py-2 text-sm font-bold text-night disabled:opacity-40"
          >
            {user ? 'Join the room' : 'Sign in to join'}
          </button>
        ) : e.status === 'waiting' || e.status === 'queued' ? (
          <button
            type="button"
            disabled={busy}
            onClick={leave}
            className="rounded-full border border-night-border px-4 py-1.5 text-xs font-semibold text-night-muted"
          >
            Leave
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Stepper({ qty, min, max, onChange }: { qty: number; min: number; max: number; onChange: (q: number) => void }) {
  const btn =
    'flex h-[30px] w-[30px] items-center justify-center rounded-full border border-night-border bg-night-elevated text-sand transition hover:border-gold hover:text-gold disabled:opacity-30';
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Decrease" className={btn} disabled={qty <= min} onClick={() => onChange(qty - 1)}>
        <MinusIcon size={14} />
      </button>
      <span className="tnum w-7 text-center font-semibold text-sand">{qty}</span>
      <button type="button" aria-label="Increase" className={btn} disabled={qty >= max} onClick={() => onChange(qty + 1)}>
        <PlusIcon size={14} />
      </button>
    </div>
  );
}

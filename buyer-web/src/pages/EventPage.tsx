import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type Listing, type SahraEvent, type Tier } from '../lib/api';
import { formatCents, formatEventDateTime, parseIso } from '../lib/format';
import { Badge, Button, Card, EmptyState, Spinner } from '../components/ui';
import {
  ArrowLeftIcon,
  BookmarkIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  MapIcon,
  MinusIcon,
  PinIcon,
  PlusIcon,
  ShareIcon,
  TicketIcon,
} from '../components/icons';

export type CheckoutSelection =
  | {
      kind: 'tier';
      eventId: string;
      tierId: string;
      tierName: string;
      priceCents: number;
      quantity: number;
      eventTitle: string;
      eventStartsAt: string;
      eventLocation: string;
    }
  | {
      kind: 'section';
      eventId: string;
      sectionId: string;
      sectionName: string;
      priceCents: number;
      quantity: number;
      eventTitle: string;
      eventStartsAt: string;
      eventLocation: string;
    }
  | {
      kind: 'resale';
      eventId: string;
      listingCode: string;
      tierName: string;
      priceCents: number;
      quantity: 1;
      eventTitle: string;
      eventStartsAt: string;
      eventLocation: string;
    };

function remainingOf(tier: Tier): number {
  return Math.max(0, tier.remaining ?? tier.quantity - tier.sold);
}

function addToCalendarUrl(event: SahraEvent) {
  const start = parseIso(event.startsAt);
  if (!start) return '#';
  const end = parseIso(event.endsAt) ?? new Date(start.getTime() + 3 * 3_600_000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    location: `${event.location}${event.address ? `, ${event.address}` : ''}`,
    details: event.description?.slice(0, 500) ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<SahraEvent | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selection, setSelection] = useState<CheckoutSelection | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    Promise.all([api.event(id), api.listings(id).catch(() => ({ listings: [] as Listing[] }))])
      .then(([eventRes, listingsRes]) => {
        if (!active) return;
        setEvent(eventRes.event);
        setListings(listingsRes.listings.filter((l) => l.status === 'ACTIVE'));
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Event not found');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const listingsByTier = useMemo(() => {
    const map = new Map<string, Listing[]>();
    for (const listing of listings) {
      const key = listing.tierName.toLowerCase();
      const arr = map.get(key) ?? [];
      arr.push(listing);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.priceCents - b.priceCents);
    }
    return map;
  }, [listings]);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: event?.title ?? 'Sahra event', url });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard unavailable
    }
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
        <EmptyState title="Event not found">{error ?? 'This event may have been removed.'}</EmptyState>
        <div className="mt-6">
          <Link to="/explore">
            <Button variant="outline">Back to Explore</Button>
          </Link>
        </div>
      </div>
    );
  }

  const tiers = event.tiers ?? [];
  const sections = event.venueSections ?? [];
  const hasVenue = sections.length > 0;

  const summaryCount = selection ? (selection.kind === 'resale' ? 1 : selection.quantity) : 0;
  const summaryTotal = selection
    ? selection.kind === 'resale'
      ? selection.priceCents
      : selection.priceCents * selection.quantity
    : 0;

  return (
    <div className="pb-28">
      {/* Breadcrumb */}
      <div className="border-b border-night-border/50 bg-night-deep/60">
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-6 py-3 text-sm text-night-muted lg:px-12">
          <Link to="/explore" className="flex items-center gap-1.5 transition hover:text-sand">
            <ArrowLeftIcon size={15} /> Explore
          </Link>
          <span>/</span>
          <span>{event.category}</span>
          <span>/</span>
          <span className="truncate text-sand/80">{event.title}</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1440px] gap-10 px-6 pt-8 lg:grid-cols-[1fr_420px] lg:px-12">
        {/* Left column */}
        <div className="flex flex-col gap-8">
          <div className="relative h-72 overflow-hidden rounded-3xl border border-night-border/60 bg-gradient-to-br from-indigo-600/50 via-purple-800/40 to-night lg:h-[420px]">
            {event.imageUrl ? (
              <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-8xl font-extrabold text-sand/10">
                {event.title.charAt(0)}
              </div>
            )}
            <div className="absolute left-4 top-4 flex gap-2">
              <Badge tone="muted">{event.category}</Badge>
              {hasVenue ? <Badge tone="gold">Seated venue</Badge> : null}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">
                  {event.category}
                </div>
                <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-sand">
                  {event.title}
                </h1>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="px-4 py-2 text-xs" onClick={() => setSaved((s) => !s)}>
                  <BookmarkIcon size={15} filled={saved} /> {saved ? 'Saved' : 'Save'}
                </Button>
                <Button variant="ghost" className="px-4 py-2 text-xs" onClick={share}>
                  <ShareIcon size={15} /> Share
                </Button>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-sand/85">
                <span className="flex items-center gap-2">
                  <CalendarIcon size={17} className="text-gold" />
                  {formatEventDateTime(event.startsAt)}
                </span>
                <a
                  href={addToCalendarUrl(event)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-gold underline-offset-4 hover:underline"
                >
                  <ClockIcon size={15} /> Add to calendar
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-sand/85">
                <span className="flex items-center gap-2">
                  <PinIcon size={17} className="text-gold" />
                  <span>
                    <span className="font-semibold">{event.location}</span>
                    {event.address ? <span className="text-night-muted"> · {event.address}</span> : null}
                  </span>
                </span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${event.location} ${event.address ?? ''}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-gold underline-offset-4 hover:underline"
                >
                  <MapIcon size={15} /> Get directions
                </a>
              </div>
            </div>

            {event.description ? (
              <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-sand/75">
                {event.description}
              </p>
            ) : null}
          </div>
        </div>

        {/* Right: ticket panel */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold text-sand">Tickets</h2>
              <span className="text-xs font-semibold text-night-muted">Cheapest first</span>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {tiers.length === 0 && sections.length === 0 ? (
                <p className="text-sm text-night-muted">No tickets are on sale for this event yet.</p>
              ) : null}

              {tiers.map((tier) => {
                const left = remainingOf(tier);
                const soldOut = left <= 0;
                const resale = listingsByTier.get(tier.name.toLowerCase()) ?? [];
                const selectedTier =
                  selection?.kind === 'tier' && selection.tierId === tier.id ? selection : null;
                return (
                  <div key={tier.id} className="rounded-2xl border border-night-border/50 bg-night p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-base font-bold text-sand">{tier.name}</div>
                        {tier.description ? (
                          <div className="mt-0.5 text-xs text-night-muted">{tier.description}</div>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg font-extrabold text-gold">
                          {formatCents(tier.priceCents)}
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-night-muted">
                          {soldOut ? 'Sold out' : left <= 10 ? `Only ${left} left` : 'Official'}
                        </div>
                      </div>
                    </div>

                    {!soldOut ? (
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-night-muted">
                          {left} available · instant delivery
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => {
                              const qty = Math.max(1, (selectedTier?.quantity ?? 1) - 1);
                              setSelection({
                                kind: 'tier',
                                eventId: event.id,
                                tierId: tier.id,
                                tierName: tier.name,
                                priceCents: tier.priceCents,
                                quantity: qty,
                                eventTitle: event.title,
                                eventStartsAt: event.startsAt,
                                eventLocation: event.location,
                              });
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-night-border text-sand transition hover:border-gold"
                          >
                            <MinusIcon size={14} />
                          </button>
                          <span className="w-6 text-center font-display text-sm font-bold text-sand">
                            {selectedTier?.quantity ?? 1}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => {
                              const qty = Math.min(left, (selectedTier?.quantity ?? 1) + 1);
                              setSelection({
                                kind: 'tier',
                                eventId: event.id,
                                tierId: tier.id,
                                tierName: tier.name,
                                priceCents: tier.priceCents,
                                quantity: qty,
                                eventTitle: event.title,
                                eventStartsAt: event.startsAt,
                                eventLocation: event.location,
                              });
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-night-border text-sand transition hover:border-gold"
                          >
                            <PlusIcon size={14} />
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {!soldOut ? (
                      <Button
                        variant={selectedTier ? 'gold' : 'outline'}
                        className="mt-3 w-full py-2 text-xs"
                        onClick={() =>
                          setSelection({
                            kind: 'tier',
                            eventId: event.id,
                            tierId: tier.id,
                            tierName: tier.name,
                            priceCents: tier.priceCents,
                            quantity: selectedTier?.quantity ?? 1,
                            eventTitle: event.title,
                            eventStartsAt: event.startsAt,
                            eventLocation: event.location,
                          })
                        }
                      >
                        {selectedTier ? <CheckIcon size={14} /> : null}
                        {selectedTier ? 'Selected' : 'Select'}
                      </Button>
                    ) : null}

                    {/* Resale listings for this tier, cheapest first */}
                    {resale.map((listing) => {
                      const isSelected =
                        selection?.kind === 'resale' && selection.listingCode === listing.ticketCode;
                      return (
                        <div
                          key={listing.ticketCode}
                          className="mt-3 rounded-xl border border-gold/30 bg-night-surface/60 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge tone="gold">Resale</Badge>
                              <span className="text-xs text-night-muted">1 ticket · instant</span>
                            </div>
                            <div className="font-display font-extrabold text-gold">
                              {formatCents(listing.priceCents)}
                            </div>
                          </div>
                          <Button
                            variant={isSelected ? 'gold' : 'ghost'}
                            className="mt-2 w-full py-1.5 text-xs"
                            onClick={() =>
                              setSelection({
                                kind: 'resale',
                                eventId: event.id,
                                listingCode: listing.ticketCode,
                                tierName: listing.tierName,
                                priceCents: listing.priceCents,
                                quantity: 1,
                                eventTitle: event.title,
                                eventStartsAt: event.startsAt,
                                eventLocation: event.location,
                              })
                            }
                          >
                            {isSelected ? <CheckIcon size={13} /> : null}
                            {isSelected ? 'Selected' : 'Buy resale'}
                          </Button>
                        </div>
                      );
                    })}

                    {soldOut && resale.length === 0 ? (
                      <div className="mt-3">
                        <Link to={`/offers/new?eventId=${event.id}&tierName=${encodeURIComponent(tier.name)}`}>
                          <Button variant="outline" className="w-full py-2 text-xs">
                            <TicketIcon size={13} /> Set your price
                          </Button>
                        </Link>
                        <div className="mt-1.5 text-center text-[11px] text-night-muted">
                          Sold out, no resale yet
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {sections.map((section) => {
                const left = Math.max(0, section.remaining ?? section.capacity);
                const soldOut = left <= 0;
                return (
                  <div key={section.id} className="rounded-2xl border border-night-border/50 bg-night p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-base font-bold text-sand">{section.name}</div>
                        <div className="mt-0.5 text-xs text-night-muted">
                          {section.rows && section.seatsPerRow
                            ? `${section.rows} rows · ${section.seatsPerRow} seats`
                            : 'Allocated seats'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg font-extrabold text-gold">
                          {formatCents(section.priceCents)}
                        </div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-night-muted">
                          {soldOut ? 'Sold out' : 'Official'}
                        </div>
                      </div>
                    </div>
                    {!soldOut ? (
                      <>
                        <div className="mt-2 text-xs text-night-muted">
                          {left} seats left · pick seats next
                        </div>
                        <Link to={`/events/${event.id}/seats`}>
                          <Button variant="outline" className="mt-3 w-full py-2 text-xs">
                            Choose seats
                          </Button>
                        </Link>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 border-t border-night-border/50 pt-4">
              {selection ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-night-muted">
                      {summaryCount} ticket{summaryCount === 1 ? '' : 's'}
                      {selection.kind === 'resale' ? ' · resale' : ''}
                    </span>
                    <span className="font-display font-extrabold text-sand">{formatCents(summaryTotal)}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-night-muted">
                    Fees are calculated at checkout.
                  </div>
                  <Button
                    variant="primary"
                    className="mt-3 w-full py-3 text-base"
                    onClick={() => navigate('/checkout', { state: { selection } })}
                  >
                    Continue to checkout
                  </Button>
                </>
              ) : (
                <div className="rounded-xl bg-night-elevated/60 px-4 py-3 text-center text-sm text-night-muted">
                  Select a ticket above to continue
                </div>
              )}
              <p className="mt-3 text-center text-[11px] leading-relaxed text-night-muted">
                Resale tickets are reissued to you with a new QR. Same entry, same guarantee.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

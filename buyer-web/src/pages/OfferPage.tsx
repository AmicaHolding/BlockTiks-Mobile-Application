import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, type Listing, type SahraEvent } from '../lib/api';
import { MAX_PER_ORDER, RESALE_CAP_PCT } from '../lib/config';
import { allIn, formatEventDateTime, formatMoney } from '../lib/format';
import type { CheckoutSelection } from './EventPage';
import { Button, Card, Input, Spinner } from '../components/ui';
import { ArrowLeftIcon, CheckIcon, MinusIcon, PlusIcon, TicketIcon } from '../components/icons';

export default function OfferPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const eventId = params.get('eventId') ?? '';
  const tierName = params.get('tierName') ?? '';
  const sectionName = params.get('sectionName') ?? undefined;
  const initialQty = Math.min(MAX_PER_ORDER, Math.max(1, Number(params.get('quantity')) || 1));
  const initialMax = Number(params.get('maxPrice')) || 0;

  const [event, setEvent] = useState<SahraEvent | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [quantity, setQuantity] = useState(initialQty);
  const [maxPrice, setMaxPrice] = useState(initialMax ? String(initialMax) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    api
      .event(eventId)
      .then((res) => {
        if (active) setEvent(res.event);
      })
      .catch(() => {
        if (active) setEvent(null);
      });
    api
      .listings(eventId)
      .then((res) => {
        if (active) setListings(res.listings);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [eventId]);

  const faceCents = (() => {
    if (!event) return null;
    if (sectionName) {
      const section = (event.venueSections ?? []).find((s) => s.name === sectionName);
      return section?.priceCents ?? null;
    }
    const tier = (event.tiers ?? []).find((t) => t.name === tierName);
    return tier?.priceCents ?? null;
  })();

  const maxCents = Math.round((Number(maxPrice) || 0) * 100);
  // Buyers think in the all-in price they pay; listings/matching run on face.
  const faceMaxCents = Math.round(maxCents / 1.07);
  const currency = event?.currency;
  // W3/R2, a watch above the resale cap can never match; block it.
  const capCents = faceCents != null ? Math.round(faceCents * (1 + RESALE_CAP_PCT / 100)) : null;
  const aboveCap = capCents != null && faceMaxCents > capCents;
  const valid = Boolean(eventId && tierName && maxCents >= 1 && !aboveCap);

  // W1, if a live listing already matches, go straight to checkout instead.
  const matchingListing =
    maxCents >= 1
      ? listings
          .filter(
            (l) =>
              l.status === 'ACTIVE' &&
              l.priceCents <= faceMaxCents &&
              (l.tierName === tierName || (sectionName && l.tierName === sectionName))
          )
          .sort((a, b) => a.priceCents - b.priceCents)[0] ?? null
      : null;

  function buyNow(listing: Listing) {
    if (!event) return;
    const selection: CheckoutSelection = {
      kind: 'resale',
      eventId: event.id,
      listingCode: listing.ticketCode,
      tierName: listing.tierName,
      priceCents: listing.priceCents,
      quantity: 1,
      currency: event.currency,
      eventTitle: event.title,
      eventStartsAt: event.startsAt,
      eventLocation: event.location,
    };
    navigate('/checkout', { state: { selection } });
  }

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await api.createOffer({
        eventId,
        tierName,
        sectionName,
        maxPriceCents: faceMaxCents,
        quantity,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not set your price');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15">
          <CheckIcon size={30} className="text-emerald-300" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-sand">Price set</h1>
        <p className="mt-2 text-night-muted">
          We’ll flag any resale listing at or below {maxPrice ? formatMoney(maxCents, currency) : ''} under “Waiting” in
          My tickets, you confirm the buy yourself, so you’re never charged automatically.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/tickets">
            <Button variant="primary">View waiting offers</Button>
          </Link>
          <Link to={`/events/${eventId}`}>
            <Button variant="outline">Back to event</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-8">
      <Link
        to={`/events/${eventId}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-night-muted transition hover:text-sand"
      >
        <ArrowLeftIcon size={15} /> Back to event
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/20 text-gold">
          <TicketIcon size={22} />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Set your price</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-sand">
            {tierName}
            {sectionName ? ` · ${sectionName}` : ''}
          </h1>
          {event ? (
            <p className="mt-1 text-sm text-night-muted">
              {event.title} · {formatEventDateTime(event.startsAt)}
            </p>
          ) : null}
        </div>
      </div>

      <Card className="mt-8 p-6">
        <p className="text-[15px] leading-relaxed text-sand/80">
          Sold out right now. Tell us what you’d pay, and when someone lists at or below it, it shows up in your Tickets
          under “Waiting” so you can grab it instantly.
        </p>

        <div className="mt-6">
          <div className="mb-1.5 text-sm font-semibold text-night-muted">Tickets</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Decrease"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-night-border text-sand transition hover:border-gold"
            >
              <MinusIcon size={15} />
            </button>
            <span className="w-10 text-center font-display text-xl font-extrabold text-sand">{quantity}</span>
            <button
              type="button"
              aria-label="Increase"
              onClick={() => setQuantity((q) => Math.min(MAX_PER_ORDER, q + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-night-border text-sand transition hover:border-gold"
            >
              <PlusIcon size={15} />
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-1.5 text-sm font-semibold text-night-muted">Max price, each</div>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-extrabold uppercase text-sand">
              {(currency ?? 'usd').toUpperCase()}
            </span>
            <Input
              tone="dark"
              type="number"
              min={1}
              step="0.01"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="0"
              className="max-w-[200px] tnum"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-night-muted">
            {faceCents != null ? (
              <span>
                Face value {formatMoney(allIn(faceCents), currency)}
                {capCents != null ? ` · capped at ${formatMoney(allIn(capCents), currency)} (face +${RESALE_CAP_PCT}%)` : ''}
              </span>
            ) : null}
            <span>Offers stay active until the event starts</span>
          </div>
          {aboveCap ? (
            <p className="mt-2 text-xs font-semibold text-red-300">
              Above the resale cap, listings can’t exceed face +{RESALE_CAP_PCT}%, so no watch over{' '}
              {formatMoney(allIn(capCents), currency)} can match.
            </p>
          ) : null}
        </div>

        {matchingListing ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-gold bg-gold/10 px-4 py-3">
            <div className="text-sm text-sand">
              <span className="font-bold">One matches right now</span>, a fan is selling at{' '}
              {formatMoney(allIn(matchingListing.priceCents), currency)}.
            </div>
            <Button variant="primary" className="px-4 py-2 text-xs" onClick={() => buyNow(matchingListing)}>
              Buy it now
            </Button>
          </div>
        ) : null}

        <div className="mt-6 rounded-xl bg-night-elevated/60 px-4 py-3 text-sm text-sand/80">
          Set price · up to {maxPrice ? formatMoney(maxCents * quantity, currency) : '-'} total
        </div>

        {error ? <div className="mt-4 text-sm font-semibold text-red-300">{error}</div> : null}

        <Button variant="primary" className="mt-5 w-full py-3 text-base" disabled={!valid || busy} onClick={submit}>
          {busy ? <Spinner className="border-night border-t-transparent" /> : null}
          Set price
        </Button>
        {!valid ? (
          <p className="mt-2 text-center text-xs text-night-muted">Enter a max price to continue</p>
        ) : null}
      </Card>
    </div>
  );
}

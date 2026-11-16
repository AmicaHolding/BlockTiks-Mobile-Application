import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError, type SahraEvent } from '../lib/api';
import { formatCents, formatEventDateTime } from '../lib/format';
import { Button, Card, Input, Spinner } from '../components/ui';
import { ArrowLeftIcon, CheckIcon, MinusIcon, PlusIcon, TicketIcon } from '../components/icons';

export default function OfferPage() {
  const [params] = useSearchParams();
  const eventId = params.get('eventId') ?? '';
  const tierName = params.get('tierName') ?? '';
  const sectionName = params.get('sectionName') ?? undefined;
  const initialQty = Math.min(8, Math.max(1, Number(params.get('quantity')) || 1));
  const initialMax = Number(params.get('maxPrice')) || 0;

  const [event, setEvent] = useState<SahraEvent | null>(null);
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
  const valid = eventId && tierName && maxCents >= 1;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await api.createOffer({
        eventId,
        tierName,
        sectionName,
        maxPriceCents: maxCents,
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
          We’ll flag any resale listing at or below {maxPrice ? formatCents(maxCents) : ''} in your Tickets — you confirm
          the buy yourself, so you’re never charged automatically.
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
              onClick={() => setQuantity((q) => Math.min(8, q + 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-night-border text-sand transition hover:border-gold"
            >
              <PlusIcon size={15} />
            </button>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-1.5 text-sm font-semibold text-night-muted">Max price, each</div>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-extrabold text-sand">$</span>
            <Input
              tone="dark"
              type="number"
              min={1}
              step="0.01"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="900"
              className="max-w-[200px]"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-night-muted">
            {faceCents != null ? <span>Face value {formatCents(faceCents)}</span> : null}
            <span>Offers stay active until the event starts</span>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-night-elevated/60 px-4 py-3 text-sm text-sand/80">
          Set price · up to {maxPrice ? formatCents(maxCents * quantity) : '—'} total
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

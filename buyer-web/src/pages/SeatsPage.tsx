import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type SahraEvent, type VenueSection } from '../lib/api';
import { formatCents, formatShortDateTime } from '../lib/format';
import type { CheckoutSelection } from './EventPage';
import { Badge, Button, Card, EmptyState, Spinner } from '../components/ui';
import { ArrowLeftIcon, CheckIcon, ClockIcon, MapIcon, MinusIcon, PlusIcon, TicketIcon } from '../components/icons';

function remaining(section: VenueSection): number {
  return Math.max(0, section.remaining ?? section.capacity);
}

export default function SeatsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<SahraEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    api
      .event(id)
      .then((res) => {
        if (active) setEvent(res.event);
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

  const sections = useMemo(() => event?.venueSections ?? [], [event]);
  const selected = sections.find((s) => s.id === sectionId) ?? null;

  const bestAvailable = useMemo(() => {
    const available = sections.filter((s) => remaining(s) > 0);
    if (available.length === 0) return null;
    return [...available].sort((a, b) => a.priceCents - b.priceCents)[0];
  }, [sections]);

  useEffect(() => {
    if (!sectionId && bestAvailable) {
      setSectionId(bestAvailable.id);
      setQuantity((q) => Math.min(q, remaining(bestAvailable)));
    }
  }, [bestAvailable, sectionId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState title="Event not found">{error}</EmptyState>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState title="No seated sections">
          This event doesn’t have a venue map yet.{' '}
          <Link to={`/events/${event.id}`} className="text-gold underline">
            Back to event
          </Link>
        </EmptyState>
      </div>
    );
  }

  const maxQty = selected ? Math.min(8, remaining(selected)) : 1;

  function pickBest() {
    if (!bestAvailable) return;
    setSectionId(bestAvailable.id);
    setQuantity((q) => Math.min(q, remaining(bestAvailable), 8));
  }

  function continueToCheckout() {
    if (!selected) return;
    const selection: CheckoutSelection = {
      kind: 'section',
      eventId: event!.id,
      sectionId: selected.id,
      sectionName: selected.name,
      priceCents: selected.priceCents,
      quantity,
      eventTitle: event!.title,
      eventStartsAt: event!.startsAt,
      eventLocation: event!.location,
    };
    navigate('/checkout', { state: { selection } });
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-20 pt-8 lg:px-12">
      <Link
        to={`/events/${event.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-night-muted transition hover:text-sand"
      >
        <ArrowLeftIcon size={15} /> {event.title}
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Choose seats</div>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-sand">{event.title}</h1>
          <div className="mt-1 flex items-center gap-4 text-sm text-night-muted">
            <span className="flex items-center gap-1.5">
              <ClockIcon size={14} /> {formatShortDateTime(event.startsAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapIcon size={14} /> {event.location}
            </span>
          </div>
        </div>
        {bestAvailable ? (
          <Button variant="ghost" className="px-4 py-2 text-xs" onClick={pickBest}>
            <TicketIcon size={14} /> Best available
          </Button>
        ) : null}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Section map */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold text-sand">Venue sections</h2>
            <span className="text-xs text-night-muted">Exact seat numbers are assigned at the gate</span>
          </div>

          {/* Stage indicator */}
          <div className="mx-auto mt-6 w-fit rounded-full bg-night-elevated px-6 py-2 text-xs font-bold uppercase tracking-[0.2em] text-night-muted">
            Stage ↑
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sections.map((section) => {
              const left = remaining(section);
              const soldOut = left <= 0;
              const active = section.id === sectionId;
              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={soldOut}
                  onClick={() => {
                    setSectionId(section.id);
                    setQuantity((q) => Math.min(q, left, 8));
                  }}
                  className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-4 transition ${
                    active
                      ? 'border-gold bg-gold/15 text-sand'
                      : soldOut
                        ? 'cursor-not-allowed border-night-border/40 bg-night/50 text-night-muted opacity-50'
                        : 'border-night-border/60 bg-night text-sand hover:border-night-muted'
                  }`}
                >
                  {active ? (
                    <CheckIcon size={14} className="absolute right-2 top-2 text-gold" />
                  ) : null}
                  <span className="text-sm font-bold">{section.name}</span>
                  <span className="font-display text-base font-extrabold text-gold">
                    {formatCents(section.priceCents)}
                  </span>
                  <span className="text-[11px] text-night-muted">
                    {soldOut ? 'Sold out' : `${left} left`}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Summary */}
        <Card className="h-fit p-6 lg:sticky lg:top-24">
          {selected ? (
            <>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-night-muted">
                {selected.name} · {formatCents(selected.priceCents)} each
              </div>
              <div className="mt-2 text-sm text-night-muted">
                {remaining(selected)} seats left
                {bestAvailable?.id === selected.id ? ' · best value' : ''}
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-sand">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Decrease"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-night-border text-sand transition hover:border-gold"
                  >
                    <MinusIcon size={15} />
                  </button>
                  <span className="w-8 text-center font-display text-lg font-extrabold text-sand">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase"
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-night-border text-sand transition hover:border-gold"
                  >
                    <PlusIcon size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-5 border-t border-night-border/50 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-night-muted">Total</span>
                  <span className="font-display text-2xl font-extrabold text-sand">
                    {formatCents(selected.priceCents * quantity)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-night-muted">Fees calculated at checkout</div>
                <Button variant="primary" className="mt-4 w-full py-3 text-base" onClick={continueToCheckout}>
                  Continue to checkout
                </Button>
                <p className="mt-3 text-center text-[11px] leading-relaxed text-night-muted">
                  Seats are held for 15 minutes once you start checkout.
                </p>
              </div>
            </>
          ) : (
            <div className="py-6 text-center text-sm text-night-muted">
              Pick a section to see pricing and continue.
            </div>
          )}
        </Card>
      </div>

      {sections.some((s) => (s.rows ?? 0) > 0) ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {sections
            .filter((s) => (s.rows ?? 0) > 0)
            .map((s) => (
              <Badge key={s.id} tone="muted">
                {s.name}: {s.rows} rows × {s.seatsPerRow} seats
              </Badge>
            ))}
        </div>
      ) : null}
    </div>
  );
}

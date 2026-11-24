import { Link } from 'react-router-dom';
import type { SahraEvent, Tier } from '../lib/api';
import { allIn, formatEventDate, formatMoney } from '../lib/format';
import { Badge } from './ui';

export const EVENT_MEDIA_GRADIENT = 'from-night-elevated via-night-surface to-night-deep';

export function lowestPrice(tiers?: Tier[]): number | null {
  if (!tiers || tiers.length === 0) return null;
  const prices = tiers.map((t) => t.priceCents).filter((p) => p > 0);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export function remainingIn(tier: Tier): number {
  return Math.max(0, tier.remaining ?? tier.available ?? tier.quantity - tier.sold);
}

export function eventSoldOut(event: SahraEvent): boolean {
  const tiers = event.tiers ?? [];
  return tiers.length > 0 && tiers.every((t) => remainingIn(t) <= 0);
}

export function isSellingFast(event: SahraEvent): boolean {
  // Prototype rule: any tier with ≤ 10 left reads "Selling fast".
  return (event.tiers ?? []).some((t) => {
    const left = remainingIn(t);
    return left > 0 && left <= 10;
  });
}

export default function EventCard({ event, compact = false }: { event: SahraEvent; compact?: boolean }) {
  const price = lowestPrice(event.tiers);
  const free = price === 0;
  const soldOut = eventSoldOut(event);
  const sellingFast = !soldOut && isSellingFast(event);

  // Card chip per web prototype: Sold out (muted) · Selling fast (gold) · category (gold)
  const chip = soldOut ? 'Sold out' : sellingFast ? 'Selling fast' : event.category;

  return (
    <Link
      to={`/events/${event.id}`}
      className={`sahra-card group block overflow-hidden rounded-card border border-night-border/60 bg-night-surface ${
        compact ? 'w-[320px] shrink-0' : 'w-full'
      }`}
    >
      <div className={`relative ${compact ? 'h-44' : 'h-56'} bg-gradient-to-br ${EVENT_MEDIA_GRADIENT}`}>
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-display text-6xl font-extrabold text-sand/15">
              {event.title.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute end-3 top-3 flex flex-col items-end gap-1.5">
          <Badge tone={soldOut ? 'muted' : 'gold'}>{chip}</Badge>
          {free ? <Badge tone="green">Free</Badge> : null}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 p-5 pb-6">
        <div className="font-display text-lg font-bold leading-snug text-sand group-hover:text-gold">
          {event.title}
        </div>
        <div className="text-sm text-night-muted">
          {formatEventDate(event.startsAt)} · {event.location}
        </div>
        <div className="tnum pt-1 text-[15px] font-semibold text-gold">
          {soldOut ? 'Sold out' : free ? 'Free' : price != null ? `From ${formatMoney(allIn(price), event.currency)}` : ''}
        </div>
      </div>
    </Link>
  );
}

export function EventCardRow({ title, events, to }: { title: string; events: SahraEvent[]; to?: string }) {
  if (events.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-extrabold text-sand">{title}</h2>
        {to ? (
          <Link
            to={to}
            className="rounded-full border border-night-border px-4 py-1.5 text-xs font-semibold text-sand transition hover:bg-night-surface"
          >
            See all
          </Link>
        ) : null}
      </div>
      <div className="-mx-1 flex gap-5 overflow-x-auto px-1 pb-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} compact />
        ))}
      </div>
    </section>
  );
}

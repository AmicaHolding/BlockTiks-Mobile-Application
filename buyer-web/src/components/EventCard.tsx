import { Link } from 'react-router-dom';
import type { SahraEvent, Tier } from '../lib/api';
import { formatCents, formatEventDate } from '../lib/format';
import { Badge } from './ui';
import { FireIcon, MapIcon } from './icons';

export const EVENT_MEDIA_GRADIENT = 'from-night-elevated via-night-surface to-night-deep';

export function lowestPrice(tiers?: Tier[]): number | null {
  if (!tiers || tiers.length === 0) return null;
  const prices = tiers.map((t) => t.priceCents).filter((p) => p > 0);
  if (prices.length === 0) return null;
  return Math.min(...prices);
}

export function isSellingFast(event: SahraEvent): boolean {
  const tiers = event.tiers ?? [];
  const total = tiers.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const remaining = tiers.reduce((sum, t) => sum + Math.max(0, t.remaining ?? (t.quantity - t.sold)), 0);
  return total > 0 && remaining > 0 && remaining / total < 0.25;
}

export default function EventCard({ event, compact = false }: { event: SahraEvent; compact?: boolean }) {
  const price = lowestPrice(event.tiers);
  const free = price === 0;
  const sellingFast = isSellingFast(event);
  const gradient = EVENT_MEDIA_GRADIENT;

  return (
    <Link
      to={`/events/${event.id}`}
      className={`group block overflow-hidden rounded-2xl border border-night-border/60 bg-night-surface transition hover:border-gold/50 ${
        compact ? 'w-[300px] shrink-0' : 'w-full'
      }`}
    >
      <div className={`relative ${compact ? 'h-36' : 'h-44'} bg-gradient-to-br ${gradient}`}>
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-display text-5xl font-extrabold text-sand/15">
              {event.title.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {sellingFast ? (
            <Badge tone="gold">
              <FireIcon size={12} /> Selling fast
            </Badge>
          ) : null}
          {free ? <Badge tone="green">Free</Badge> : null}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-night-muted">
          {event.category}
        </div>
        <div className="font-display text-lg font-bold leading-snug text-sand group-hover:text-gold">
          {event.title}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-night-muted">
          <span>{formatEventDate(event.startsAt)}</span>
          <span>·</span>
          <span className="flex items-center gap-1 truncate">
            <MapIcon size={14} /> {event.location}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-sand">
            {free ? 'Free' : price != null ? `From ${formatCents(price)}` : ''}
          </span>
          <span className="text-sm font-semibold text-gold">Get tickets</span>
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

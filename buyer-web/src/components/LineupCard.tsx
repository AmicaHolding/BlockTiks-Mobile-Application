import { Link } from 'react-router-dom';
import type { EventCardData } from '../lib/api';
import { cardImage, cardPrice, cardSoldOut, cardStart, cardTz, cardVenue } from '../lib/cards';
import { inTz, venueTime } from '../lib/format';
import { EVENT_MEDIA_GRADIENT } from './EventCard';

/** v2 lineup row (web prototype v2: date block · title · venue · price). */
export default function LineupCard({ event }: { event: EventCardData }) {
  const start = cardStart(event);
  const tz = cardTz(event);
  const soldOut = cardSoldOut(event);
  const img = cardImage(event);
  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex items-center gap-4 rounded-card border border-night-border/60 bg-night-surface p-3 transition hover:border-gold/50 sm:p-4"
    >
      <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-night-deep py-2 text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gold">{inTz(start, tz, { month: 'short' })}</span>
        <span className="font-display text-2xl font-extrabold leading-none text-sand">{inTz(start, tz, { day: 'numeric' })}</span>
        <span className="mt-0.5 text-[10px] font-semibold text-night-muted">{inTz(start, tz, { weekday: 'short' })}</span>
      </div>
      <div className={`hidden h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br sm:block ${EVENT_MEDIA_GRADIENT}`}>
        {img ? <img src={img} alt="" className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-base font-extrabold text-sand sm:text-lg">{event.title}</div>
        <div className="mt-0.5 truncate text-sm text-night-muted">
          {[cardVenue(event), event.category, venueTime(start, tz)].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className="shrink-0 text-end">
        {soldOut ? (
          <span className="rounded-full bg-rumman/20 px-2.5 py-1 text-[11px] font-bold text-red-200">Sold out · resale</span>
        ) : event.left != null && event.left > 0 && event.left <= 10 ? (
          <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-gold">{event.left} left</span>
        ) : null}
        <div className="mt-1 text-sm font-semibold text-sand">{cardPrice(event)}</div>
      </div>
    </Link>
  );
}

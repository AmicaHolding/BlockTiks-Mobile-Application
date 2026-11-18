import type { EventCardData } from './api';
import { formatMinor, formatMoney } from './format';

export function cardStart(e: EventCardData): string {
  return e.starts_at ?? e.startsAt ?? '';
}

export function cardTz(e: EventCardData): string | undefined {
  const venueTz = typeof e.venue === 'object' && e.venue ? e.venue.timezone : undefined;
  return e.tz ?? e.venue_timezone ?? e.venueTimezone ?? venueTz;
}

export function cardVenue(e: EventCardData): string {
  if (typeof e.venue === 'string') return e.venue;
  return e.venue?.name ?? e.location ?? '';
}

export function cardImage(e: EventCardData): string | undefined {
  return e.cover_url ?? e.imageUrl;
}

export function cardSoldOut(e: EventCardData): boolean {
  const s = (e.status ?? e.state ?? '').toLowerCase();
  return Boolean(e.sold_out) || s === 'sold_out';
}

export function cardPrice(e: EventCardData): string {
  if (e.from_price) return e.from_price.amount_minor > 0 ? `From ${formatMinor(e.from_price)}` : 'Free';
  if (e.fromPriceCents != null) return e.fromPriceCents > 0 ? `From ${formatMoney(e.fromPriceCents, e.currency)}` : 'Free';
  return '';
}

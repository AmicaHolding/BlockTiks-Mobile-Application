// Money: integer minor units, formatted with the currency's own fraction
// digits (AED/USD are 2). Dates: stored UTC, displayed in the venue timezone
// (Asia/Dubai default for Studio until venues carry a real timezone field).

export function currencyFractionDigits(currency: string): number {
  // KWD/BHD/OMR etc. are 3; zero-decimal currencies (JPY) are 0.
  const three = new Set(['kwd', 'bhd', 'omr', 'jod', 'tnd', 'lyd', 'iqd']);
  const zero = new Set(['jpy', 'krw', 'vnd', 'clp', 'xof', 'xaf']);
  const c = currency.toLowerCase();
  if (three.has(c)) return 3;
  if (zero.has(c)) return 0;
  return 2;
}

export function formatMoney(minorUnits: number, currency = 'AED'): string {
  const digits = currencyFractionDigits(currency);
  const major = minorUnits / Math.pow(10, digits);
  const code = currency.toUpperCase();
  return `${code} ${major.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** Back-compat alias: existing callers pass cents. */
export function formatCents(cents: number, currency = 'AED'): string {
  return formatMoney(cents, currency);
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export const VENUE_TZ = 'Asia/Dubai';

export function formatEventDate(iso?: string, tz: string = VENUE_TZ): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  }).format(d);
}

export function formatDay(iso?: string, tz: string = VENUE_TZ): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: tz,
  }).format(d);
}

export function formatDateTime(iso?: string, tz: string = VENUE_TZ): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  }).format(d);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** ISO → `YYYY-MM-DD` for <input type="date">, in the given timezone. */
export function isoToDateInput(iso?: string, tz: string = VENUE_TZ): string {
  if (!iso) return '';
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: tz,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isoToTimeInput(iso?: string, tz: string = VENUE_TZ): string {
  if (!iso) return '';
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('hour')}:${get('minute')}`;
}

/** Date+time input values → UTC ISO. Input is venue-local time. */
export function dateTimeToIso(date: string, time: string, tz: string = VENUE_TZ): string {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '12:00').split(':').map(Number);
  // Convert "this wall-clock time in tz" to a UTC instant.
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: tz,
  });
  const parts = fmt.formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asIf = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  const offset = asIf - guess;
  return new Date(guess - offset).toISOString();
}

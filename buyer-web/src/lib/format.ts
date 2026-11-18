export function formatMoney(cents: number | null | undefined, currency?: string | null): string {
  if (cents == null || Number.isNaN(cents)) return '';
  const code = (currency ?? 'usd').toUpperCase();
  try {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: Number.isInteger(cents / 100) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return formatCents(cents);
  }
}

export function formatCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return '';
  const dollars = cents / 100;
  if (Number.isInteger(dollars)) return `$${dollars}`;
  return `$${dollars.toFixed(2)}`;
}

export function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isThisWeekendDate(date: Date): boolean {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysSinceSaturday = (now.getDay() + 1) % 7;
  const saturday = new Date(startOfToday);
  saturday.setDate(saturday.getDate() - daysSinceSaturday);
  const monday = new Date(saturday);
  monday.setDate(monday.getDate() + 2);
  if (now.getTime() >= monday.getTime()) {
    saturday.setDate(saturday.getDate() + 7);
    monday.setDate(monday.getDate() + 7);
  }
  const time = date.getTime();
  return time >= saturday.getTime() && time < monday.getTime();
}

export function isThisWeekend(iso: string | null | undefined): boolean {
  const d = parseIso(iso);
  return d ? isThisWeekendDate(d) : false;
}

export function isAvailable(event: { startsAt?: string | null; endsAt?: string | null }): boolean {
  const end = parseIso(event.endsAt) ?? parseIso(event.startsAt);
  return end ? end.getTime() >= Date.now() : false;
}

export function formatEventDate(iso: string | null | undefined): string {
  const d = parseIso(iso);
  if (!d) return '';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatEventDateTime(iso: string | null | undefined): string {
  const d = parseIso(iso);
  if (!d) return '';
  return `${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export function formatShortDateTime(iso: string | null | undefined): string {
  const d = parseIso(iso);
  if (!d) return '';
  return `${formatEventDate(iso)}, ${d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}`;
}

export function formatRelative(iso: string | null | undefined): string {
  const d = parseIso(iso);
  if (!d) return '';
  const diffMs = d.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / 3_600_000);
  if (hours < 24) {
    if (hours < 1) return diffMs >= 0 ? 'in under an hour' : 'just now';
    return diffMs >= 0 ? `in ${hours}h` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return diffMs >= 0 ? `in ${days} days` : `${days} days ago`;
}

export function initials(firstName?: string, lastName?: string, email?: string): string {
  const a = (firstName ?? '').trim().charAt(0);
  const b = (lastName ?? '').trim().charAt(0);
  if (a || b) return (a + b).toUpperCase();
  return (email ?? '?').charAt(0).toUpperCase();
}

/** Venue-time display (AGENTS invariant): times are UTC + venue IANA tz. */
export function inTz(
  iso: string | null | undefined,
  tz: string | null | undefined,
  opts: Intl.DateTimeFormatOptions
): string {
  const d = parseIso(iso);
  if (!d) return '';
  try {
    return d.toLocaleString('en-GB', { ...opts, timeZone: tz || undefined });
  } catch {
    return d.toLocaleString('en-GB', opts);
  }
}

export function venueDate(iso: string | null | undefined, tz?: string | null): string {
  return inTz(iso, tz, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function venueTime(iso: string | null | undefined, tz?: string | null): string {
  return inTz(iso, tz, { hour: 'numeric', minute: '2-digit' });
}

export function venueDateTime(iso: string | null | undefined, tz?: string | null): string {
  if (!iso) return '';
  return `${venueDate(iso, tz)} · ${venueTime(iso, tz)}`;
}

/** YYYY-MM-DD of an instant in a given zone (for the Pick-a-night strip). */
export function venueDayKey(iso: string | null | undefined, tz?: string | null): string {
  const d = parseIso(iso);
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function formatMinor(m: { amount_minor: number; currency: string } | null | undefined): string {
  if (!m) return '';
  return formatMoney(m.amount_minor, m.currency);
}

export function displayName(u: { name?: string; firstName?: string; lastName?: string; email?: string | null; phone?: string | null } | null | undefined): string {
  if (!u) return '';
  return u.name?.trim() || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || u.phone || '';
}

export function nameInitials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0].charAt(0) + (parts[1]?.charAt(0) ?? '')).toUpperCase();
}

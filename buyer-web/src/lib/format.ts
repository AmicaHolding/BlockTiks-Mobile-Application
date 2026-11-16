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

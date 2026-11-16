export function formatCents(cents?: number | null): string {
  if (cents == null) return '—';
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function statusLabel(status?: string): string {
  const s = (status ?? '').toUpperCase();
  if (s === 'PUBLISHED') return 'On sale';
  if (s === 'DRAFT') return 'Draft';
  if (s === 'SOLD_OUT') return 'Sold out';
  return s ? s.charAt(0) + s.slice(1).toLowerCase() : 'Unknown';
}

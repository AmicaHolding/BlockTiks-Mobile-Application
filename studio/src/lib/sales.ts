import type { EventGuest, EventOrder, StudioEvent } from './api';

export function tierSold(event: StudioEvent): number {
  return (event.tiers ?? []).reduce((sum, tier) => sum + (tier.sold ?? 0), 0);
}

export function tierCapacity(event: StudioEvent): number {
  return (event.tiers ?? []).reduce((sum, tier) => sum + (tier.quantity ?? 0), 0);
}

export function tierGrossCents(event: StudioEvent): number {
  return (event.tiers ?? []).reduce(
    (sum, tier) => sum + (tier.priceCents ?? 0) * (tier.sold ?? 0),
    0,
  );
}

export function sectionSold(event: StudioEvent): number {
  return (event.venueSections ?? []).reduce(
    (sum, section) => sum + (section.sold ?? 0),
    0,
  );
}

export function sectionCapacity(event: StudioEvent): number {
  return (event.venueSections ?? []).reduce(
    (sum, section) => sum + (section.capacity ?? 0),
    0,
  );
}

export function sectionGrossCents(event: StudioEvent): number {
  return (event.venueSections ?? []).reduce(
    (sum, section) => sum + (section.priceCents ?? 0) * (section.sold ?? 0),
    0,
  );
}

export function eventSold(event: StudioEvent): number {
  return tierSold(event) + sectionSold(event);
}

export function eventCapacity(event: StudioEvent): number {
  return tierCapacity(event) + sectionCapacity(event);
}

export function eventGrossCents(event: StudioEvent): number {
  return tierGrossCents(event) + sectionGrossCents(event);
}

export function guestItemLabel(guest: EventGuest): string {
  return guest.sectionName || guest.tierName || 'Ticket';
}

export function guestAmountCents(event: StudioEvent | null, guest: EventGuest): number {
  const candidates = [guest.sectionName, guest.tierName].filter(
    (value): value is string => Boolean(value),
  );
  for (const candidate of candidates) {
    const section = (event?.venueSections ?? []).find((item) => item.name === candidate);
    if (section) return section.priceCents ?? 0;
    const tier = (event?.tiers ?? []).find((item) => item.name === candidate);
    if (tier) return tier.priceCents ?? 0;
  }
  return 0;
}

export function guestStatusLabel(status: string): string {
  const value = status.toUpperCase();
  if (value === 'VALID') return 'Paid';
  if (value === 'USED') return 'Checked in';
  if (value === 'TRANSFERRED') return 'Transferred';
  if (value === 'REFUNDED') return 'Refunded';
  return value ? value.charAt(0) + value.slice(1).toLowerCase() : 'Unknown';
}

export function orderKindLabel(kind?: string): string {
  const value = (kind ?? 'TICKET').toUpperCase();
  if (value === 'SEATED') return 'Seated';
  if (value === 'RESALE') return 'Resale';
  return 'Ticket';
}

export function orderStatusLabel(status: string): string {
  const value = status.toUpperCase();
  if (value === 'PAID') return 'Paid';
  if (value === 'REFUNDED') return 'Refunded';
  if (value === 'CANCELLED') return 'Cancelled';
  if (value === 'FAILED') return 'Failed';
  return value ? value.charAt(0) + value.slice(1).toLowerCase() : 'Unknown';
}

export function orderStatusTone(status: string): 'green' | 'red' | 'neutral' {
  const value = status.toUpperCase();
  if (value === 'PAID') return 'green';
  if (value === 'REFUNDED' || value === 'FAILED') return 'red';
  return 'neutral';
}

export function orderItemSummary(order: EventOrder): string {
  if (!order.items.length) return '—';
  return order.items
    .map((item) => `${item.quantity} × ${item.sectionName ?? item.tierName ?? 'Ticket'}`)
    .join(', ');
}

export function orderTicketGrossCents(order: EventOrder): number {
  return Math.max(0, order.subtotalCents - order.discountCents);
}

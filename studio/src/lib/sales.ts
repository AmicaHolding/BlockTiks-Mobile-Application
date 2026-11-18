import { api, type EventOrder, type StudioEvent } from './api';
import type { LocalEventMeta } from './store';

export function eventSold(event: StudioEvent): number {
  return (event.tiers ?? []).reduce((sum, tier) => sum + (tier.sold ?? 0), 0);
}

export function eventCapacity(event: StudioEvent): number {
  const tiers = event.tiers ?? [];
  if (tiers.length > 0) {
    return tiers.reduce((sum, tier) => sum + (tier.quantity ?? 0), 0);
  }
  return (event.venueLayout?.sections ?? []).reduce(
    (sum, section) => sum + (section.capacity ?? 0),
    0,
  );
}

export function eventGrossCents(event: StudioEvent): number {
  return (event.tiers ?? []).reduce(
    (sum, tier) => sum + (tier.sold ?? 0) * (tier.priceCents ?? 0),
    0,
  );
}

export function orderGrossCents(order: EventOrder): number {
  return order.items.reduce(
    (sum, item) => sum + item.unitPriceCents * (item.quantity ?? 1),
    0,
  );
}

export function orderItemLabel(order: EventOrder): string {
  const names = order.items.map((item) => item.tierName).filter(Boolean);
  return names.length > 0 ? names.join(', ') : '-';
}

/** Spec status: lowercase tokens, derived from backend status + local meta. */
export function eventStatus(event: StudioEvent, meta?: LocalEventMeta): string {
  if (meta?.cancelled) return 'cancelled';
  if (meta?.postponed) return 'postponed';
  const raw = (event.status ?? '').toLowerCase();
  if (raw === 'published') return meta?.paused ? 'paused' : 'on sale';
  if (raw === 'draft') return meta?.pendingPublish ? 'awaiting verification' : 'draft';
  return raw || 'draft';
}

export function isOnSale(status: string): boolean {
  return status === 'on sale';
}

export function statusChipClass(status: string): string {
  switch (status) {
    case 'on sale':
      return 'bg-gold/25 text-ink border-gold';
    case 'paused':
      return 'bg-night/10 text-ink/60 border-night/15';
    case 'awaiting verification':
      return 'bg-dune text-ink/70 border-dune';
    case 'sold out':
      return 'bg-night text-gold border-night';
    case 'cancelled':
    case 'rejected':
      return 'bg-rumman/10 text-rumman border-rumman/30';
    case 'postponed':
      return 'bg-dune text-ink/70 border-dune';
    case 'ended':
      return 'bg-dune text-ink/50 border-dune';
    default:
      return 'bg-dune text-ink/60 border-dune';
  }
}

export function orderStatusLabel(order: EventOrder, refundedIds?: Set<string>): string {
  if (refundedIds?.has(order.id) || order.status === 'REFUNDED') return 'Refunded';
  switch (order.status) {
    case 'PAID':
      return 'Paid';
    case 'PENDING':
      return 'Pending';
    case 'CANCELLED':
    case 'FAILED':
      return 'Failed';
    default:
      return order.status;
  }
}

export function isOrderRefundable(order: EventOrder, refundedIds?: Set<string>): boolean {
  return order.status === 'PAID' && !refundedIds?.has(order.id);
}

/** All paid orders across org events, newest first. */
export async function fetchOrgOrders(events: StudioEvent[]): Promise<(EventOrder & { eventId: string; eventTitle: string })[]> {
  const refunded = new Set(api.refundedOrderIds());
  const lists = await Promise.all(
    events.map(async (e) => {
      try {
        const { orders } = await api.eventOrders(e.id);
        return orders.map((o) => ({ ...o, eventId: e.id, eventTitle: e.title, _refunded: refunded.has(o.id) }));
      } catch {
        return [] as (EventOrder & { eventId: string; eventTitle: string })[];
      }
    }),
  );
  return lists.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Ticket gross (face value, not fees) across orders. */
export function ordersTicketGross(orders: EventOrder[]): number {
  return orders
    .filter((o) => o.status === 'PAID')
    .reduce((sum, o) => sum + orderGrossCents(o), 0);
}

export function ordersTicketCount(orders: EventOrder[]): number {
  return orders
    .filter((o) => o.status === 'PAID')
    .reduce((sum, o) => sum + (o.ticketCount ?? o.items.reduce((s, i) => s + i.quantity, 0)), 0);
}

export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

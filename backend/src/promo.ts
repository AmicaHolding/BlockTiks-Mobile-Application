import { getPromoByCode, listUserOrders, type PromoCode } from './db';

// P3: promo validity checks run in order — exists → not used by this user →
// event matches (if scoped) → resale allowed (if the cart has resale lines) →
// not expired → under max_uses. Returns the spec error code on failure.
export type PromoCheck =
  | { ok: true; promo: PromoCode }
  | { ok: false; code: 'promo_invalid' | 'promo_used' | 'promo_wrong_event' | 'promo_not_resale'; message: string };

export async function validatePromoForCheckout(input: {
  code: string;
  userId: string;
  eventId: string;
  hasResale: boolean;
  tierId?: string;
}): Promise<PromoCheck> {
  const promo = await getPromoByCode(input.code);
  if (!promo || !promo.active) {
    return { ok: false, code: 'promo_invalid', message: 'Invalid promo code' };
  }

  const perUser = promo.maxUsesPerUser ?? 1;
  const userOrders = await listUserOrders(input.userId, { limit: 200 });
  // PAID only — a stale PENDING order must not lock the user out of re-trying
  // (P5 marks the promo used only on payment.succeeded anyway).
  const usedByUser = userOrders.items.filter(
    (order) =>
      order.status === 'PAID' &&
      order.promoCodeText?.toUpperCase() === promo.code
  ).length;
  if (usedByUser >= perUser) {
    return { ok: false, code: 'promo_used', message: 'You have already used this code' };
  }

  // Event scoping: EVENT promos must match the cart's event; TIER promos must
  // match a line's tier (by id or legacy name).
  if (promo.scope === 'EVENT' && promo.eventId && promo.eventId !== input.eventId) {
    return { ok: false, code: 'promo_wrong_event', message: 'This code is for a different event' };
  }
  if (promo.tierId && input.tierId && promo.tierId !== input.tierId) {
    return { ok: false, code: 'promo_wrong_event', message: 'This code is for a different ticket tier' };
  }

  // R8: promos apply to resale only when applies_to_resale/validOnResale.
  if (input.hasResale && !promo.validOnResale) {
    return { ok: false, code: 'promo_not_resale', message: 'This code does not apply to resale tickets' };
  }

  const nowMs = Date.now();
  const startsAtMs = promo.startsAt ? Date.parse(promo.startsAt) : NaN;
  const endsAtMs = (promo.endsAt ?? promo.expiresAt) ? Date.parse((promo.endsAt ?? promo.expiresAt)!) : NaN;
  if ((!Number.isNaN(startsAtMs) && startsAtMs > nowMs) || (!Number.isNaN(endsAtMs) && endsAtMs <= nowMs)) {
    return { ok: false, code: 'promo_invalid', message: 'Promo code is expired or not yet active' };
  }

  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return { ok: false, code: 'promo_invalid', message: 'Promo code has been fully redeemed' };
  }

  return { ok: true, promo };
}

// Discount in minor units on the subtotal only (P2 — never the fee).
export function promoDiscountCents(promo: PromoCode, subtotalCents: number): number {
  const percentOff = promo.percentOff ?? (promo.kind === 'PERCENT' ? promo.value : undefined);
  const amountOffCents = promo.amountOffCents ?? (promo.kind === 'FIXED' ? promo.value : undefined);
  return percentOff
    ? Math.round((subtotalCents * percentOff) / 100)
    : Math.min(amountOffCents ?? 0, subtotalCents);
}

/**
 * Product constants and open-decision flags for the fan web app.
 * Numbers come from designs/handoff/03-rules.md; undecided policy uses the
 * recommended default from designs/handoff/04-open-decisions.md behind a flag.
 */

// Studio hand-off: "Host events" links out, we never build Studio surfaces here.
export const STUDIO_URL =
  (import.meta.env.VITE_STUDIO_URL as string | undefined) ?? 'http://localhost:5173';

/** B1, max tickets per order (across tiers or seats). */
export const MAX_PER_ORDER = 6;

/** P1, buyer service fee, percent of subtotal. Displayed as "Service fee (5%)". */
export const BUYER_FEE_PCT = 5;

/** R3, seller payout is price × 0.95. */
export const SELLER_FEE_PCT = 5;

/** R2 / decision-8, resale cap = face × (1 + cap%). Organiser can lower, not raise. */
export const RESALE_CAP_PCT = 10;

/**
 * TODO(decision-16): recommended default is a 10-minute checkout hold with a
 * visible countdown. Backend orders carry expiresAt (15 min default), the
 * countdown reads the real expiry when the order returns it, this flag gates
 * the countdown UI itself.
 */
export const CHECKOUT_HOLD_COUNTDOWN = true;

/** TODO(decision-16): recommended default hold length, the real expiry comes
 *  from order.expiresAt; this is only for pre-checkout copy. */
export const HOLD_MINUTES = 10;

/**
 * TODO(decision-13): recommended default is all-in pricing (fee + VAT
 * inclusive) shown upfront. The checkout summary shows the full total before
 * Pay; VAT is not yet itemised by the backend.
 */
export const ALL_IN_PRICING = true;

/**
 * TODO(decision-1): recommended default is a new credential version on every
 * change of holder. Time-based rotating QR (option c) is deferred to launch.
 */
export const QR_ROTATES_BY_TIME = false;

// TODO(decision-20): invite abuse. Recommended default: a "Report" affordance
// on every invite page plus send limits (limits are server-side).
export const INVITE_REPORT_BUTTON = true;

// Rule I5: plus-ones are 0–2 when the host allows them.
export const MAX_PLUS_ONES = 2;

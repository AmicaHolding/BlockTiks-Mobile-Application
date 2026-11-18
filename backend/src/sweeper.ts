// Reservation sweeper, runs on an EventBridge schedule (every 5 min).
// Finds PENDING orders past their expiresAt, then decides per order:
//   - Stripe PI succeeded  → fulfill (payment arrived, webhook was late/lost)
//   - PI still in flight   → skip, retry next sweep
//   - anything else        → release the inventory hold, mark EXPIRED
// Checking Stripe before releasing closes the race where a payment succeeds
// in the gap between expiry and the webhook arriving.

import {
  deleteExpireIndex,
  expireHold,
  expireTransfer,
  fulfillOrder,
  getOrder,
  listExpiredIndex,
  releaseOrder,
  releaseReservesForEndedEvents,
} from './db';
import { getStripe } from './stripe';

export const handler = async () => {
  const nowIso = new Date().toISOString();
  const expired = await listExpiredIndex(nowIso);
  const expiredOrderIds = expired.map((i) => i.orderId).filter((x): x is string => Boolean(x));
  const stats = {
    scanned: expiredOrderIds.length,
    fulfilled: 0,
    released: 0,
    skipped: 0,
    holdsExpired: 0,
    transfersReturned: 0,
    reservesReleased: 0,
  };

  // hold.expire — release inventory reservations whose 10-min window passed.
  for (const item of expired) {
    if (!item.holdId) continue;
    try {
      if (await expireHold(item.holdId)) stats.holdsExpired++;
    } catch (err) {
      console.error(`sweeper: failed to expire hold ${item.holdId}`, err);
    }
  }

  // transfer.expire — decision-14: unclaimed transfers return to the sender
  // after 48h (or doors-open, whichever is sooner).
  for (const item of expired) {
    if (!item.transferId) continue;
    try {
      if (await expireTransfer(item.transferId)) stats.transfersReturned++;
    } catch (err) {
      console.error(`sweeper: failed to expire transfer ${item.transferId}`, err);
    }
  }

  for (const orderId of expiredOrderIds) {
    try {
      const order = await getOrder(orderId);
      if (!order || order.status !== 'PENDING') {
        await deleteExpireIndex(orderId); // stale index leftover, clean up
        continue;
      }

      if (order.stripePaymentIntentId) {
        const pi = await getStripe().paymentIntents.retrieve(order.stripePaymentIntentId);
        if (pi.status === 'succeeded') {
          await fulfillOrder(orderId, pi.id);
          stats.fulfilled++;
          continue;
        }
        if (pi.status === 'processing' || pi.status === 'requires_action') {
          stats.skipped++; // payment still in flight, don't release yet
          continue;
        }
      }

      await releaseOrder(orderId, 'EXPIRED');
      stats.released++;
    } catch (err) {
      // Leave the index item in place, next sweep retries this order.
      console.error(`sweeper: failed to process order ${orderId}`, err);
    }
  }

  // event.ended → release org reserves (decision-3: event end + 14 days).
  try {
    stats.reservesReleased = await releaseReservesForEndedEvents();
  } catch (err) {
    console.error('sweeper: reserve release failed', err);
  }

  console.log('sweeper:', JSON.stringify(stats));
  return stats;
};

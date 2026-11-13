// Reservation sweeper — runs on an EventBridge schedule (every 5 min).
// Finds PENDING orders past their expiresAt, then decides per order:
//   - Stripe PI succeeded  → fulfill (payment arrived, webhook was late/lost)
//   - PI still in flight   → skip, retry next sweep
//   - anything else        → release the inventory hold, mark EXPIRED
// Checking Stripe before releasing closes the race where a payment succeeds
// in the gap between expiry and the webhook arriving.

import {
  deleteExpireIndex,
  fulfillOrder,
  getOrder,
  listExpiredPendingOrders,
  releaseOrder,
} from './db';
import { getStripe } from './stripe';

export const handler = async () => {
  const expiredOrderIds = await listExpiredPendingOrders(new Date().toISOString());
  const stats = { scanned: expiredOrderIds.length, fulfilled: 0, released: 0, skipped: 0 };

  for (const orderId of expiredOrderIds) {
    try {
      const order = await getOrder(orderId);
      if (!order || order.status !== 'PENDING') {
        await deleteExpireIndex(orderId); // stale index leftover — clean up
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
          stats.skipped++; // payment still in flight — don't release yet
          continue;
        }
      }

      await releaseOrder(orderId, 'EXPIRED');
      stats.released++;
    } catch (err) {
      // Leave the index item in place — next sweep retries this order.
      console.error(`sweeper: failed to process order ${orderId}`, err);
    }
  }

  console.log('sweeper:', JSON.stringify(stats));
  return stats;
};

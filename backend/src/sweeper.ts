// Reservation sweeper, runs on an EventBridge schedule (every 5 min).
// Finds PENDING orders past their expiresAt, then decides per order:
//   - Stripe PI succeeded  → fulfill (payment arrived, webhook was late/lost)
//   - PI still in flight   → skip, retry next sweep
//   - anything else        → release the inventory hold, mark EXPIRED
// Checking Stripe before releasing closes the race where a payment succeeds
// in the gap between expiry and the webhook arriving.

import {
  cleanupOtpChallenges,
  deleteExpireIndex,
  expireHold,
  expireTransfer,
  fulfillOrder,
  getOrder,
  listExpiredIndex,
  listInviteRsvps,
  listEventsStartingBetween,
  listEventTickets,
  listInvitesStartingBetween,
  markEventReminderSent,
  markInviteReminderSent,
  releaseOrder,
  releaseReservesForEndedEvents,
} from './db';
import { notifyUser } from './notify';
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
    otpCleaned: 0,
    inviteReminders: 0,
    eventReminders: 0,
    pendingReleased: 0,
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
          // Same v3 side-effects as the webhook path (fee credit + pending).
          try {
            const { orderFeeBreakdown, postOrderFeeCredit, addWalletPending } = await import('./db/v3');
            const { getListing, setOrderFeeBreakdown } = await import('./db');
            const paid = await getOrder(orderId);
            if (paid) {
              const breakdown = orderFeeBreakdown({ dueMinor: paid.totalCents });
              await setOrderFeeBreakdown(paid.id, breakdown).catch(() => undefined);
              if (breakdown.creditMinor > 0) await postOrderFeeCredit({ userId: paid.userId, orderId: paid.id, amountMinor: breakdown.creditMinor }).catch(() => undefined);
              if (paid.kind === 'RESALE' && paid.listingCode) {
                const listing = await getListing(paid.listingCode);
                if (listing) await addWalletPending({ userId: listing.sellerId, orderId: paid.id, eventId: paid.eventId, amountMinor: paid.faceSubtotalCents ?? paid.subtotalCents }).catch(() => undefined);
              }
            }
          } catch { /* best-effort */ }
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

  // otp.cleanup — drop challenges expired over an hour ago (the hour of
  // history keeps the per-contact send limit accurate, rule A1).
  try {
    stats.otpCleaned = await cleanupOtpChallenges(new Date(Date.now() - 3600_000).toISOString());
  } catch (err) {
    console.error('sweeper: otp cleanup failed', err);
  }

  // invite.reminder — the day before, to Going + Maybe (once per invite).
  try {
    const soon = await listInvitesStartingBetween(nowIso, new Date(Date.now() + 24 * 3600_000).toISOString());
    for (const invite of soon) {
      if (invite.reminderSentAt || !(await markInviteReminderSent(invite.id))) continue;
      const rsvps = await listInviteRsvps(invite.id);
      for (const r of rsvps) {
        if (r.status !== 'going' && r.status !== 'maybe') continue;
        await notifyUser(
          r.userId,
          { type: 'invite.reminder', title: invite.title, body: 'Happening tomorrow', link: `/i/${invite.code}` },
          { sms: true }
        ).catch(() => undefined);
        stats.inviteReminders++;
      }
    }
  } catch (err) {
    console.error('sweeper: invite reminders failed', err);
  }

  // event.reminder — the day before, to everyone holding a valid ticket
  // (Partiful-style: text/push + inbox, once per event).
  try {
    const soonEvents = await listEventsStartingBetween(nowIso, new Date(Date.now() + 24 * 3600_000).toISOString());
    for (const ev of soonEvents) {
      if (ev.reminderSentAt || !(await markEventReminderSent(ev.id))) continue;
      for (const ticket of await listEventTickets(ev.id)) {
        if (ticket.status !== 'VALID') continue;
        await notifyUser(
          ticket.userId,
          { type: 'event.reminder', title: ev.title, body: 'Happening tomorrow — your ticket is in Plans.', link: '/plans' },
          { sms: true }
        ).catch(() => undefined);
        stats.eventReminders++;
      }
    }
  } catch (err) {
    console.error('sweeper: event reminders failed', err);
  }

  // G3: group-pay shares past their 30-min hold get released; the seat goes
  // back and nobody is charged.
  let sharesReleased = 0;
  try {
    const { listExpiredShares, releaseShareSeat } = await import('./db/v3');
    for (const share of await listExpiredShares(nowIso)) {
      // G3: expiry frees the held seat, nobody is charged for it.
      if (await releaseShareSeat(share.orderId, share.shareId)) sharesReleased++;
    }
  } catch (err) {
    console.error('sweeper: share expiry failed', err);
  }

  // W2: resale pending → cash once the event has happened.
  try {
    const { releasePendingForEndedEvents } = await import('./db/v3');
    const { getEventMeta } = await import('./db');
    stats.pendingReleased = await releasePendingForEndedEvents(
      async (eventId) => (await getEventMeta(eventId))?.endsAt ?? (await getEventMeta(eventId))?.startsAt
    );
  } catch (err) {
    console.error('sweeper: wallet pending release failed', err);
  }

  console.log('sweeper:', JSON.stringify({ ...stats, sharesReleased }));
  return stats;
};

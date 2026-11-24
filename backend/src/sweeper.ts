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
  requeueExpireIndex,
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

  // Settled card fee in the order's checkout currency only — a
  // balance_transaction in a different settlement currency can't be
  // subtracted from the checkout amount without conversion.
  const settledCardFee = (pi: { latest_charge?: unknown }, currency?: string): number | undefined => {
    const bt = (pi.latest_charge as { balance_transaction?: { fee?: number; currency?: string } } | null)?.balance_transaction;
    if (typeof bt?.fee !== 'number') return undefined;
    if ((bt.currency ?? '').toLowerCase() !== (currency ?? 'usd').toLowerCase()) return undefined;
    return bt.fee;
  };
  const indexByOrder = new Map(
    expired.filter((i) => i.orderId).map((i) => [i.orderId as string, i.feeRetries ?? 0])
  );
  const FEE_RETRY_MINUTES = 30;
  const FEE_MAX_RETRIES = 48; // ~24h of retries, then fall back to the estimate

  for (const orderId of expiredOrderIds) {
    try {
      const order = await getOrder(orderId);

      // Paid but not confirmed settled — retry until the breakdown AND the
      // buyer credit have both landed. Enters when the breakdown is missing
      // or claims a credit that may not be posted yet; both writes are
      // first-write-wins so re-entering is a no-op once they're in.
      // Eligibility is what the order recorded at purchase time
      // (creditEligible) — not today's flag, so a pricing rollback can't
      // un-earn an owed credit.
      if (order?.status === 'PAID' && order.stripePaymentIntentId &&
          order.creditEligible === true &&
          (!order.feeBreakdown || (order.feeBreakdown.creditMinor ?? 0) > 0)) {
        const retries = indexByOrder.get(orderId) ?? 0;
        const { orderFeeBreakdown, postOrderFeeCredit } = await import('./db/v3');
        const { setOrderFeeBreakdown } = await import('./db');
        let breakdown = order.feeBreakdown;
        let feeMinor: number | undefined;
        if (!breakdown) {
          const pi = await getStripe().paymentIntents.retrieve(order.stripePaymentIntentId, {
            expand: ['latest_charge.balance_transaction'],
          });
          feeMinor = settledCardFee(pi, order.currency);
          if (typeof feeMinor === 'number' || retries >= FEE_MAX_RETRIES) {
            breakdown = orderFeeBreakdown({ dueMinor: order.totalCents, actualCardFeeMinor: feeMinor });
          }
        }
        if (breakdown) {
          await setOrderFeeBreakdown(order.id, breakdown).catch(() => undefined);
          if (breakdown.creditMinor > 0) {
            // Throws on a real write failure → requeue instead of deleting,
            // so the credit isn't lost when the sweep job is dropped.
            try {
              await postOrderFeeCredit({ userId: order.userId, orderId: order.id, amountMinor: breakdown.creditMinor });
              await deleteExpireIndex(orderId);
            } catch {
              await requeueExpireIndex(orderId, new Date(Date.now() + FEE_RETRY_MINUTES * 60_000).toISOString(), retries + 1);
            }
          } else {
            await deleteExpireIndex(orderId);
          }
        } else {
          await requeueExpireIndex(orderId, new Date(Date.now() + FEE_RETRY_MINUTES * 60_000).toISOString(), retries + 1);
        }
        continue;
      }

      if (!order || order.status !== 'PENDING') {
        await deleteExpireIndex(orderId); // stale index leftover, clean up
        continue;
      }

      if (order.stripePaymentIntentId) {
        const pi = await getStripe().paymentIntents.retrieve(order.stripePaymentIntentId, {
          expand: ['latest_charge.balance_transaction'],
        });
        if (pi.status === 'succeeded') {
          await fulfillOrder(orderId, pi.id);
          // Same v3 side-effects as the webhook path (fee credit + pending).
          // Use the settled card fee so the webhook doesn't get locked out
          // of posting the corrected credit later.
          try {
            const { orderFeeBreakdown, postOrderFeeCredit, addWalletPending } = await import('./db/v3');
            const { getListing, setOrderFeeBreakdown } = await import('./db');
            const paid = await getOrder(orderId);
            if (paid) {
              // Seller proceeds first — a requeue failure below must not skip
              // them (fulfillOrder already deleted the index, so a lost
              // requeue only costs the fee-settle retry, never the proceeds).
              // Its own try: a getListing failure can't strand the fee settle.
              try {
                if (paid.kind === 'RESALE' && paid.listingCode) {
                  const listing = await getListing(paid.listingCode);
                  if (listing) await addWalletPending({ userId: listing.sellerId, orderId: paid.id, eventId: paid.eventId, amountMinor: paid.faceSubtotalCents ?? paid.subtotalCents }).catch(() => undefined);
                }
              } catch { /* listing lookup failed — proceeds retry via webhook */ }
              const actualCardFeeMinor = settledCardFee(pi, paid.currency);
              // Only settle the credit when the real fee is known — posting an
              // estimate here would lock the webhook out of correcting it
              // (setOrderFeeBreakdown/postOrderFeeCredit are first-write-wins).
              // Unknown → requeue so a later sweep retries instead of losing it.
              // Ineligible (no all-in fee charged at purchase) → nothing to settle.
              if (paid.creditEligible !== true) {
                // no credit eligibility — leave the credit path to the webhook
              } else if (typeof actualCardFeeMinor === 'number') {
                const breakdown = orderFeeBreakdown({ dueMinor: paid.totalCents, actualCardFeeMinor });
                await setOrderFeeBreakdown(paid.id, breakdown).catch(() => undefined);
                if (breakdown.creditMinor > 0) await postOrderFeeCredit({ userId: paid.userId, orderId: paid.id, amountMinor: breakdown.creditMinor }).catch(() => undefined);
              } else {
                await requeueExpireIndex(orderId, new Date(Date.now() + FEE_RETRY_MINUTES * 60_000).toISOString(), 1).catch(() => undefined);
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
        // Expired with a live intent: cancel it so Stripe can't capture money
        // for an order that will never fulfill.
        await getStripe().paymentIntents.cancel(order.stripePaymentIntentId).catch(() => undefined);
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

  // invite.reminder — the host's chosen offsets (1w / 1d / 2h before start),
  // to Going + Maybe, each at most once.
  try {
    const offsetMs: Record<'1w' | '1d' | '2h', number> = { '1w': 7 * 24 * 3600_000, '1d': 24 * 3600_000, '2h': 2 * 3600_000 };
    const label: Record<string, string> = { '1w': 'One week away', '1d': 'Happening tomorrow', '2h': 'Happening soon' };
    const soon = await listInvitesStartingBetween(nowIso, new Date(Date.now() + 7 * 24 * 3600_000).toISOString());
    for (const invite of soon) {
      if (!invite.startsAt) continue;
      const startMs = Date.parse(invite.startsAt);
      const sent = new Set<string>(invite.reminderSentOffsets ?? []);
      // Rows written before per-offset tracking only ever sent the day-before.
      if (invite.reminderSentAt && !invite.reminderSentOffsets) sent.add('1d');
      for (const off of invite.reminders ?? ['1d', '2h']) {
        const win = offsetMs[off] ?? 0;
        const remaining = startMs - Date.now();
        // Skip when it's not time yet — or the window already passed, e.g. a
        // poll locked 2 days out shouldn't send "One week away".
        if (sent.has(off) || remaining > win || remaining <= win / 2) continue;
        if (!(await markInviteReminderSent(invite.id, off))) continue;
        const rsvps = await listInviteRsvps(invite.id);
        for (const r of rsvps) {
          if (r.status !== 'going' && r.status !== 'maybe') continue;
          await notifyUser(
            r.userId,
            { type: 'invite.reminder', title: invite.title, body: label[off] ?? 'Happening soon', link: `/i/${invite.code}` },
            { sms: true }
          ).catch(() => undefined);
          stats.inviteReminders++;
        }
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
      const reminded = new Set<string>(); // one reminder per holder, not per ticket
      for (const ticket of await listEventTickets(ev.id)) {
        if (ticket.status !== 'VALID' || reminded.has(ticket.userId)) continue;
        reminded.add(ticket.userId);
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

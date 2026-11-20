import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  canManageEvent,
  createPayout,
  getEventMeta,
  getIdempotentResponse,
  getOrder,
  getOrg,
  getUserById,
  ledgerBalance,
  listLedgerEntries,
  listPayouts,
  recordIdempotentResponse,
  refundOrder,
} from '../db';
import { env } from '../env';
import { specError } from '../errors';
import { getStripe } from '../stripe';

function idemKey(request: FastifyRequest): string | null {
  return (request.headers['idempotency-key'] as string | undefined)?.trim() || null;
}

export async function moneyRoutes(app: FastifyInstance) {
  // POST /orders/{id}/refund — full refund (decision-2). Buyers may refund
  // while the event is cancelled or inside the postpone refund window;
  // org managers can refund any paid order on their events.
  app.post('/orders/:id/refund', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { reason?: string };
    const key = idemKey(request);
    if (!key) {
      return specError(reply, 400, 'idempotency_key_required', 'Idempotency-Key header is required');
    }
    const prior = await getIdempotentResponse(request.user.sub, key);
    if (prior) return { ...(prior.response as object), duplicate: true };

    const order = await getOrder(id);
    if (!order || (order as { userId?: string }).userId === undefined) {
      return specError(reply, 404, 'not_found', 'Order not found');
    }
    const event = await getEventMeta(order.eventId);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');

    const isBuyer = order.userId === request.user.sub;
    const isManager = await canManageEvent(event, request.user.sub, request.user.role);
    if (!isBuyer && !isManager && request.user.role !== 'ADMIN') {
      return specError(reply, 403, 'forbidden', 'You cannot refund this order');
    }
    if (isBuyer && !isManager) {
      const windowOpen =
        event.status === 'CANCELLED' ||
        (event.refundWindowEndsAt && Date.parse(event.refundWindowEndsAt) > Date.now());
      if (!windowOpen) {
        return specError(reply, 409, 'refund_window_closed', 'The refund window for this order has closed');
      }
    }
    if (order.status !== 'PAID') {
      return specError(reply, 409, 'not_paid', 'Only paid orders can be refunded');
    }

    // Stripe refund first — if the card network rejects it we don't void
    // tickets or touch the ledger.
    if (env.stripeSecretKey && order.stripePaymentIntentId) {
      try {
        await getStripe().refunds.create(
          { payment_intent: order.stripePaymentIntentId },
          { idempotencyKey: `refund-${order.id}` }
        );
      } catch (e) {
        app.log.warn(e, 'stripe refund failed');
        return specError(reply, 502, 'refund_failed', 'Payment provider rejected the refund');
      }
    }

    const result = await refundOrder(id, body.reason ?? 'requested');
    if (result !== 'refunded') {
      return specError(reply, 409, 'not_paid', 'Only paid orders can be refunded');
    }
    // F6: the refund reverses the fee credit this order earned. Whatever was
    // already spent comes out of the refund amount instead.
    const { reverseOrderFeeCredit } = await import('../db/v3');
    const reversal = await reverseOrderFeeCredit(order.userId, id).catch(() => null);
    const response = {
      order_id: id,
      status: 'REFUNDED',
      refunded: true,
      ...(reversal
        ? { credit_reversed_minor: reversal.reversedMinor, credit_spent_minor: reversal.spentMinor }
        : {}),
    };
    await recordIdempotentResponse(request.user.sub, key, id, response);
    return response;
  });

  // ---------- user earnings + payouts (resale sellers) ----------

  // GET /me/earnings — derived balance + recent entries.
  app.get('/me/earnings', { preHandler: app.authenticate }, async (request) => {
    const account = `user:${request.user.sub}`;
    const [balance, entries] = await Promise.all([
      ledgerBalance(account),
      listLedgerEntries(account, 50),
    ]);
    return {
      available_minor: balance,
      currency: entries[0]?.currency ?? 'usd',
      entries: entries.map((e) => ({
        id: e.id,
        kind: e.kind,
        amount_minor: e.amountMinor,
        order_id: e.orderId,
        created_at: e.createdAt,
      })),
    };
  });

  // GET /me/payouts — payout history.
  app.get('/me/payouts', { preHandler: app.authenticate }, async (request) => {
    const payouts = await listPayouts(`user:${request.user.sub}`);
    return { payouts };
  });

  // POST /me/payouts + Idempotency-Key — withdraw the full available
  // balance to the saved payout destination.
  app.post('/me/payouts', { preHandler: app.authenticate }, async (request, reply) => {
    const key = idemKey(request);
    if (!key) {
      return specError(reply, 400, 'idempotency_key_required', 'Idempotency-Key header is required');
    }
    const prior = await getIdempotentResponse(request.user.sub, key);
    if (prior) return { ...(prior.response as object), duplicate: true };

    const user = await getUserById(request.user.sub);
    if (!user) return specError(reply, 404, 'not_found', 'User not found');
    // A payout needs a destination: Stripe Connect (legacy flow) or a saved
    // bank account. TODO(api-gap): bank transfer execution is scheduled-only.
    if (!user.stripeConnectAccountId && !user.stripeConnectPayoutsEnabled) {
      return specError(reply, 400, 'no_bank', 'Add a payout account first', 'payout_account');
    }
    const account = `user:${request.user.sub}`;
    const balance = await ledgerBalance(account);
    if (balance <= 0) {
      return specError(reply, 409, 'nothing_ready', 'No balance available to withdraw');
    }
    const payout = await createPayout({
      account,
      amountMinor: balance,
      currency: 'usd',
      bankRef: user.stripeConnectAccountId,
    });
    const response = { payout };
    await recordIdempotentResponse(request.user.sub, key, undefined, response);
    return reply.status(201).send(response);
  });

  // ---------- org payouts (Studio, X-Org-Id) ----------

  // GET /orgs/:id/ledger — derived balance + entries (A/C read-only view).
  app.get(
    '/orgs/:id/ledger',
    { preHandler: [app.authenticate, app.requireOrgRole(['admin', 'cohost'])] },
    async (request) => {
      const account = `org:${request.org!.orgId}`;
      const [balance, entries] = await Promise.all([
        ledgerBalance(account),
        listLedgerEntries(account, 100),
      ]);
      return { balance_minor: balance, entries };
    }
  );

  // GET /orgs/:id/payouts — payout history.
  app.get(
    '/orgs/:id/payouts',
    { preHandler: [app.authenticate, app.requireOrgRole(['admin'])] },
    async (request) => {
      const payouts = await listPayouts(`org:${request.org!.orgId}`);
      return { payouts };
    }
  );

  // POST /orgs/:id/payouts + Idempotency-Key — schedule a payout of the
  // available balance to the verified bank account.
  app.post(
    '/orgs/:id/payouts',
    { preHandler: [app.authenticate, app.requireOrgRole(['admin'])] },
    async (request, reply) => {
      const key = idemKey(request);
      if (!key) {
        return specError(reply, 400, 'idempotency_key_required', 'Idempotency-Key header is required');
      }
      const prior = await getIdempotentResponse(request.user.sub, key);
      if (prior) return { ...(prior.response as object), duplicate: true };

      const org = await getOrg(request.org!.orgId);
      if (!org) return specError(reply, 404, 'not_found', 'Organisation not found');
      if (org.verificationStatus !== 'approved') {
        return specError(reply, 400, 'unverified', 'Organisation must be verified before payouts');
      }
      if (!org.payoutAccount) {
        return specError(reply, 400, 'no_bank', 'Add a payout account first', 'payout_account');
      }
      const account = `org:${org.id}`;
      const balance = await ledgerBalance(account);
      if (balance < 0) {
        return specError(reply, 409, 'negative_balance', 'Balance is negative — resolve disputes first');
      }
      if (balance === 0) {
        return specError(reply, 409, 'nothing_ready', 'No balance available to pay out');
      }
      const payout = await createPayout({
        account,
        amountMinor: balance,
        currency: 'usd',
        bankRef: org.payoutAccount.payoutAccountId,
      });
      const response = { payout };
      await recordIdempotentResponse(request.user.sub, key, undefined, response);
      return reply.status(201).send(response);
    }
  );
}

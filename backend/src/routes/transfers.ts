import type { FastifyInstance } from 'fastify';
import {
  cancelTransferBySender,
  claimTransfer,
  createTransfer,
  getTransfer,
  getUserById,
  listUserTransfers,
  TransferError,
  type Transfer,
} from '../db';
import { specError } from '../errors';

function transferBody(transfer: Transfer) {
  return {
    id: transfer.id,
    eventId: transfer.eventId,
    event_id: transfer.eventId,
    ticketIds: transfer.ticketIds,
    ticket_ids: transfer.ticketIds,
    ticket_count: transfer.ticketIds.length,
    to: transfer.toContact,
    to_contact: transfer.toContact,
    to_kind: transfer.toContactKind,
    status: transfer.status,
    expiresAt: transfer.expiresAt,
    expires_at: transfer.expiresAt,
    createdAt: transfer.createdAt,
    created_at: transfer.createdAt,
  };
}

export async function transferRoutes(app: FastifyInstance) {
  // POST /transfers {ticket_ids[], to} — pending transfer; expires in
  // 48h or at doors-open (decision-14). Not a money POST: the recipient
  // pays nothing, but we still accept Idempotency-Key for safe retries of
  // the *creation* (same key + same body → same transfer).
  app.post('/transfers', { preHandler: app.authenticate }, async (request, reply) => {
    const body = request.body as { ticket_ids?: string[]; ticketIds?: string[]; to?: string };
    const ticketIds = body.ticket_ids ?? body.ticketIds ?? [];
    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return specError(reply, 400, 'validation', 'ticket_ids is required', 'ticket_ids');
    }
    if (!body.to) return specError(reply, 400, 'validation', 'to is required', 'to');
    try {
      const transfer = await createTransfer({
        fromUserId: request.user.sub,
        ticketIds,
        to: body.to,
      });
      return reply.status(201).send({ transfer: transferBody(transfer) });
    } catch (e) {
      if (e instanceof TransferError) {
        const status =
          e.code === 'not_found'
            ? 404
            : e.code === 'self_transfer' || e.code === 'bad_contact' || e.code === 'mixed_events'
              ? 400
              : 409;
        return specError(reply, status, e.code, e.message);
      }
      throw e;
    }
  });

  // GET /transfers — sent + claimable incoming.
  app.get('/transfers', { preHandler: app.authenticate }, async (request) => {
    const { sent, incoming } = await listUserTransfers(request.user.sub);
    return {
      sent: sent.map(transferBody),
      incoming: incoming.map(transferBody),
      // Legacy/flat convenience: all transfers involving this user.
      transfers: [...sent, ...incoming].map(transferBody),
    };
  });

  // POST /transfers/{id}/claim — recipient takes tickets; credentials
  // rotate so the sender's QR becomes superseded (X2).
  app.post('/transfers/:id/claim', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const transfer = await claimTransfer(id, request.user.sub);
      return { transfer: transferBody(transfer), tickets: transfer.ticketIds };
    } catch (e) {
      if (e instanceof TransferError) {
        const status = e.code === 'not_found' ? 404 : e.code === 'not_recipient' ? 403 : 409;
        return specError(reply, status, e.code, e.message);
      }
      throw e;
    }
  });

  // POST /transfers/{id}/cancel — sender pulls a pending transfer back.
  app.post('/transfers/:id/cancel', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const transfer = await getTransfer(id);
    if (!transfer) return specError(reply, 404, 'not_found', 'Transfer not found');
    if (transfer.fromUserId !== request.user.sub) {
      return specError(reply, 403, 'not_sender', 'Only the sender can cancel this transfer');
    }
    if (transfer.status !== 'pending') {
      return specError(reply, 409, 'already_claimed', 'Transfer is no longer pending');
    }
    const ok = await cancelTransferBySender(id);
    if (!ok) return specError(reply, 409, 'already_claimed', 'Transfer is no longer pending');
    return reply.status(204).send();
  });
}

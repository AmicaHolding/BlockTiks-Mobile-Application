import { randomUUID } from 'crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  canManageEvent,
  checkInTicket,
  createBroadcast,
  doorManifest,
  eventLifecycleState,
  getEventMeta,
  getScanEvent,
  getTicketByCode,
  getTiersForEvent,
  getUserById,
  listDoorEvents,
  listEventBroadcasts,
  listEventGuests,
  listEventOrders,
  listEventTickets,
  postLedgerEntries,
  recordScanEvent,
  undoCheckIn,
  upsertDevice,
  type CheckInResult,
  type EventItem,
  type Organisation,
  type ScanEvent,
} from '../db';
import { env } from '../env';
import { specError } from '../errors';

type ScanResultCode =
  | 'admitted'
  | 'already_used'
  | 'wrong_event'
  | 'void'
  | 'superseded'
  | 'not_found'
  | 'forbidden';

function toScanResult(res: CheckInResult): {
  result: ScanResultCode;
  ticket?: { code: string; tierName?: string; sectionName?: string };
  already_used?: { at?: string; device?: string };
} {
  switch (res.result) {
    case 'OK':
      return {
        result: 'admitted',
        ticket: {
          code: res.ticket.code,
          tierName: res.ticket.tierName,
          sectionName: res.ticket.sectionName,
        },
      };
    case 'ALREADY_USED':
      // D4: report where/when the first admission happened.
      return {
        result: 'already_used',
        ticket: { code: res.ticket.code, tierName: res.ticket.tierName },
        already_used: {
          at: res.ticket.checkedInAt ?? res.ticket.checkedInScannedAt,
          device: res.ticket.checkedInDeviceId,
        },
      };
    case 'VOID':
      return {
        result: 'void',
        ticket: { code: res.ticket.code, tierName: res.ticket.tierName },
      };
    case 'SUPERSEDED':
      // R1: stale credential version (screenshot / transferred ticket).
      return {
        result: 'superseded',
        ticket: { code: res.ticket.code, tierName: res.ticket.tierName },
      };
    case 'WRONG_EVENT':
      return { result: 'wrong_event' };
    case 'FORBIDDEN':
      return { result: 'forbidden' };
    default:
      return { result: 'not_found' };
  }
}

async function doorGuard(
  request: FastifyRequest,
  reply: FastifyReply,
  roles: ('admin' | 'cohost' | 'gate')[]
): Promise<EventItem | null> {
  const { id } = request.params as { id: string };
  const event = await getEventMeta(id);
  if (!event) {
    await specError(reply, 404, 'not_found', 'Event not found');
    return null;
  }
  if (!(await canManageEvent(event, request.user.sub, request.user.role, roles))) {
    await specError(reply, 403, 'forbidden', 'You do not have door access to this event');
    return null;
  }
  return event;
}

// Creator/door mode: QR check-in, guest list, door manifest, batch sync.
export async function doorRoutes(app: FastifyInstance) {
  // POST /events/:id/checkin, scan a ticket code.
  // Body: { code: string }. Returns a discrete result the scanner maps to
  // its valid / already-used / wrong-event / offline states.
  app.post(
    '/events/:id/checkin',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['code'],
          properties: { code: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { code } = request.body as { code: string };
      const res = await checkInTicket(id, code.trim(), request.user.sub, request.user.role);
      switch (res.result) {
        case 'OK':
          return {
            result: 'OK',
            ticket: {
              code: res.ticket.code,
              tierName: res.ticket.tierName,
              sectionName: res.ticket.sectionName,
              checkedInAt: res.ticket.checkedInAt,
            },
          };
        case 'ALREADY_USED':
          return reply.status(409).send({
            result: 'ALREADY_USED',
            ticket: {
              code: res.ticket.code,
              tierName: res.ticket.tierName,
              sectionName: res.ticket.sectionName,
              checkedInAt: res.ticket.checkedInAt,
            },
          });
        case 'SUPERSEDED':
          // R1: a credential version older than the current one (stale QR).
          return reply.status(409).send({
            result: 'SUPERSEDED',
            ticket: { code: res.ticket.code, tierName: res.ticket.tierName },
          });
        case 'VOID':
          // Refunded / transferred-away / otherwise voided ticket — not
          // "already used" (previously misreported).
          return reply.status(410).send({
            result: 'VOID',
            ticket: {
              code: res.ticket.code,
              tierName: res.ticket.tierName,
              sectionName: res.ticket.sectionName,
            },
          });
        case 'WRONG_EVENT':
          return reply.status(400).send({ result: 'WRONG_EVENT' });
        case 'FORBIDDEN':
          return reply.status(403).send({ result: 'FORBIDDEN' });
        default:
          return reply.status(404).send({ result: 'NOT_FOUND' });
      }
    }
  );

  // ---------- spec door endpoints (D1–D4) ----------

  // GET /me/door-events — events the caller can scan (A C G + legacy
  // creator-owned), enriched with live/sold/checked_in for the list UI.
  app.get('/me/door-events', { preHandler: app.authenticate }, async (request) => {
    const rows = await listDoorEvents(request.user.sub);
    const out = [] as {
      event: EventItem;
      org: Organisation | null;
      role: string;
      live: boolean;
      sold: number;
      checked_in: number;
    }[];
    for (const { event, org, role } of rows) {
      const [tiers, tickets] = await Promise.all([
        getTiersForEvent(event.id),
        listEventTickets(event.id).catch(() => []),
      ]);
      out.push({
        event,
        org,
        role,
        live: eventLifecycleState(event, tiers) === 'live',
        sold: tiers.reduce((s, t) => s + t.sold, 0),
        checked_in: tickets.filter((t) => t.status === 'USED').length,
      });
    }
    return { events: out };
  });

  // GET /events/:id/door-manifest — offline credential cache; the door app
  // refreshes every ~60s while online (D2).
  app.get('/events/:id/door-manifest', { preHandler: app.authenticate }, async (request, reply) => {
    const event = await doorGuard(request, reply, ['admin', 'cohost', 'gate']);
    if (!event) return;
    return doorManifest(event.id);
  });

  // POST /events/:id/scans {payload,device_id,scanned_at} — spec scan shape.
  app.post('/events/:id/scans', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      payload?: string;
      device_id?: string;
      scanned_at?: string;
      scan_id?: string;
    };
    if (!body.payload?.trim()) {
      return specError(reply, 400, 'validation', 'payload is required', 'payload');
    }
    const event = await getEventMeta(id);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');
    const scanId = body.scan_id ?? randomUUID();
    const prior = await getScanEvent(id, scanId);
    if (prior) {
      // Client retry of an already-recorded scan → return the stored result.
      return { scan_id: scanId, result: prior.result, duplicate: true };
    }
    const res = await checkInTicket(id, body.payload.trim(), request.user.sub, request.user.role, {
      deviceId: body.device_id,
      scannedAt: body.scanned_at,
      scanId,
    });
    const mapped = toScanResult(res);
    let holder: string | undefined;
    if ('ticket' in res && res.ticket) {
      const user = await getUserById(res.ticket.userId);
      holder = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;
    }
    await recordScanEvent({
      scanId,
      eventId: id,
      ticketCode: mapped.ticket?.code ?? body.payload.trim(),
      deviceId: body.device_id,
      actorId: request.user.sub,
      result: mapped.result,
      scannedAt: new Date().toISOString(),
      deviceScannedAt: body.scanned_at,
    });
    const status =
      mapped.result === 'already_used' || mapped.result === 'superseded'
        ? 409
        : mapped.result === 'void'
          ? 410
          : mapped.result === 'forbidden'
            ? 403
            : mapped.result === 'not_found'
              ? 404
              : mapped.result === 'wrong_event'
                ? 400
                : 200;
    return reply.status(status).send({
      scan_id: scanId,
      result: mapped.result,
      ticket: mapped.ticket,
      holder,
      group_size: 1,
      ...(mapped.already_used ? { already_used: mapped.already_used } : {}),
    });
  });

  // POST /events/:id/scans/batch — offline sync (D3/D4). Each item is
  // deduped by scan_id; first-writer-wins across devices.
  app.post('/events/:id/scans/batch', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      scans?: { scan_id: string; payload: string; device_id?: string; scanned_at?: string }[];
    };
    const items = Array.isArray(body) ? body : body.scans;
    if (!Array.isArray(items) || items.length === 0) {
      return specError(reply, 400, 'validation', 'scans[] is required', 'scans');
    }
    if (items.length > 500) {
      return specError(reply, 400, 'validation', 'Maximum 500 scans per batch', 'scans');
    }
    const event = await getEventMeta(id);
    if (!event) return specError(reply, 404, 'not_found', 'Event not found');

    const accepted: { scan_id: string; result: string; ticket_code?: string }[] = [];
    const conflicts: {
      scan_id: string;
      result: string;
      ticket_code?: string;
      already_used?: { at?: string; device?: string };
    }[] = [];

    for (const item of items.slice(0, 500)) {
      const scanId = item.scan_id ?? randomUUID();
      const prior = await getScanEvent(id, scanId);
      if (prior) {
        // Replay — report the original outcome idempotently.
        (prior.result === 'admitted' ? accepted : conflicts).push({
          scan_id: scanId,
          result: prior.result,
          ticket_code: prior.ticketCode,
        });
        continue;
      }
      if (!item.payload?.trim()) {
        conflicts.push({ scan_id: scanId, result: 'not_found' });
        continue;
      }
      const res = await checkInTicket(id, item.payload.trim(), request.user.sub, request.user.role, {
        deviceId: item.device_id,
        scannedAt: item.scanned_at,
        scanId,
      });
      const mapped = toScanResult(res);
      const scan: ScanEvent = {
        scanId,
        eventId: id,
        ticketCode: mapped.ticket?.code ?? item.payload.trim(),
        deviceId: item.device_id,
        actorId: request.user.sub,
        result: mapped.result,
        scannedAt: new Date().toISOString(),
        deviceScannedAt: item.scanned_at,
      };
      await recordScanEvent(scan);
      if (mapped.result === 'admitted') {
        accepted.push({ scan_id: scanId, result: 'admitted', ticket_code: mapped.ticket?.code });
      } else {
        conflicts.push({
          scan_id: scanId,
          result: mapped.result,
          ticket_code: mapped.ticket?.code,
          ...(mapped.already_used ? { already_used: mapped.already_used } : {}),
        });
      }
    }
    return { accepted, conflicts };
  });

  // POST /tickets/:code/check-in — manual check-in from the guest list.
  app.post('/tickets/:code/check-in', { preHandler: app.authenticate }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const ticket = await getTicketByCode(code);
    if (!ticket) return specError(reply, 404, 'not_found', 'Ticket not found');
    const res = await checkInTicket(ticket.eventId, code, request.user.sub, request.user.role);
    const mapped = toScanResult(res);
    return { result: mapped.result, ticket: mapped.ticket };
  });

  // DELETE /tickets/:code/check-in — undo within env.doorUndoSeconds.
  app.delete('/tickets/:code/check-in', { preHandler: app.authenticate }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const ticket = await getTicketByCode(code);
    if (!ticket) return specError(reply, 404, 'not_found', 'Ticket not found');
    const result = await undoCheckIn(ticket.eventId, code, request.user.sub, request.user.role);
    switch (result) {
      case 'undone':
        return reply.status(204).send();
      case 'not_checked_in':
        return specError(reply, 409, 'not_checked_in', 'Ticket is not checked in');
      case 'window_closed':
        return specError(reply, 409, 'window_closed', 'Undo window has closed');
      case 'forbidden':
        return specError(reply, 403, 'forbidden', 'You do not have door access to this event');
      default:
        return specError(reply, 404, 'not_found', 'Ticket not found');
    }
  });

  // POST /me/devices — register a door scanner device (records last_sync_at;
  // D3 offline staleness is enforced client-side against the manifest).
  app.post('/me/devices', { preHandler: app.authenticate }, async (request, reply) => {
    const body = request.body as { id?: string; name?: string; org_id?: string };
    const device = await upsertDevice({
      id: body.id,
      userId: request.user.sub,
      orgId: body.org_id,
      name: body.name,
    });
    return reply.status(201).send({ device });
  });

  // ---------- Studio/guest/broadcast (legacy paths, now org-aware) ----------

  // GET /events/:id/orders, paid order feed for Studio. Derived from issued
  // tickets because the MVP schema has no event-order GSI; pending/failed
  // checkouts are intentionally excluded.
  app.get('/events/:id/orders', { preHandler: app.authenticate }, async (request, reply) => {
    const event = await doorGuard(request, reply, ['admin', 'cohost']);
    if (!event) return;
    const orders = await listEventOrders(event.id);
    return {
      orders: orders.map((order) => ({
        id: order.id,
        kind: order.kind ?? 'TICKET',
        status: order.status,
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        feesCents: order.feesCents,
        totalCents: order.totalCents,
        promoCodeText: order.promoCodeText,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        ticketCount: order.ticketCodes?.length ?? order.items.reduce((sum, item) => sum + item.quantity, 0),
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        items: order.items.map((item) => ({
          tierId: item.tierId,
          tierName: item.tierName,
          sectionId: item.sectionId,
          sectionName: item.sectionName,
          ticketCode: item.ticketCode,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
        })),
      })),
    };
  });

  app.get('/events/:id/broadcasts', { preHandler: app.authenticate }, async (request, reply) => {
    const event = await doorGuard(request, reply, ['admin', 'cohost']);
    if (!event) return;
    const broadcasts = await listEventBroadcasts(event.id);
    return { broadcasts };
  });

  app.post('/events/:id/broadcasts', { preHandler: app.authenticate }, async (request, reply) => {
    const event = await doorGuard(request, reply, ['admin', 'cohost']);
    if (!event) return;
    const id = event.id;
    const body = request.body as {
      audience?: string;
      audienceFilter?: { tierName?: string; sectionName?: string; checkedIn?: boolean };
      message?: string;
      body_text?: string;
      channels?: { push?: boolean; email?: boolean; sms?: boolean };
    };
    const message = (body.message ?? body.body_text)?.trim();
    if (!message) return specError(reply, 400, 'validation', 'Message is required', 'message');
    if (message.length > 500) {
      return specError(reply, 400, 'validation', 'Message is too long', 'message');
    }

    let guests = await listEventGuests(id);
    const filter = body.audienceFilter;
    if (filter?.tierName) guests = guests.filter((guest) => guest.tierName === filter.tierName);
    if (filter?.sectionName) guests = guests.filter((guest) => guest.sectionName === filter.sectionName);
    if (filter?.checkedIn === true) guests = guests.filter((guest) => Boolean(guest.checkedInAt));
    if (filter?.checkedIn === false) guests = guests.filter((guest) => !guest.checkedInAt);
    if (guests.length === 0) {
      return specError(reply, 400, 'empty_audience', 'No attendees match this audience');
    }

    // M1: max 3 broadcasts per event (was incorrectly per event-day).
    const existing = await listEventBroadcasts(id);
    if (existing.length >= 3) {
      return specError(reply, 429, 'limit_reached', 'Maximum 3 broadcasts per event');
    }

    const channels = {
      push: body.channels?.push ?? true,
      email: body.channels?.email ?? true,
      sms: body.channels?.sms ?? false,
    };
    // M2: SMS cost is charged to the event's owner account (minor units).
    const smsCostMinor = channels.sms ? guests.length * env.smsCostFils : 0;
    const broadcast = await createBroadcast({
      eventId: id,
      creatorId: request.user.sub,
      audience: body.audience?.trim() || 'Everyone',
      audienceFilter: filter,
      message,
      channels,
      recipientCount: guests.length,
      recipientIds: [...new Set(guests.map((guest) => guest.userId))],
    });
    if (smsCostMinor > 0) {
      const account = event.ownerOrgId ? `org:${event.ownerOrgId}` : `user:${event.creatorId}`;
      await postLedgerEntries([
        {
          txId: `broadcast:${broadcast.id}`,
          account,
          amountMinor: -smsCostMinor,
          currency: event.currency ?? 'aed',
          kind: 'broadcast_cost',
          eventId: id,
          memo: `SMS broadcast to ${guests.length} recipients`,
        },
      ]).catch((e) => request.log.warn(e, 'broadcast cost ledger post failed'));
    }
    return reply.status(201).send({
      broadcast,
      recipients: guests.length,
      sms_cost: smsCostMinor,
      sms_cost_minor: smsCostMinor,
      delivery: 'queued',
      note: 'Push/email/SMS delivery is not connected yet; the broadcast is stored for the attendee feed.',
    });
  });

  // GET /events/:id/guests?q=&filter= — attendee list for the guest-list
  // screen (A C G). `q` matches name/email/code; filter=checked_in|not_in.
  app.get('/events/:id/guests', { preHandler: app.authenticate }, async (request, reply) => {
    const event = await doorGuard(request, reply, ['admin', 'cohost', 'gate']);
    if (!event) return;
    const { q, filter } = request.query as { q?: string; filter?: string };
    let guests = await listEventGuests(event.id);
    const needle = q?.trim().toLowerCase();
    if (needle) {
      guests = guests.filter(
        (g) =>
          g.guestName.toLowerCase().includes(needle) ||
          g.guestEmail.toLowerCase().includes(needle) ||
          g.code.toLowerCase().includes(needle)
      );
    }
    if (filter === 'checked_in') guests = guests.filter((g) => g.status === 'USED');
    if (filter === 'not_in') guests = guests.filter((g) => g.status === 'VALID');
    return {
      guests: guests.map((g) => ({
        code: g.code,
        name: g.guestName,
        email: g.guestEmail,
        tierName: g.tierName,
        sectionName: g.sectionName,
        status: g.status,
        checkedInAt: g.checkedInAt,
        createdAt: g.createdAt,
      })),
      checkedIn: guests.filter((g) => g.status === 'USED').length,
      total: guests.length,
    };
  });
}

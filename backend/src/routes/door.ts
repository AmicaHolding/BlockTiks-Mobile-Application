import type { FastifyInstance } from 'fastify';
import {
  checkInTicket,
  createBroadcast,
  getEventMeta,
  listEventBroadcasts,
  listEventGuests,
  listEventOrders,
} from '../db';

// Creator "door mode": QR check-in and the guest list for one event.
export async function doorRoutes(app: FastifyInstance) {
  // POST /events/:id/checkin — scan a ticket code.
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
        case 'WRONG_EVENT':
          return reply.status(400).send({ result: 'WRONG_EVENT' });
        case 'FORBIDDEN':
          return reply.status(403).send({ result: 'FORBIDDEN' });
        default:
          return reply.status(404).send({ result: 'NOT_FOUND' });
      }
    }
  );

  // GET /events/:id/orders — paid order feed for Studio. Derived from issued
  // tickets because the MVP schema has no event-order GSI; pending/failed
  // checkouts are intentionally excluded.
  app.get('/events/:id/orders', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) return reply.status(404).send({ message: 'Event not found' });
    if (event.creatorId !== request.user.sub && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ message: 'Not the event creator' });
    }
    const orders = await listEventOrders(id);
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
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) return reply.status(404).send({ message: 'Event not found' });
    if (event.creatorId !== request.user.sub && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ message: 'Not the event creator' });
    }
    const broadcasts = await listEventBroadcasts(id);
    return { broadcasts };
  });

  app.post('/events/:id/broadcasts', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) return reply.status(404).send({ message: 'Event not found' });
    if (event.creatorId !== request.user.sub && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ message: 'Not the event creator' });
    }
    const body = request.body as {
      audience?: string;
      audienceFilter?: { tierName?: string; sectionName?: string; checkedIn?: boolean };
      message?: string;
      channels?: { push?: boolean; email?: boolean; sms?: boolean };
    };
    const message = body.message?.trim();
    if (!message) return reply.status(400).send({ message: 'Message is required' });
    if (message.length > 500) return reply.status(400).send({ message: 'Message is too long' });

    let guests = await listEventGuests(id);
    const filter = body.audienceFilter;
    if (filter?.tierName) guests = guests.filter((guest) => guest.tierName === filter.tierName);
    if (filter?.sectionName) guests = guests.filter((guest) => guest.sectionName === filter.sectionName);
    if (filter?.checkedIn === true) guests = guests.filter((guest) => Boolean(guest.checkedInAt));
    if (filter?.checkedIn === false) guests = guests.filter((guest) => !guest.checkedInAt);

    const today = new Date().toISOString().slice(0, 10);
    const existing = await listEventBroadcasts(id);
    const sentToday = existing.filter((broadcast) => broadcast.createdAt.slice(0, 10) === today).length;
    if (sentToday >= 3) {
      return reply.status(429).send({ message: 'Maximum 3 broadcasts per event day' });
    }

    const channels = {
      push: body.channels?.push ?? true,
      email: body.channels?.email ?? true,
      sms: body.channels?.sms ?? false,
    };
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
    return reply.status(201).send({
      broadcast,
      delivery: 'queued',
      note: 'Push/email/SMS delivery is not connected yet; the broadcast is stored for the attendee feed.',
    });
  });

  // GET /events/:id/guests — attendee list for the guest-list screen.
  // Creator/admin only; each row carries the ticket code so the app can
  // offer manual check-in through the same /checkin endpoint.
  app.get('/events/:id/guests', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) return reply.status(404).send({ message: 'Event not found' });
    if (event.creatorId !== request.user.sub && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ message: 'Not the event creator' });
    }
    const guests = await listEventGuests(id);
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

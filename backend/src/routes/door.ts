import type { FastifyInstance } from 'fastify';
import { checkInTicket, getEventMeta, listEventGuests } from '../db';

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

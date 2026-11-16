import type { FastifyInstance } from 'fastify';
import { listUserTickets, transferTicket } from '../db';

export async function ticketRoutes(app: FastifyInstance) {
  // GET /tickets — current user's tickets (wallet)
  app.get('/tickets', { preHandler: app.authenticate }, async (request) => {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await listUserTickets(request.user.sub, {
      cursor,
      limit: limit ? Math.min(parseInt(limit, 10) || 100, 200) : 200,
    });
    return { tickets: result.items, nextCursor: result.nextCursor };
  });

  // POST /tickets/:code/transfer — gift a VALID ticket to another user by email.
  app.post(
    '/tickets/:code/transfer',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['recipientEmail'],
          properties: { recipientEmail: { type: 'string', format: 'email' } },
        },
      },
    },
    async (request, reply) => {
      const { code } = request.params as { code: string };
      const { recipientEmail } = request.body as { recipientEmail: string };
      const result = await transferTicket({
        ticketCode: code,
        fromUserId: request.user.sub,
        recipientEmail: recipientEmail.trim().toLowerCase(),
      });
      switch (result.result) {
        case 'OK':
          return {
            ticket: result.ticket,
            recipient: {
              id: result.recipient.id,
              email: result.recipient.email,
              firstName: result.recipient.firstName,
              lastName: result.recipient.lastName,
            },
          };
        case 'NOT_FOUND':
          return reply.status(404).send({ message: 'Ticket not found' });
        case 'NOT_YOURS':
          return reply.status(403).send({ message: 'Not your ticket' });
        case 'NOT_VALID':
          return reply.status(409).send({ message: 'Only valid tickets can be transferred' });
        case 'LISTED':
          return reply.status(409).send({ message: 'Cancel the resale listing before transferring' });
        case 'SELF':
          return reply.status(400).send({ message: 'You cannot transfer a ticket to yourself' });
        case 'RECIPIENT_NOT_FOUND':
          return reply.status(404).send({ message: 'No Sahra account uses that email' });
        case 'FORBIDDEN':
          return reply.status(403).send({ message: 'Forbidden' });
      }
    }
  );
}

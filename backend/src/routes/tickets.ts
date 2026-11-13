import type { FastifyInstance } from 'fastify';
import { listUserTickets } from '../db';

export async function ticketRoutes(app: FastifyInstance) {
  // GET /tickets — current user's tickets (wallet)
  app.get('/tickets', { preHandler: app.authenticate }, async (request) => {
    const tickets = await listUserTickets(request.user.sub);
    return { tickets };
  });
}

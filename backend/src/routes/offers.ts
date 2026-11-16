import type { FastifyInstance } from 'fastify';
import { cancelOffer, createOffer, listUserOffers, OfferError } from '../db';

// Standing "set your price" auto-buy requests. A matching resale listing is
// marked for the buyer; checkout still goes through the normal resale flow.
export async function offerRoutes(app: FastifyInstance) {
  app.get('/offers/mine', { preHandler: app.authenticate }, async (request) => {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await listUserOffers(request.user.sub, {
      cursor,
      limit: limit ? Math.min(parseInt(limit, 10) || 100, 200) : 200,
    });
    return { offers: result.items, nextCursor: result.nextCursor };
  });

  app.post(
    '/offers',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['eventId', 'tierName', 'maxPriceCents', 'quantity'],
          properties: {
            eventId: { type: 'string' },
            tierName: { type: 'string' },
            sectionName: { type: 'string' },
            maxPriceCents: { type: 'integer', minimum: 1 },
            quantity: { type: 'integer', minimum: 1, maximum: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        eventId: string;
        tierName: string;
        sectionName?: string;
        maxPriceCents: number;
        quantity: number;
      };
      try {
        const offer = await createOffer({ buyerId: request.user.sub, ...body });
        return reply.status(201).send({ offer });
      } catch (e) {
        if (e instanceof OfferError) return reply.status(400).send({ message: e.message });
        throw e;
      }
    }
  );

  app.delete('/offers/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await cancelOffer(request.user.sub, id);
    if (result === 'not_found') return reply.status(404).send({ message: 'Offer not found' });
    if (result === 'forbidden') return reply.status(403).send({ message: 'Not your offer' });
    return { cancelled: true };
  });
}

import type { FastifyInstance } from 'fastify';
import {
    cancelListing,
    createListing,
    listActiveListings,
    ListingError,
    listSellerListings,
    listUserTickets,
    matchOffersForListing
} from '../db';

// Resale marketplace: fans list VALID tickets, buyers discover them on the
// event page, and purchase goes through the normal order-intent → Stripe →
// webhook flow (kind=RESALE orders transfer the existing ticket).
export async function listingRoutes(app: FastifyInstance) {
  // GET /listings?eventId= — active resale listings (public).
  app.get('/listings', async (request) => {
    const { eventId } = request.query as { eventId?: string };
    const listings = await listActiveListings(eventId);
    return { listings };
  });

  // GET /listings/mine — current user's listings (any status).
  app.get('/listings/mine', { preHandler: app.authenticate }, async (request) => {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await listSellerListings(request.user.sub, {
      cursor,
      limit: limit ? Math.min(parseInt(limit, 10) || 100, 200) : 200,
    });
    return { listings: result.items, nextCursor: result.nextCursor };
  });

  // POST /tickets/:code/list — put one of my tickets up for resale.
  app.post(
    '/tickets/:code/list',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['priceCents'],
          properties: { priceCents: { type: 'integer', minimum: 1 } },
        },
      },
    },
    async (request, reply) => {
      const { code } = request.params as { code: string };
      const { priceCents } = request.body as { priceCents: number };
      try {
        const listing = await createListing({
          sellerId: request.user.sub,
          ticketCode: code,
          priceCents,
        });
        const matchedOffers = await matchOffersForListing(listing).catch(() => []);
        return reply.status(201).send({ listing, matchedOffers });
      } catch (e) {
        if (e instanceof ListingError) {
          const status =
            e.message === 'Ticket not found' ? 404
            : e.message === 'Not your ticket' ? 403
            : e.message === 'Ticket is already listed' ? 409
            : 400;
          return reply.status(status).send({ message: e.message });
        }
        throw e;
      }
    }
  );

  // GET /tickets/mine — alias kept for the app's ticket picker: returns my
  // VALID tickets that are NOT currently listed, ready to sell.
  app.get('/tickets/sellable', { preHandler: app.authenticate }, async (request) => {
    const [ticketsResult, listingsResult] = await Promise.all([
      listUserTickets(request.user.sub, { limit: 200 }),
      listSellerListings(request.user.sub, { limit: 200 }),
    ]);
    const tickets = ticketsResult.items;
    const listings = listingsResult.items;
    const listed = new Set(
      listings.filter((l) => l.status === 'ACTIVE' || l.status === 'CHECKOUT').map((l) => l.ticketCode)
    );
    return {
      tickets: tickets
        .filter((t) => t.status === 'VALID' && !listed.has(t.code))
        .map((t) => ({
          code: t.code,
          eventTitle: t.eventTitle,
          eventStartsAt: t.eventStartsAt,
          eventLocation: t.eventLocation,
          tierName: t.tierName,
          sectionName: t.sectionName,
        })),
    };
  });

  // DELETE /listings/:code — seller cancels an ACTIVE listing.
  app.delete('/listings/:code', { preHandler: app.authenticate }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const res = await cancelListing(request.user.sub, code);
    if (res === 'not_found') return reply.status(404).send({ message: 'Listing not found' });
    if (res === 'forbidden') return reply.status(403).send({ message: 'Not your listing' });
    return { cancelled: true };
  });
}

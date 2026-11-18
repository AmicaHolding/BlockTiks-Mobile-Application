import type { FastifyInstance } from 'fastify';
import {
    cancelListingGroup,
    createListing,
    createListingGroup,
    listActiveListings,
    ListingError,
    listSellerListings,
    listUserTickets,
    matchOffersForListing
} from '../db';
import { specError } from '../errors';

function listingErrorResponse(reply: Parameters<typeof specError>[0], e: ListingError) {
  const status =
    e.code === 'not_found' ? 404
    : e.code === 'not_holder' ? 403
    : e.code === 'resale_disabled' ? 403
    : e.code === 'already_listed' ? 409
    : e.code === 'transfer_pending' ? 409
    : e.code === 'above_cap' ? 400
    : 400;
  // Legacy clients read `message`; spec clients read `code`/`field`.
  return reply.status(status).send({
    code: e.code,
    message: e.message,
    ...(e.cap !== undefined ? { cap: e.cap, cap_cents: e.cap } : {}),
  });
}

// Resale marketplace: fans list VALID tickets, buyers discover them on the
// event page, and purchase goes through the normal order-intent → Stripe →
// webhook flow (kind=RESALE orders transfer the existing ticket).
export async function listingRoutes(app: FastifyInstance) {
  // GET /listings?eventId=, active resale listings (public).
  app.get('/listings', async (request) => {
    const { eventId } = request.query as { eventId?: string };
    const listings = await listActiveListings(eventId);
    return { listings };
  });

  // GET /listings/mine, current user's listings (any status).
  app.get('/listings/mine', { preHandler: app.authenticate }, async (request) => {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await listSellerListings(request.user.sub, {
      cursor,
      limit: limit ? Math.min(parseInt(limit, 10) || 100, 200) : 200,
    });
    return { listings: result.items, nextCursor: result.nextCursor };
  });

  // POST /tickets/:code/list, put one of my tickets up for resale.
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
        if (e instanceof ListingError) return listingErrorResponse(reply, e);
        throw e;
      }
    }
  );

  // POST /listings — spec contract: {ticket_ids[], price_each, split_rule}.
  // Creates one LISTING# row per ticket under a shared groupId.
  app.post(
    '/listings',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['price_each'],
          properties: {
            ticket_ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
            ticketIds: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 6 },
            price_each: { type: 'integer', minimum: 1 },
            priceEachCents: { type: 'integer', minimum: 1 },
            split_rule: { type: 'string', enum: ['any', 'all', 'pairs'] },
            splitRule: { type: 'string', enum: ['any', 'all', 'pairs'] },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        ticket_ids?: string[];
        ticketIds?: string[];
        price_each?: number;
        priceEachCents?: number;
        split_rule?: 'any' | 'all' | 'pairs';
        splitRule?: 'any' | 'all' | 'pairs';
      };
      const ticketIds = body.ticket_ids ?? body.ticketIds ?? [];
      const priceEach = body.price_each ?? body.priceEachCents;
      const splitRule = body.split_rule ?? body.splitRule ?? 'any';
      if (ticketIds.length === 0) {
        return specError(reply, 400, 'bad_request', 'ticket_ids is required', 'ticket_ids');
      }
      if (!priceEach) {
        return specError(reply, 400, 'bad_request', 'price_each is required', 'price_each');
      }
      if (splitRule === 'pairs' && ticketIds.length % 2 !== 0) {
        return specError(reply, 400, 'bad_request', 'split_rule=pairs needs an even ticket count', 'split_rule');
      }
      try {
        const { groupId, listings } = await createListingGroup({
          sellerId: request.user.sub,
          ticketCodes: ticketIds,
          priceCents: priceEach,
          splitRule,
        });
        for (const listing of listings) {
          await matchOffersForListing(listing).catch(() => []);
        }
        return reply.status(201).send({
          listing: {
            id: groupId,
            ticket_ids: ticketIds,
            price_each: priceEach,
            price_each_minor: priceEach,
            split_rule: splitRule,
            status: 'active',
            event_id: listings[0]?.eventId,
            currency: listings[0]?.currency,
          },
          // camelCase mirror for the existing client style.
          listingId: groupId,
          listings,
        });
      } catch (e) {
        if (e instanceof ListingError) return listingErrorResponse(reply, e);
        throw e;
      }
    }
  );

  // GET /tickets/mine, alias kept for the app's ticket picker: returns my
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
          currency: t.currency,
        })),
    };
  });

  // DELETE /listings/:id — seller withdraws a listing. :id is a listing
  // groupId (spec) or a bare ticket code (legacy). already_sold is a 409.
  app.delete('/listings/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const res = await cancelListingGroup(request.user.sub, id);
    if (res === 'not_found') return reply.status(404).send({ code: 'not_found', message: 'Listing not found' });
    if (res === 'forbidden') return reply.status(403).send({ code: 'not_holder', message: 'Not your listing' });
    if (res === 'already_sold') return reply.status(409).send({ code: 'already_sold', message: 'Listing already sold' });
    return { cancelled: true };
  });
}

import type { FastifyInstance } from 'fastify';
import {
  cancelOffer,
  createOffer,
  getEventMeta,
  getTier,
  getTiersForEvent,
  getUserById,
  listActiveListingsForTier,
  listUserOffers,
  OfferError,
  resumeOffer,
} from '../db';
import { env } from '../env';
import { specError } from '../errors';
import { getStripe } from '../stripe';

function watchBody(o: Awaited<ReturnType<typeof createOffer>>) {
  return {
    // Legacy shape first — the spec snake_case fields below win on overlap.
    ...o,
    id: o.id,
    event_id: o.eventId,
    tier_id: o.tierId,
    tier_name: o.tierName,
    qty: o.quantity,
    max_each: o.maxPriceCents,
    payment_method_id: o.paymentMethodId,
    auto_buy: Boolean(o.autoBuy),
    status: o.status.toLowerCase(),
    paused_reason: o.pausedReason,
    matched_count: o.matchedCount,
    createdAt: o.createdAt,
  };
}

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
            quantity: { type: 'integer', minimum: 1, maximum: 6 },
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

  // ---------- PriceWatch (J, W1–W5; Offer is the storage model) ----------

  // GET /price-watches — spec alias of /offers/mine.
  app.get('/price-watches', { preHandler: app.authenticate }, async (request) => {
    const result = await listUserOffers(request.user.sub, { limit: 200 });
    return { watches: result.items.map(watchBody) };
  });

  // POST /price-watches {event_id,tier_id,qty,max_each,payment_method_id}
  // W1: max_each is capped at the tier's resale cap. W2: a payment method
  // turns the watch into an auto-buy. If a matching listing already exists,
  // we return {match:{listing_id}} so the buyer can check out immediately.
  app.post('/price-watches', { preHandler: app.authenticate }, async (request, reply) => {
    const body = request.body as {
      event_id?: string;
      eventId?: string;
      tier_id?: string;
      tierId?: string;
      tier_name?: string;
      qty?: number;
      quantity?: number;
      max_each?: number;
      maxEach?: number;
      payment_method_id?: string;
      paymentMethodId?: string;
    };
    const eventId = body.event_id ?? body.eventId;
    const tierId = body.tier_id ?? body.tierId;
    const tierNameIn = body.tier_name;
    const qty = body.qty ?? body.quantity;
    const maxEach = body.max_each ?? body.maxEach;
    const paymentMethodId = body.payment_method_id ?? body.paymentMethodId;
    if (!eventId || (!tierId && !tierNameIn) || !qty || !maxEach) {
      return specError(reply, 400, 'validation', 'event_id, tier_id, qty and max_each are required');
    }
    const event = await getEventMeta(eventId);
    if (!event || event.status !== 'PUBLISHED') {
      return specError(reply, 404, 'not_found', 'Event not found or not on sale');
    }
    let tierName = tierNameIn;
    let faceCents: number | undefined;
    if (tierId) {
      const tier = await getTier(tierId, eventId);
      if (!tier) return specError(reply, 404, 'not_found', 'Tier not found');
      tierName = tier.name;
      faceCents = tier.priceCents;
    } else {
      const tiers = await getTiersForEvent(eventId);
      const tier = tiers.find((t) => t.name === tierNameIn);
      if (!tier) return specError(reply, 404, 'not_found', 'Tier not found');
      faceCents = tier.priceCents;
    }
    // W1/R2: the watch's max can't exceed the resale cap on face value.
    const cap = Math.round((faceCents * (event.resaleCapPct ?? env.resaleCapPct)) / 100);
    if (maxEach > cap) {
      return specError(reply, 400, 'above_cap', 'max_each exceeds the resale cap', 'max_each', {
        cap,
        cap_cents: cap,
      });
    }
    if (qty < 1 || qty > 6) {
      return specError(reply, 400, 'max_per_order', 'Maximum 6 tickets per order', 'qty');
    }

    // W2: validate the saved payment method when auto-buy is requested.
    if (paymentMethodId) {
      const user = await getUserById(request.user.sub);
      if (!env.stripeSecretKey || !user?.stripeCustomerId) {
        // Local/dev without Stripe: keep the watch but skip auto-buy.
        // TODO(api-gap): in production the card must be a saved off-session
        // method on the customer's Stripe account.
      } else {
        try {
          const pm = await getStripe().paymentMethods.retrieve(paymentMethodId);
          if (pm.type !== 'card') throw new Error('not a card');
        } catch {
          return specError(reply, 400, 'card_invalid', 'Payment method is not usable', 'payment_method_id');
        }
      }
    }

    // Immediate match: cheapest ACTIVE listing in this tier at/below max.
    const listings = await listActiveListingsForTier(eventId, tierId ?? '', tierName!);
    const eligible = listings
      .filter((l) => l.sellerId !== request.user.sub && l.priceCents <= maxEach)
      .sort((a, b) => a.priceCents - b.priceCents);
    if (eligible.length > 0) {
      return {
        match: {
          listing_id: eligible[0].groupId ?? eligible[0].ticketCode,
          price_each: eligible[0].priceCents,
        },
      };
    }

    try {
      const offer = await createOffer({
        buyerId: request.user.sub,
        eventId,
        tierName: tierName!,
        tierId,
        maxPriceCents: maxEach,
        quantity: qty,
        paymentMethodId,
        autoBuy: Boolean(paymentMethodId) && env.priceWatchAutoCharge,
      });
      return reply.status(201).send({ watch: watchBody(offer) });
    } catch (e) {
      if (e instanceof OfferError) return specError(reply, 400, 'duplicate', e.message);
      throw e;
    }
  });

  // DELETE /price-watches/:id — cancel a watch.
  app.delete('/price-watches/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await cancelOffer(request.user.sub, id);
    if (result === 'not_found') return specError(reply, 404, 'not_found', 'Watch not found');
    if (result === 'forbidden') return specError(reply, 403, 'forbidden', 'Not your watch');
    return reply.status(204).send();
  });

  // POST /price-watches/:id/resume — W4: resume a paused watch after the
  // buyer fixes their payment method.
  app.post('/price-watches/:id/resume', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await resumeOffer(request.user.sub, id);
    if (result === 'not_found') return specError(reply, 404, 'not_found', 'Watch not found or not paused');
    if (result === 'forbidden') return specError(reply, 403, 'forbidden', 'Not your watch');
    return { resumed: true };
  });
}

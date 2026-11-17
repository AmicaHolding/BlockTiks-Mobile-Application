import type { FastifyInstance } from 'fastify';
import {
    claimListingForCheckout,
    createPendingOrder,
    fulfillOrder,
    ensureSectionSeats,
    getEvent,
    getListing,
    getOrder,
    getOrderIdByPaymentIntent,
    getPromoByCode,
    getSection,
    getUserById,
    incrementPromoUsage,
    getTicketByCode,
    getTier,
    listUserOrders,
    releaseListingCheckout,
    releaseOrder,
    releaseSeats,
    releaseSectionHold,
    releaseTierHold,
    reserveSeats,
    reserveSectionSeats,
    reserveTickets,
    setOrderPaymentIntent,
    type Order
} from '../db';
import { env } from '../env';
import { getStripe } from '../stripe';

export async function orderRoutes(app: FastifyInstance) {
  // POST /orders/intent — create a pending order + Stripe PaymentIntent.
  // The client confirms the PaymentIntent with the Stripe SDK/payment sheet,
  // then the webhook marks the order PAID and issues tickets.
  //
  // Three purchase kinds:
  //   { eventId, tierId, quantity, promoCode? }  — GA tier tickets
  //   { eventId, sectionId, quantity }           — seated venue sections
  //   { listingCode }                            — resale ticket transfer
  app.post(
    '/orders/intent',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            tierId: { type: 'string' },
            sectionId: { type: 'string' },
            listingCode: { type: 'string' },
            quantity: { type: 'integer', minimum: 1, maximum: 8 },
            promoCode: { type: 'string' },
            // Seat-level picking: specific seat labels within sectionId.
            seats: { type: 'array', items: { type: 'string' }, maxItems: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        eventId?: string;
        tierId?: string;
        sectionId?: string;
        listingCode?: string;
        quantity?: number;
        promoCode?: string;
        seats?: string[];
      };

      const feesFor = (cents: number) =>
        Math.round((cents * env.platformFeePercent) / 100);
      const expiresAtFor = () =>
        new Date(Date.now() + env.reservationTtlMinutes * 60_000).toISOString();

      // Shared tail: create the PENDING order, open the Stripe intent, and
      // compensate the hold if anything after the hold fails.
      const checkout = async (opts: {
        kind?: 'TICKET' | 'RESALE' | 'SEATED';
        eventId: string;
        listingCode?: string;
        items: Parameters<typeof createPendingOrder>[0]['items'];
        subtotalCents: number;
        discountCents?: number;
        totalCents: number;
        promoCodeText?: string;
        currency?: string;
        compensate: () => Promise<void>;
      }) => {
        const discountCents = opts.discountCents ?? 0;
        const feesCents = opts.totalCents - opts.subtotalCents + discountCents;
        const currency = (opts.currency ?? 'usd').toLowerCase();
        let order: Order | undefined;
        try {
          order = await createPendingOrder({
            userId: request.user.sub,
            eventId: opts.eventId,
            kind: opts.kind,
            listingCode: opts.listingCode,
            items: opts.items,
            subtotalCents: opts.subtotalCents,
            discountCents,
            feesCents,
            totalCents: opts.totalCents,
            promoCodeText: opts.promoCodeText,
            currency,
            expiresAt: expiresAtFor(),
          });

          const stripe = getStripe();
          const paymentIntent = await stripe.paymentIntents.create(
            {
              amount: opts.totalCents,
              currency,
              automatic_payment_methods: { enabled: true },
              metadata: {
                orderId: order.id,
                userId: request.user.sub,
                eventId: opts.eventId,
                kind: opts.kind ?? 'TICKET',
              },
            },
            { idempotencyKey: `order-${order.id}` }
          );

          await setOrderPaymentIntent(order.id, paymentIntent.id);

          return {
            orderId: order.id,
            clientSecret: paymentIntent.client_secret,
            amountCents: opts.totalCents,
            currency,
            subtotalCents: opts.subtotalCents,
            discountCents,
            feesCents,
          };
        } catch (err) {
          if (order) await releaseOrder(order.id, 'CANCELLED');
          else await opts.compensate();
          throw err;
        }
      };

      // ---- RESALE: buy a listed ticket ----
      if (body.listingCode) {
        const listing = await getListing(body.listingCode);
        if (!listing || listing.status !== 'ACTIVE') {
          return reply.status(404).send({ message: 'Listing not found' });
        }
        if (listing.sellerId === request.user.sub) {
          return reply.status(400).send({ message: 'Cannot buy your own listing' });
        }
        const ticket = await getTicketByCode(body.listingCode);
        if (!ticket || ticket.status !== 'VALID' || ticket.userId !== listing.sellerId) {
          return reply.status(409).send({ message: 'This ticket is no longer available' });
        }
        const claimed = await claimListingForCheckout(body.listingCode);
        if (!claimed) {
          return reply.status(409).send({ message: 'This ticket was just sold' });
        }
        const eventCurrency = listing.currency ?? 'usd';
        const totalCents = listing.priceCents + feesFor(listing.priceCents);
        return checkout({
          kind: 'RESALE',
          eventId: listing.eventId,
          listingCode: body.listingCode,
          currency: eventCurrency,
          items: [
            {
              ticketCode: body.listingCode,
              tierName: listing.tierName,
              quantity: 1,
              unitPriceCents: listing.priceCents,
            },
          ],
          subtotalCents: listing.priceCents,
          totalCents,
          compensate: () => releaseListingCheckout(body.listingCode!),
        });
      }

      if (!body.eventId) {
        return reply.status(400).send({ message: 'eventId is required' });
      }
      const { eventId, quantity = 1 } = body;

      const eventResult = await getEvent(eventId);
      if (!eventResult || eventResult.event.status !== 'PUBLISHED') {
        return reply.status(400).send({ message: 'Event is not on sale' });
      }

      // ---- SEATED: reserve seats in a venue section ----
      if (body.sectionId) {
        const section = await getSection(eventId, body.sectionId);
        if (!section) {
          return reply.status(404).send({ message: 'Section not found' });
        }
        const seatLabels = body.seats?.map((s) => s.trim()).filter(Boolean);
        if (seatLabels && seatLabels.length !== quantity) {
          return reply.status(400).send({ message: 'Seat count must match quantity' });
        }
        if (seatLabels && new Set(seatLabels).size !== seatLabels.length) {
          return reply.status(400).send({ message: 'Duplicate seats selected' });
        }
        // Capacity guard first, then exact-seat holds. Both must succeed or
        // both are compensated below.
        const held = await reserveSectionSeats(eventId, body.sectionId, quantity);
        if (!held) {
          return reply.status(409).send({ message: 'Not enough seats remaining' });
        }
        let seatsHeld = true;
        if (seatLabels?.length) {
          const layoutSection = eventResult.event.venueLayout?.sections.find((s) => s.id === body.sectionId);
          if (layoutSection) {
            await ensureSectionSeats(eventId, {
              ...layoutSection,
              priceCents: section.priceCents,
              capacity: section.capacity,
            });
          }
          seatsHeld = await reserveSeats(eventId, body.sectionId, seatLabels);
          if (!seatsHeld) {
            await releaseSectionHold(eventId, body.sectionId, quantity).catch(() => undefined);
            return reply.status(409).send({ message: 'One or more seats are no longer available' });
          }
        }
        const subtotalCents = section.priceCents * quantity;
        const totalCents = subtotalCents + feesFor(subtotalCents);
        return checkout({
          kind: 'SEATED',
          eventId,
          currency: eventResult.event.currency ?? 'usd',
          items: [
            {
              sectionId: body.sectionId,
              sectionName: section.name,
              tierName: section.name,
              quantity,
              unitPriceCents: section.priceCents,
              seatLabels: seatLabels?.length ? seatLabels : undefined,
            },
          ],
          subtotalCents,
          totalCents,
          compensate: async () => {
            if (seatLabels?.length) {
              await releaseSeats(eventId, body.sectionId!, seatLabels).catch(() => undefined);
            }
            await releaseSectionHold(eventId, body.sectionId!, quantity);
          },
        });
      }

      // ---- GA TIER: existing flow ----
      if (!body.tierId) {
        return reply.status(400).send({ message: 'tierId or sectionId is required' });
      }
      const { tierId, promoCode } = body;
      const tier = eventResult.tiers.find((t) => t.id === tierId) ?? (await getTier(tierId, eventId));
      if (!tier || tier.eventId !== eventId) {
        return reply.status(404).send({ message: 'Ticket tier not found' });
      }
      if (tier.sold + quantity > tier.quantity) {
        return reply.status(409).send({ message: 'Not enough tickets remaining' });
      }
      // Enforce the tier's on-sale window (fields exist on tiers but were
      // previously unchecked, allowing purchases outside the sale period).
      const saleNow = Date.now();
      if (tier.saleStartsAt && Date.parse(tier.saleStartsAt) > saleNow) {
        return reply.status(400).send({ message: 'Ticket sales have not started yet' });
      }
      if (tier.saleEndsAt && Date.parse(tier.saleEndsAt) <= saleNow) {
        return reply.status(400).send({ message: 'Ticket sales for this tier have ended' });
      }

      // Server-side pricing — never trust client amounts.
      const subtotalCents = tier.priceCents * quantity;
      let discountCents = 0;
      let promoCodeText: string | undefined;

      if (promoCode) {
        const promo = await getPromoByCode(promoCode);
        if (!promo) {
          return reply.status(400).send({ message: 'Invalid or expired promo code' });
        }

        const nowMs = Date.now();
        const endsAt = promo.endsAt ?? promo.expiresAt;
        const startsAtMs = promo.startsAt ? Date.parse(promo.startsAt) : NaN;
        const endsAtMs = endsAt ? Date.parse(endsAt) : NaN;
        let valid = promo.active;

        if (valid && promo.maxUses != null) {
          valid = promo.usedCount < promo.maxUses;
        }
        if (valid && !Number.isNaN(startsAtMs)) {
          valid = startsAtMs <= nowMs;
        }
        if (valid && !Number.isNaN(endsAtMs)) {
          valid = endsAtMs > nowMs;
        }
        if (valid && promo.scope === 'EVENT' && promo.eventId && promo.eventId !== eventId) {
          valid = false;
        }
        if (valid && promo.tierId && promo.tierId !== tierId) {
          valid = false;
        }
        if (
          valid &&
          promo.scope === 'TIER' &&
          promo.tierName &&
          promo.tierName.toLowerCase() !== tier.name.toLowerCase()
        ) {
          valid = false;
        }
        if (valid && promo.maxUsesPerUser) {
          const userOrdersResult = await listUserOrders(request.user.sub, { limit: 200 });
          const userUses = userOrdersResult.items.filter(
            (order) =>
              order.status === 'PAID' &&
              order.promoCodeText?.toUpperCase() === promo.code
          ).length;
          valid = userUses < promo.maxUsesPerUser;
        }

        if (!valid) {
          return reply.status(400).send({ message: 'Invalid or expired promo code' });
        }
        promoCodeText = promo.code;
        const percentOff = promo.percentOff ?? (promo.kind === 'PERCENT' ? promo.value : undefined);
        const amountOffCents = promo.amountOffCents ?? (promo.kind === 'FIXED' ? promo.value : undefined);
        discountCents = percentOff
          ? Math.round((subtotalCents * percentOff) / 100)
          : Math.min(amountOffCents ?? 0, subtotalCents);
      }

      const feesCents = Math.round(
        ((subtotalCents - discountCents) * env.platformFeePercent) / 100
      );
      const totalCents = subtotalCents - discountCents + feesCents;

      // Atomically reserve inventory before creating the PaymentIntent —
      // the oversell guard. Buyers who lose the race get a 409 here.
      const held = await reserveTickets(eventId, tierId, quantity);
      if (!held) {
        return reply.status(409).send({ message: 'Not enough tickets remaining' });
      }

      return checkout({
        eventId,
        currency: eventResult.event.currency ?? 'usd',
        items: [
          {
            tierId,
            tierName: tier.name,
            quantity,
            unitPriceCents: tier.priceCents,
          },
        ],
        subtotalCents,
        discountCents,
        totalCents,
        promoCodeText,
        compensate: () => releaseTierHold(eventId, tierId, quantity),
      });
    }
  );

  // GET /orders — current user's orders (?cursor=, ?limit=)
  app.get('/orders', { preHandler: app.authenticate }, async (request) => {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await listUserOrders(request.user.sub, {
      cursor,
      limit: limit ? Math.min(parseInt(limit, 10) || 50, 100) : 100,
    });
    return { orders: result.items, nextCursor: result.nextCursor };
  });

  // GET /orders/:id — order detail incl. issued tickets
  app.get('/orders/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await getOrder(id);
    if (!order || order.userId !== request.user.sub) {
      return reply.status(404).send({ message: 'Order not found' });
    }
    return { order };
  });

  // POST /webhooks/stripe — payment confirmation → fulfill order.
  // Configure in Stripe Dashboard (or `stripe listen` locally) to point here.
  app.post('/webhooks/stripe', async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string | undefined;
    // deploy.sh uses a public placeholder until the real whsec_ is configured;
    // never accept events signed with it.
    if (!signature || !env.stripeWebhookSecret || env.stripeWebhookSecret.startsWith('whsec_placeholder')) {
      return reply.status(503).send({ message: 'Webhook secret not configured' });
    }

    let event;
    try {
      event = getStripe().webhooks.constructEvent(
        (request as unknown as { rawBody: Buffer }).rawBody,
        signature,
        env.stripeWebhookSecret
      );
    } catch (err) {
      return reply
        .status(400)
        .send({ message: `Webhook signature verification failed: ${(err as Error).message}` });
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const orderId = pi.metadata?.orderId ?? (await getOrderIdByPaymentIntent(pi.id));
      if (orderId) {
        const result = await fulfillOrder(orderId, pi.id);
        if (result === 'fulfilled') {
          const order = await getOrder(orderId);
          if (order?.promoCodeText) {
            await incrementPromoUsage(order.promoCodeText);
          }
          // Resale proceeds accrue to the seller's earnings balance and are
          // paid out via /account/withdraw (Stripe Connect transfer), so no
          // transfer happens here.
        }
      }
    } else if (
      event.type === 'payment_intent.payment_failed' ||
      event.type === 'payment_intent.canceled'
    ) {
      const pi = event.data.object;
      const orderId = pi.metadata?.orderId ?? (await getOrderIdByPaymentIntent(pi.id));
      if (orderId) {
        // Release the inventory hold — exactly-once via the PENDING condition.
        await releaseOrder(orderId, 'FAILED');
      }
    }

    return { received: true };
  });
}

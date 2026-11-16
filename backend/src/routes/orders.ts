import type { FastifyInstance } from 'fastify';
import {
    claimListingForCheckout,
    createPendingOrder,
    fulfillOrder,
    getEvent,
    getListing,
    getOrder,
    getOrderIdByPaymentIntent,
    getPromoByCode,
    getSection,
    getTicketByCode,
    getTier,
    listUserOrders,
    releaseListingCheckout,
    releaseOrder,
    releaseSectionHold,
    releaseTierHold,
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
        compensate: () => Promise<void>;
      }) => {
        const discountCents = opts.discountCents ?? 0;
        const feesCents = opts.totalCents - opts.subtotalCents + discountCents;
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
            expiresAt: expiresAtFor(),
          });

          const stripe = getStripe();
          const paymentIntent = await stripe.paymentIntents.create(
            {
              amount: opts.totalCents,
              currency: 'usd',
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
        const totalCents = listing.priceCents + feesFor(listing.priceCents);
        return checkout({
          kind: 'RESALE',
          eventId: listing.eventId,
          listingCode: body.listingCode,
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
        const held = await reserveSectionSeats(eventId, body.sectionId, quantity);
        if (!held) {
          return reply.status(409).send({ message: 'Not enough seats remaining' });
        }
        const subtotalCents = section.priceCents * quantity;
        const totalCents = subtotalCents + feesFor(subtotalCents);
        return checkout({
          kind: 'SEATED',
          eventId,
          items: [
            {
              sectionId: body.sectionId,
              sectionName: section.name,
              tierName: section.name,
              quantity,
              unitPriceCents: section.priceCents,
            },
          ],
          subtotalCents,
          totalCents,
          compensate: () => releaseSectionHold(eventId, body.sectionId!, quantity),
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

      // Server-side pricing — never trust client amounts.
      const subtotalCents = tier.priceCents * quantity;
      let discountCents = 0;
      let promoCodeText: string | undefined;

      if (promoCode) {
        const promo = await getPromoByCode(promoCode);
        const now = new Date();
        const valid =
          promo !== null &&
          promo.active &&
          (!promo.expiresAt || new Date(promo.expiresAt) > now) &&
          (!promo.maxUses || promo.usedCount < promo.maxUses) &&
          (!promo.eventId || promo.eventId === eventId);
        if (!promo || !valid) {
          return reply.status(400).send({ message: 'Invalid or expired promo code' });
        }
        promoCodeText = promo.code;
        discountCents = promo.percentOff
          ? Math.round((subtotalCents * promo.percentOff) / 100)
          : Math.min(promo.amountOffCents ?? 0, subtotalCents);
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

  // GET /orders — current user's orders
  app.get('/orders', { preHandler: app.authenticate }, async (request) => {
    const orders = await listUserOrders(request.user.sub);
    return { orders };
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
    if (!signature || !env.stripeWebhookSecret) {
      return reply.status(400).send({ message: 'Missing signature or webhook secret' });
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
        await fulfillOrder(orderId, pi.id);
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

import type { FastifyInstance } from 'fastify';
import {
    createPendingOrder,
    fulfillOrder,
    getEvent,
    getOrder,
    getOrderIdByPaymentIntent,
    getPromoByCode,
    getTier,
    listUserOrders,
    releaseOrder,
    releaseTierHold,
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
  app.post(
    '/orders/intent',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['eventId', 'tierId', 'quantity'],
          properties: {
            eventId: { type: 'string' },
            tierId: { type: 'string' },
            quantity: { type: 'integer', minimum: 1, maximum: 8 },
            promoCode: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { eventId, tierId, quantity, promoCode } = request.body as {
        eventId: string;
        tierId: string;
        quantity: number;
        promoCode?: string;
      };

      const eventResult = await getEvent(eventId);
      const tier = eventResult?.tiers.find((t) => t.id === tierId) ?? (await getTier(tierId, eventId));
      if (!eventResult || !tier || tier.eventId !== eventId) {
        return reply.status(404).send({ message: 'Ticket tier not found' });
      }
      if (eventResult.event.status !== 'PUBLISHED') {
        return reply.status(400).send({ message: 'Event is not on sale' });
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

      const expiresAt = new Date(
        Date.now() + env.reservationTtlMinutes * 60_000
      ).toISOString();
      let order: Order | undefined;
      try {
        order = await createPendingOrder({
          userId: request.user.sub,
          eventId,
          tier,
          quantity,
          subtotalCents,
          discountCents,
          feesCents,
          totalCents,
          promoCodeText,
          expiresAt,
        });

        const stripe = getStripe();
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: totalCents,
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
            metadata: { orderId: order.id, userId: request.user.sub, eventId },
          },
          { idempotencyKey: `order-${order.id}` }
        );

        await setOrderPaymentIntent(order.id, paymentIntent.id);

        return {
          orderId: order.id,
          clientSecret: paymentIntent.client_secret,
          amountCents: totalCents,
          subtotalCents,
          discountCents,
          feesCents,
        };
      } catch (err) {
        // Compensate: give the hold back. If the order record exists, release
        // through it (clears the expiry index too); otherwise credit the tier.
        if (order) await releaseOrder(order.id, 'CANCELLED');
        else await releaseTierHold(eventId, tierId, quantity);
        throw err;
      }
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

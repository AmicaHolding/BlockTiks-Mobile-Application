import type { FastifyInstance } from 'fastify';
import {
  getUserById,
  listBroadcastsForEvents,
  listSellerListings,
  listPromos,
  listUserOffers,
  listUserOrders,
  listUserTickets,
  setUserStripeCustomerId,
} from '../db';
import { env } from '../env';
import { getStripe } from '../stripe';

function itemSummary(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

export async function accountRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.sub;
    const [orders, tickets, listings, offers] = await Promise.all([
      listUserOrders(userId),
      listUserTickets(userId),
      listSellerListings(userId),
      listUserOffers(userId),
    ]);
    const eventIds = [
      ...new Set([
        ...tickets.map((ticket) => ticket.eventId),
        ...orders.map((order) => order.eventId),
        ...listings.map((listing) => listing.eventId),
      ]),
    ];
    const allBroadcasts = await listBroadcastsForEvents(eventIds);
    const broadcasts = allBroadcasts.filter(
      (broadcast) => !broadcast.recipientIds || broadcast.recipientIds.includes(userId)
    );

    const items = [
      ...orders
        .filter((order) => order.status === 'PAID')
        .map((order) => ({
          id: `order-${order.id}`,
          type: 'purchase',
          title: 'Tickets confirmed',
          body: itemSummary([
            order.event?.title,
            order.items.map((item) => `${item.quantity} × ${item.sectionName ?? item.tierName}`).join(', '),
          ]),
          createdAt: order.paidAt ?? order.createdAt,
          href: '/tickets',
        })),
      ...listings
        .filter((listing) => listing.status === 'SOLD')
        .map((listing) => ({
          id: `listing-${listing.ticketCode}`,
          type: 'sale',
          title: 'Resale ticket sold',
          body: itemSummary([listing.eventTitle, listing.tierName, 'proceeds release after the event']),
          createdAt: listing.createdAt,
          href: '/tickets',
        })),
      ...offers
        .filter((offer) => offer.status === 'MATCHED' && offer.lastMatchedAt)
        .map((offer) => ({
          id: `offer-${offer.id}`,
          type: 'offer',
          title: 'Price matched',
          body: `A resale listing matched your ${offer.tierName} offer.`,
          createdAt: offer.lastMatchedAt!,
          href: '/tickets',
        })),
      ...broadcasts.map((broadcast) => ({
        id: `broadcast-${broadcast.id}`,
        type: 'broadcast',
        title: 'Organizer update',
        body: broadcast.message,
        createdAt: broadcast.createdAt,
        href: null,
      })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);

    return { notifications: items, unreadCount: items.length };
  });

  app.post('/notifications/read', { preHandler: app.authenticate }, async () => ({ ok: true }));

  app.get('/transactions', { preHandler: app.authenticate }, async (request) => {
    const [orders, listings] = await Promise.all([
      listUserOrders(request.user.sub),
      listSellerListings(request.user.sub),
    ]);
    const nowIso = new Date().toISOString();
    const rows = [
      ...orders
        .filter((order) => order.status === 'PAID' || order.status === 'REFUNDED')
        .map((order) => ({
          id: `order-${order.id}`,
          type: order.status === 'REFUNDED' ? 'refund' : 'purchase',
          kind: order.kind ?? 'TICKET',
          title: order.event?.title ?? 'Ticket order',
          subtitle: itemSummary([
            order.items.map((item) => `${item.quantity} × ${item.sectionName ?? item.tierName}`).join(', '),
            order.promoCodeText ? `Promo ${order.promoCodeText}` : undefined,
          ]),
          amountCents: order.totalCents,
          direction: order.status === 'REFUNDED' ? 'in' : 'out',
          status: order.status === 'REFUNDED' ? 'Refunded' : 'Paid',
          createdAt: order.paidAt ?? order.createdAt,
        })),
      ...listings
        .filter((listing) => listing.status === 'SOLD')
        .map((listing) => ({
          id: `sale-${listing.ticketCode}`,
          type: 'sale',
          kind: 'RESALE',
          title: `Resale · ${listing.tierName}`,
          subtitle: itemSummary([listing.eventTitle, new Date(listing.eventStartsAt).toLocaleDateString()]),
          amountCents: listing.priceCents,
          direction: 'in',
          status: listing.eventStartsAt > nowIso ? 'Pending' : 'Ready',
          createdAt: listing.createdAt,
        })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 100);
    return { transactions: rows };
  });

  app.get('/account/earnings', { preHandler: app.authenticate }, async (request) => {
    const listings = await listSellerListings(request.user.sub);
    const sold = listings.filter((listing) => listing.status === 'SOLD');
    const nowMs = Date.now();
    const pending = sold.filter((listing) => new Date(listing.eventStartsAt).getTime() > nowMs);
    const ready = sold.filter((listing) => new Date(listing.eventStartsAt).getTime() <= nowMs);
    return {
      readyCents: ready.reduce((sum, listing) => sum + listing.priceCents, 0),
      pendingCents: pending.reduce((sum, listing) => sum + listing.priceCents, 0),
      lifetimeCents: sold.reduce((sum, listing) => sum + listing.priceCents, 0),
      sales: sold
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 50)
        .map((listing) => ({
          id: listing.ticketCode,
          title: listing.eventTitle,
          subtitle: `${listing.tierName} · ${new Date(listing.eventStartsAt).toLocaleDateString()}`,
          amountCents: listing.priceCents,
          status: new Date(listing.eventStartsAt).getTime() > nowMs ? 'Pending' : 'Ready',
          createdAt: listing.createdAt,
        })),
    };
  });

  app.post('/account/withdraw', { preHandler: app.authenticate }, async (_request, reply) => {
    return reply.status(501).send({ message: 'Payout accounts are not connected yet' });
  });

  app.get('/account/payment-methods', { preHandler: app.authenticate }, async (request) => {
    if (!env.stripeSecretKey) return { paymentMethods: [], stripeReady: false };
    const user = await getUserById(request.user.sub);
    if (!user?.stripeCustomerId) return { paymentMethods: [], stripeReady: true };
    const methods = await getStripe().paymentMethods.list({ customer: user.stripeCustomerId, type: 'card' });
    return {
      stripeReady: true,
      paymentMethods: methods.data.map((method) => ({
        id: method.id,
        brand: method.card?.brand ?? 'card',
        last4: method.card?.last4 ?? '••••',
        expMonth: method.card?.exp_month,
        expYear: method.card?.exp_year,
      })),
    };
  });

  app.post('/account/payment-methods/setup-intent', { preHandler: app.authenticate }, async (request, reply) => {
    if (!env.stripeSecretKey) {
      return reply.status(503).send({ message: 'Payments are not configured' });
    }
    const user = await getUserById(request.user.sub);
    if (!user) return reply.status(404).send({ message: 'User not found' });
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await setUserStripeCustomerId(user.id, customerId);
    }
    const setupIntent = await getStripe().setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { userId: user.id },
    });
    return { clientSecret: setupIntent.client_secret };
  });

  app.post('/account/payment-methods/:id/detach', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await getUserById(request.user.sub);
    if (!user?.stripeCustomerId || !env.stripeSecretKey) {
      return reply.status(404).send({ message: 'Payment method not found' });
    }
    try {
      const stripe = getStripe();
      const paymentMethod = await stripe.paymentMethods.retrieve(id);
      const customerId =
        typeof paymentMethod.customer === 'string'
          ? paymentMethod.customer
          : paymentMethod.customer?.id;
      if (customerId !== user.stripeCustomerId) {
        return reply.status(404).send({ message: 'Payment method not found' });
      }
      await stripe.paymentMethods.detach(id);
      return { ok: true };
    } catch {
      return reply.status(404).send({ message: 'Payment method not found' });
    }
  });

  app.get('/account/promos', { preHandler: app.authenticate }, async (request) => {
    const [orders, promos] = await Promise.all([listUserOrders(request.user.sub), listPromos()]);
    const usedAt = new Map<string, string>();
    for (const order of orders) {
      if (order.promoCodeText && order.status === 'PAID') {
        usedAt.set(order.promoCodeText.toUpperCase(), order.paidAt ?? order.createdAt);
      }
    }
    const now = new Date();
    const ready: unknown[] = [];
    const used: unknown[] = [];
    for (const promo of promos) {
      const usedDate = usedAt.get(promo.code);
      const startsAt = promo.startsAt ? new Date(promo.startsAt) : null;
      const expiresAt = promo.expiresAt ?? promo.endsAt;
      const expired = !promo.active || (expiresAt ? new Date(expiresAt) <= now : false);
      const scheduled = startsAt ? startsAt > now : false;
      if (usedDate) {
        used.push({ ...promo, state: 'used', usedAt: usedDate });
      } else if (expired) {
        used.push({ ...promo, state: 'expired' });
      } else if (scheduled) {
        ready.push({ ...promo, state: 'scheduled' });
      } else {
        ready.push({ ...promo, state: 'ready', referral: promo.code.startsWith('WELCOME') });
      }
    }
    return { ready, used };
  });

  app.get('/account/referrals', { preHandler: app.authenticate }, async (request) => {
    const user = await getUserById(request.user.sub);
    const base = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join('')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();
    const code = (base || 'SAHRA').slice(0, 10) + '25';
    return {
      code,
      shareUrl: `https://sahra.app/r/${code}`,
      earnedCents: 0,
      friends: [],
      note: 'Referral tracking is not connected yet; this code is reserved for the invite flow.',
    };
  });

  app.get('/faqs', async () => ({
    categories: [
      {
        name: 'Tickets',
        faqs: [
          { q: 'How do I buy tickets?', a: 'Open an event, choose a ticket tier or venue section, and complete checkout. Your tickets appear in Tickets after payment succeeds.' },
          { q: 'Where are my tickets?', a: 'They live in the Tickets tab as wallet passes with QR codes for the door.' },
        ],
      },
      {
        name: 'Resale',
        faqs: [
          { q: 'How do I sell a ticket I can’t use?', a: 'Open Tickets, tap the event, choose “I can’t go”, pick the tickets, set a price within the organizer’s cap, and list them on the event page.' },
          { q: 'When do I get paid?', a: 'Resale proceeds are tracked in Earnings and release according to the organizer’s payout schedule once payout accounts are connected.' },
          { q: 'What is “Set your price”?', a: 'It lets buyers offer to buy a sold-out ticket automatically if a seller lists at or below their price.' },
          { q: 'Can I cancel a listing?', a: 'Yes, while the listing is active you can cancel it from Tickets and the ticket becomes valid again for you.' },
        ],
      },
      {
        name: 'Payments',
        faqs: [
          { q: 'Which payment methods are supported?', a: 'Checkout uses the payment methods enabled for your region, including cards and wallet payments where available.' },
          { q: 'Are card details stored by Sahra?', a: 'No. Card details are handled by the payment provider, never stored on Sahra servers.' },
        ],
      },
      {
        name: 'Account',
        faqs: [
          { q: 'How do I change my password?', a: 'Use Change password in Profile. Other devices are signed out after a successful change.' },
          { q: 'Can I delete my account?', a: 'Yes, from Edit profile. Deleting removes your login and personal details while preserving required transaction records.' },
        ],
      },
    ],
  }));
}

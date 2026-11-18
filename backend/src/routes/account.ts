import type { FastifyInstance } from 'fastify';
import {
  applyReferralCode,
  createWithdrawal,
  getUserById,
  listBroadcastsForEvents,
  listSellerListings,
  listPromos,
  listUserOffers,
  listUserOrders,
  listUserReferrals,
  listUserTickets,
  listUserWithdrawals,
  setUserStripeConnectAccount,
  setUserStripeCustomerId,
  updateUser,
  updateUserStripeConnectStatus,
  updateWithdrawal,
} from '../db';
import { env } from '../env';
import { getStripe } from '../stripe';

function itemSummary(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

async function earningsSummary(userId: string) {
  const [listingsResult, withdrawals] = await Promise.all([
    listSellerListings(userId, { limit: 100 }),
    listUserWithdrawals(userId),
  ]);
  const listings = listingsResult.items;
  const sold = listings.filter((listing) => listing.status === 'SOLD');
  const nowMs = Date.now();
  const ready = sold.filter((listing) => new Date(listing.eventStartsAt).getTime() <= nowMs);
  const pending = sold.filter((listing) => new Date(listing.eventStartsAt).getTime() > nowMs);
  const withdrawnCents = withdrawals
    .filter((withdrawal) => withdrawal.status === 'PAID')
    .reduce((sum, withdrawal) => sum + withdrawal.amountCents, 0);
  const readyCents = ready.reduce((sum, listing) => sum + listing.priceCents, 0);
  return {
    readyCents,
    pendingCents: pending.reduce((sum, listing) => sum + listing.priceCents, 0),
    lifetimeCents: sold.reduce((sum, listing) => sum + listing.priceCents, 0),
    withdrawnCents,
    availableCents: Math.max(0, readyCents - withdrawnCents),
    sales: sold
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50)
      .map((listing) => ({
        id: listing.ticketCode,
        title: listing.eventTitle,
        subtitle: `${listing.tierName} · ${new Date(listing.eventStartsAt).toLocaleDateString()}${listing.currency && listing.currency !== 'usd' ? ` · ${listing.currency.toUpperCase()}` : ''}`,
        amountCents: listing.priceCents,
        currency: listing.currency ?? 'usd',
        status: new Date(listing.eventStartsAt).getTime() > nowMs ? 'Pending' : 'Ready',
        createdAt: listing.createdAt,
      })),
    withdrawals: withdrawals
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50)
      .map((withdrawal) => ({
        id: withdrawal.id,
        amountCents: withdrawal.amountCents,
        currency: withdrawal.currency,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
      })),
  };
}

export async function accountRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: app.authenticate }, async (request) => {
    const userId = request.user.sub;
    const [ordersResult, ticketsResult, listingsResult, offersResult] = await Promise.all([
      listUserOrders(userId, { limit: 100 }),
      listUserTickets(userId, { limit: 100 }),
      listSellerListings(userId, { limit: 100 }),
      listUserOffers(userId, { limit: 100 }),
    ]);
    const orders = ordersResult.items;
    const tickets = ticketsResult.items;
    const listings = listingsResult.items;
    const offers = offersResult.items;
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

  // PATCH /me/notification-settings — channel (push/email/sms) and category
  // (selling/remind/weekly) toggles. Merged onto the user's notificationPrefs.
  app.patch(
    '/me/notification-settings',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          properties: {
            push: { type: 'boolean' },
            email: { type: 'boolean' },
            sms: { type: 'boolean' },
            selling: { type: 'boolean' },
            remind: { type: 'boolean' },
            weekly: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Record<string, boolean | undefined>;
      const keys = ['push', 'email', 'sms', 'selling', 'remind', 'weekly'] as const;
      const current = (await getUserById(request.user.sub))?.notificationPrefs ?? {};
      const merged = { ...current };
      for (const k of keys) {
        if (typeof body[k] === 'boolean') merged[k] = body[k];
      }
      const user = await updateUser(request.user.sub, { notificationPrefs: merged });
      if (!user) return reply.status(404).send({ message: 'User not found' });
      return { notificationPrefs: user.notificationPrefs };
    }
  );

  app.get('/transactions', { preHandler: app.authenticate }, async (request) => {
    const [ordersResult, listingsResult] = await Promise.all([
      listUserOrders(request.user.sub, { limit: 200 }),
      listSellerListings(request.user.sub, { limit: 200 }),
    ]);
    const orders = ordersResult.items;
    const listings = listingsResult.items;
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
          currency: order.currency ?? 'usd',
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
          currency: listing.currency ?? 'usd',
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
    return earningsSummary(request.user.sub);
  });

  // POST /account/payouts/onboarding-link · Stripe Express onboarding for the
  // seller's payout account. Returns a hosted onboarding URL.
  app.post('/account/payouts/onboarding-link', { preHandler: app.authenticate }, async (request, reply) => {
    if (!env.stripeSecretKey) {
      return reply.status(503).send({ message: 'Payments are not configured' });
    }
    const user = await getUserById(request.user.sub);
    if (!user) return reply.status(404).send({ message: 'User not found' });
    const stripe = getStripe();
    let accountId = user.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: { transfers: { requested: true } },
        business_profile: { name: `${user.firstName} ${user.lastName}`.trim() || user.email },
        email: user.email,
        metadata: { userId: user.id },
      });
      accountId = account.id;
      await setUserStripeConnectAccount(user.id, accountId);
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${env.publicWebUrl}/account/earnings?onboarding=refresh`,
      return_url: `${env.publicWebUrl}/account/earnings?onboarding=complete`,
      type: 'account_onboarding',
    });
    return { url: link.url };
  });

  // GET /account/payouts, current Connect account status.
  app.get('/account/payouts', { preHandler: app.authenticate }, async (request) => {
    const user = await getUserById(request.user.sub);
    if (!user?.stripeConnectAccountId || !env.stripeSecretKey) {
      return { connected: false, onboardingRequired: true };
    }
    const account = await getStripe().accounts.retrieve(user.stripeConnectAccountId);
    await updateUserStripeConnectStatus(user.id, {
      detailsSubmitted: account.details_submitted ?? false,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
    });
    return {
      connected: true,
      detailsSubmitted: account.details_submitted ?? false,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      dashboardUrl: `https://connect.stripe.com/express/${account.id}`,
    };
  });

  // POST /account/payouts/refresh, re-check onboarding status after return.
  app.post('/account/payouts/refresh', { preHandler: app.authenticate }, async (request) => {
    const user = await getUserById(request.user.sub);
    if (!user?.stripeConnectAccountId || !env.stripeSecretKey) {
      return { connected: false };
    }
    const account = await getStripe().accounts.retrieve(user.stripeConnectAccountId);
    await updateUserStripeConnectStatus(user.id, {
      detailsSubmitted: account.details_submitted ?? false,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
    });
    return {
      connected: true,
      detailsSubmitted: account.details_submitted ?? false,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
    };
  });

  // POST /account/withdraw, transfer available earnings to the seller's
  // connected Stripe account.
  app.post(
    '/account/withdraw',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['amountCents'],
          properties: {
            amountCents: { type: 'integer', minimum: 100 },
            currency: { type: 'string', pattern: '^[a-zA-Z]{3}$' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!env.stripeSecretKey) {
        return reply.status(503).send({ message: 'Payments are not configured' });
      }
      const { amountCents, currency } = request.body as { amountCents: number; currency?: string };
      const user = await getUserById(request.user.sub);
      if (!user) return reply.status(404).send({ message: 'User not found' });
      if (!user.stripeConnectAccountId || !user.stripeConnectPayoutsEnabled) {
        return reply.status(400).send({ message: 'Payout account onboarding is not complete', payoutsEnabled: false });
      }
      const summary = await earningsSummary(user.id);
      const normalizedCurrency = (currency ?? 'usd').toLowerCase();
      if (summary.availableCents < amountCents) {
        return reply.status(400).send({ message: 'Amount exceeds available earnings', availableCents: summary.availableCents });
      }
      const withdrawal = await createWithdrawal({
        userId: user.id,
        amountCents,
        currency: normalizedCurrency,
      });
      try {
        const transfer = await getStripe().transfers.create(
          {
            amount: amountCents,
            currency: normalizedCurrency,
            destination: user.stripeConnectAccountId,
            metadata: { withdrawalId: withdrawal.id, userId: user.id },
          },
          { idempotencyKey: `withdraw-${withdrawal.id}` }
        );
        await updateWithdrawal(withdrawal.id, { status: 'PAID', stripePayoutId: transfer.id });
        return { ok: true, withdrawalId: withdrawal.id, status: 'PAID' };
      } catch (err) {
        await updateWithdrawal(withdrawal.id, { status: 'FAILED' });
        app.log.error(err, `withdrawal transfer failed for ${withdrawal.id}`);
        return reply.status(502).send({ message: 'Payout transfer failed; please try again' });
      }
    }
  );

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
    const [ordersResult, promos] = await Promise.all([
      listUserOrders(request.user.sub, { limit: 200 }),
      listPromos(),
    ]);
    const orders = ordersResult.items;
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
    if (!user) return { code: '', shareUrl: '', earnedCents: 0, friends: [], bonusCents: env.referralBonusCents };
    const referrals = await listUserReferrals(user.id);
    return {
      code: user.referralCode ?? '',
      shareUrl: user.referralCode ? `${env.publicWebUrl}/r/${user.referralCode}` : '',
      earnedCents: 0,
      bonusCents: env.referralBonusCents,
      referredByCode: user.referredByCode,
      friends: referrals.map((referral) => ({
        id: referral.referredUserId,
        joinedAt: referral.createdAt,
      })),
      friendCount: referrals.length,
    };
  });

  // POST /account/referrals/apply, existing users can enter a referral code.
  app.post(
    '/account/referrals/apply',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['code'],
          properties: { code: { type: 'string', minLength: 4, maxLength: 20 } },
        },
      },
    },
    async (request, reply) => {
      const { code } = request.body as { code: string };
      const user = await getUserById(request.user.sub);
      if (!user) return reply.status(404).send({ message: 'User not found' });
      const applied = await applyReferralCode(user.id, code.trim());
      if (!applied) {
        return reply.status(400).send({ message: 'Referral code is invalid or already used' });
      }
      return { ok: true };
    }
  );

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
          { q: 'When do I get paid?', a: 'Resale proceeds collect in Earnings once the event has passed. Withdraw them to your connected payout account.' },
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

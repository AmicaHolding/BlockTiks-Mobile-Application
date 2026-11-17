// Seeds a realistic demo dataset through the real data layer (src/db.ts), so
// seeded rows have exactly the shape the API writes. No Stripe calls: paid
// orders are fulfilled with fake PaymentIntent ids.
//
//   npm run db:seed            seed local DynamoDB (skips if already seeded)
//   npm run db:reset           wipe every item, then seed
//
// Remote tables (no DYNAMODB_ENDPOINT) require SEED_ALLOW_REMOTE=1, and a
// remote reset also requires RESET_CONFIRM=<table name>.
import { BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../src/aws';
import {
  applyReferralCode,
  createEventWithTiers,
  createListing,
  createOffer,
  createPendingOrder,
  createPromo,
  createUser,
  deleteExpireIndex,
  fulfillOrder,
  getOrder,
  getUserByEmail,
  publishEvent,
  registerReferralCode,
  reserveTickets,
  setVenueLayout,
  type EventItem,
  type TicketTier,
  type User,
} from '../src/db';
import { env } from '../src/env';
import { hashPassword } from '../src/passwords';
import { ensureTable, isLocal, target } from './table';

export const SEED_PASSWORD = 'password123';

export const SEED_USERS = [
  { key: 'creator', email: 'creator@test.com', firstName: 'Demo', lastName: 'Creator', role: 'CREATOR' },
  { key: 'creator2', email: 'layla@test.com', firstName: 'Layla', lastName: 'Haddad', role: 'CREATOR' },
  { key: 'fan', email: 'fan@test.com', firstName: 'Sam', lastName: 'Rivera', role: 'FAN' },
  { key: 'fan2', email: 'noor@test.com', firstName: 'Noor', lastName: 'Ali', role: 'FAN' },
] as const;

type UserKey = (typeof SEED_USERS)[number]['key'];

const daysFromNow = (days: number, hourUtc = 19) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d.toISOString();
};

async function clearAllItems(): Promise<number> {
  let deleted = 0;
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await docClient.send(
      new ScanCommand({
        TableName: env.tableName,
        ProjectionExpression: 'pk, sk',
        ExclusiveStartKey,
      })
    );
    const keys = (page.Items ?? []).map((i) => ({ pk: i.pk, sk: i.sk }));
    for (let i = 0; i < keys.length; i += 25) {
      let requests = keys.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } }));
      while (requests.length > 0) {
        const res = await docClient.send(
          new BatchWriteCommand({ RequestItems: { [env.tableName]: requests } })
        );
        requests = (res.UnprocessedItems?.[env.tableName] ?? []) as typeof requests;
      }
    }
    deleted += keys.length;
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return deleted;
}

async function buy(
  buyer: User,
  event: EventItem,
  tier: TicketTier,
  quantity: number,
  promo?: { code: string; percentOff: number }
): Promise<string[]> {
  if (!(await reserveTickets(event.id, tier.id, quantity))) {
    throw new Error(`Seed: not enough inventory on ${event.title} / ${tier.name}`);
  }
  const subtotalCents = tier.priceCents * quantity;
  const discountCents = promo ? Math.round((subtotalCents * promo.percentOff) / 100) : 0;
  const feesCents = Math.round(((subtotalCents - discountCents) * env.platformFeePercent) / 100);
  const order = await createPendingOrder({
    userId: buyer.id,
    eventId: event.id,
    items: [{ tierId: tier.id, tierName: tier.name, quantity, unitPriceCents: tier.priceCents }],
    subtotalCents,
    discountCents,
    feesCents,
    totalCents: subtotalCents - discountCents + feesCents,
    promoCodeText: promo?.code,
    currency: event.currency,
    expiresAt: new Date(Date.now() + env.reservationTtlMinutes * 60_000).toISOString(),
  });
  await fulfillOrder(order.id, `pi_seed_${order.id.slice(0, 8)}`);
  await deleteExpireIndex(order.id);
  const paid = await getOrder(order.id);
  return paid?.ticketCodes ?? [];
}

export async function seed(): Promise<{ skipped: boolean }> {
  if (await getUserByEmail(SEED_USERS[0].email)) return { skipped: true };

  const users = {} as Record<UserKey, User>;
  const passwordHash = hashPassword(SEED_PASSWORD);
  for (const u of SEED_USERS) {
    const user = await createUser({
      email: u.email,
      passwordHash,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
    });
    if (user.referralCode) await registerReferralCode(user.id, user.referralCode);
    users[u.key] = user;
  }
  await applyReferralCode(users.fan2.id, users.fan.referralCode!);

  const creator = users.creator;
  const neon = await createEventWithTiers({
    creatorId: creator.id,
    title: 'Neon Nights Festival',
    description: 'An all-night electronic music festival featuring live sets and immersive visuals.',
    category: 'Music',
    startsAt: daysFromNow(18, 20),
    location: 'Riverside Arena',
    address: '123 Harbor St',
    tiers: [
      { name: 'General Admission', priceCents: 4500, quantity: 200 },
      { name: 'VIP', description: 'Fast-lane entry and lounge access', priceCents: 12000, quantity: 50 },
    ],
  });
  const rooftop = await createEventWithTiers({
    creatorId: creator.id,
    title: 'Rooftop Sessions',
    description: 'Intimate live music sessions on the rooftop every Friday.',
    category: 'Concerts',
    startsAt: daysFromNow(10),
    location: 'Skyline Lounge',
    tiers: [{ name: 'Entry', priceCents: 2500, quantity: 80 }],
  });
  const mixer = await createEventWithTiers({
    creatorId: creator.id,
    title: 'Founders Mixer',
    description: 'Meet founders, operators and investors over coffee and short talks.',
    category: 'Networking',
    startsAt: daysFromNow(25, 17),
    location: 'The Hub Coworking',
    tiers: [
      { name: 'Early Bird', priceCents: 1500, quantity: 30 },
      { name: 'Standard', priceCents: 2500, quantity: 70 },
    ],
  });
  const comedy = await createEventWithTiers({
    creatorId: users.creator2.id,
    title: 'Comedy Night Live',
    description: 'Five stand-up comics, one stage. Assigned seating.',
    category: 'Comedy',
    startsAt: daysFromNow(7, 21),
    location: 'Grand Theatre',
    tiers: [{ name: 'Standing', priceCents: 3000, quantity: 40 }],
  });
  await setVenueLayout(comedy.event.id, users.creator2.id, 'CREATOR', {
    sections: [
      { id: 'orchestra', name: 'Orchestra', priceCents: 9000, capacity: 50, rows: 5, seatsPerRow: 10, accessibleCount: 2 },
      { id: 'balcony', name: 'Balcony', priceCents: 5000, capacity: 40, rows: 4, seatsPerRow: 10, heldCount: 2 },
    ],
  });
  // Left as DRAFT so Studio shows an unpublished event.
  await createEventWithTiers({
    creatorId: creator.id,
    title: 'Winter Art Fair',
    description: 'Local artists, live painting and a pop-up gallery.',
    category: 'Arts',
    startsAt: daysFromNow(40, 12),
    location: 'Old Town Market',
    tiers: [{ name: 'Day Pass', priceCents: 1000, quantity: 300 }],
  });
  for (const e of [neon, rooftop, mixer, comedy]) {
    await publishEvent(e.event.id, e.event.creatorId, 'CREATOR');
  }

  await createPromo({
    code: 'WELCOME10',
    creatorId: creator.id,
    scope: 'ALL',
    kind: 'PERCENT',
    value: 10,
    percentOff: 10,
    maxUses: 100,
    usedCount: 0,
    active: true,
  });

  const [neonGa, neonVip] = neon.tiers;
  const fanGa = await buy(users.fan, neon.event, neonGa, 2);
  await buy(users.fan, neon.event, neonVip, 1);
  await buy(users.fan, rooftop.event, rooftop.tiers[0], 1);
  await buy(users.fan2, rooftop.event, rooftop.tiers[0], 2, { code: 'WELCOME10', percentOff: 10 });
  await buy(users.fan2, mixer.event, mixer.tiers[0], 1);

  await createListing({ sellerId: users.fan.id, ticketCode: fanGa[0], priceCents: 6000 });
  await createOffer({
    buyerId: users.fan2.id,
    eventId: neon.event.id,
    tierName: neonVip.name,
    maxPriceCents: 10000,
    quantity: 1,
  });

  return { skipped: false };
}

async function main() {
  const reset = process.argv.includes('--reset');
  // Never seed production data with public demo credentials. Table names get
  // a plain substring check (destructive resets must not slip through names
  // like 'prodblue'); profiles only match 'prod' as a separate word so
  // 'nonprod' doesn't false-positive.
  if (!isLocal()) {
    const isProdWord = (v: string) => /(^|[^a-z])(prod|production)([^a-z]|$)/i.test(v);
    const profile = process.env.AWS_PROFILE ?? '';
    if (env.tableName.toLowerCase().includes('prod') || (profile && isProdWord(profile))) {
      throw new Error('Refusing to seed a production table.');
    }
  }
  if (!isLocal() && process.env.SEED_ALLOW_REMOTE !== '1') {
    throw new Error(
      `Refusing to seed ${target()} — set DYNAMODB_ENDPOINT for local, or SEED_ALLOW_REMOTE=1 for a remote dev/staging table.`
    );
  }
  if (reset && !isLocal() && process.env.RESET_CONFIRM !== env.tableName) {
    throw new Error(`Refusing to wipe remote table — set RESET_CONFIRM=${env.tableName} to confirm.`);
  }

  console.log(`==> Target: ${target()}`);
  if ((await ensureTable()) === 'created') console.log('    created table');
  if (reset) console.log(`    wiped ${await clearAllItems()} items`);

  const { skipped } = await seed();
  if (skipped) {
    console.log('    already seeded (run `npm run db:reset` to wipe and reseed)');
    return;
  }
  console.log('    seeded 4 users, 5 events (1 draft, 1 seated), 7 tickets, 1 resale listing, 1 offer, 1 promo');
  console.log(`\n    Accounts (password: ${SEED_PASSWORD})`);
  for (const u of SEED_USERS) console.log(`      ${u.role.padEnd(7)} ${u.email}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

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
  createOrg,
  createPendingOrder,
  createPromo,
  createInvite,
  createInviteRsvp,
  createUser,
  markInviteSeen,
  deleteExpireIndex,
  fulfillOrder,
  getOrder,
  getUserByEmail,
  inviteMember,
  linkEventToOrg,
  listPublishedEvents,
  publishEvent,
  registerReferralCode,
  reserveTickets,
  acceptMembership,
  listInvitesForEmail,
  setEventHost,
  setOrgPayoutAccount,
  setOrgVerificationStatus,
  setVenueLayout,
  submitOrgVerification,
  type EventItem,
  type TicketTier,
  type User,
} from '../src/db';
import { env } from '../src/env';
import { ensureTable, isLocal, target } from './table';

// No passwords (v2): sign in with POST /auth/otp/start {contact} then
// /auth/otp/verify with the code logged by the server, or OTP_DEV_CODE
// (default 000000) whenever the backend runs against DynamoDB Local.
export const SEED_OTP_CODE = env.otpDevCode;

export const SEED_USERS = [
  { key: 'creator', email: 'creator@test.com', firstName: 'Demo', lastName: 'Creator', role: 'CREATOR' },
  { key: 'creator2', email: 'layla@test.com', firstName: 'Layla', lastName: 'Haddad', role: 'CREATOR' },
  { key: 'fan', email: 'fan@test.com', phone: '+971500000001', firstName: 'Sam', lastName: 'Rivera', role: 'FAN' },
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
    const keys = (page.Items ?? []).map((i: Record<string, unknown>) => ({ pk: i.pk, sk: i.sk }));
    for (let i = 0; i < keys.length; i += 25) {
      let requests = keys.slice(i, i + 25).map((Key: Record<string, unknown>) => ({ DeleteRequest: { Key } }));
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
  const verifiedAt = new Date().toISOString();
  for (const u of SEED_USERS) {
    const phone = 'phone' in u ? u.phone : undefined;
    const user = await createUser({
      email: u.email,
      phone,
      emailVerifiedAt: verifiedAt,
      phoneVerifiedAt: phone ? verifiedAt : undefined,
      name: `${u.firstName} ${u.lastName}`,
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

  // 4900 sits under the 110% resale cap on the 4500-face GA ticket (cap 4950).
  await createListing({ sellerId: users.fan.id, ticketCode: fanGa[0], priceCents: 4900 });
  await createOffer({
    buyerId: users.fan2.id,
    eventId: neon.event.id,
    tierName: neonVip.name,
    maxPriceCents: 10000,
    quantity: 1,
  });

  // --- Org/Studio demo (additive): creator owns "Noor Events", layla is a
  // cohost member, org is verified + has a payout IBAN, and one event is
  // org-owned so Studio/door flows have real data. ---
  const org = await createOrg({
    name: 'Noor Events',
    type: 'promoter',
    city: 'Dubai',
    createdByUserId: creator.id,
  });
  await submitOrgVerification(org.id, {
    legalName: 'Noor Events LLC',
    licenceNo: 'DED-12345',
    docs: ['trade-licence.pdf'],
  });
  await setOrgVerificationStatus(org.id, 'approved');
  await setOrgPayoutAccount(org.id, { iban: 'AE070331234567890123456', holder: 'Noor Events LLC' });
  const invite = await inviteMember({
    orgId: org.id,
    email: users.creator2.email!,
    role: 'cohost',
    invitedBy: creator.id,
  });
  await acceptMembership(invite.id, users.creator2.id);
  const orgEvent = await createEventWithTiers({
    creatorId: creator.id,
    ownerOrgId: org.id,
    title: 'Desert Sessions',
    description: 'Open-air desert rave under the stars.',
    category: 'Music',
    startsAt: daysFromNow(45, 22),
    location: 'Al Marmoom',
    tiers: [{ name: 'GA', priceCents: 20000, quantity: 100 }],
  });
  await linkEventToOrg(orgEvent.event.id, org.id);
  await setEventHost({ eventId: orgEvent.event.id, orgId: org.id, role: 'owner', splitBps: 10000 });
  await publishEvent(orgEvent.event.id, creator.id, 'CREATOR');

  await seedExtraEvents(creator, users.creator2);

  // Personal invites (v2): Noor hosts a dinner, Sam is going, the creator
  // opened the link without answering (shows under "Waiting on you").
  const dinner = await createInvite({
    hostUserId: users.fan2.id,
    title: 'Rooftop dinner at Noor\'s',
    startsAt: daysFromNow(5, 16),
    tz: 'Asia/Dubai',
    placeText: 'Marina Gate 2, Apt 3104',
    area: 'Dubai Marina',
    cover: { tone: 'gold' },
    note: 'Bring something sweet.',
    approveGuests: false,
    allowPlusOnes: true,
    guestCap: 12,
    showGuestList: true,
    hideAddressUntilGoing: true,
  });
  await createInviteRsvp(dinner, users.fan.id, { status: 'going', plusOnes: 1 });
  await markInviteSeen(dinner, users.creator.id);
  const games = await createInvite({
    hostUserId: users.fan.id,
    title: 'Board games night',
    startsAt: daysFromNow(9, 17),
    tz: 'Asia/Dubai',
    placeText: 'JLT Cluster D, 1402',
    area: 'JLT',
    approveGuests: true,
    allowPlusOnes: false,
    guestCap: null,
    showGuestList: false,
    hideAddressUntilGoing: false,
  });
  await createInviteRsvp(games, users.fan2.id, { status: 'requested', plusOnes: 0 });

  return { skipped: false };
}

// Three extra published events (also runnable standalone via `--more`).
// Skips titles that already exist so it is safe to re-run.
export async function seedExtraEvents(creator: User, creator2: User): Promise<number> {
  const published = await listPublishedEvents({ limit: 100 });
  const existing = new Set(published.items.map((e) => e.event.title));
  const defs: Parameters<typeof createEventWithTiers>[0][] = [
    {
      creatorId: creator.id,
      title: 'Sahra Comedy Club: Arabic Stand-Up',
      description: 'A bilingual stand-up night with the region\'s sharpest comics.',
      category: 'Comedy',
      startsAt: daysFromNow(3, 21),
      location: 'The Laughter Factory, JBR',
      address: 'Jumeirah Beach Residence',
      country: 'AE',
      venueTimezone: 'Asia/Dubai',
      currency: 'aed',
      tiers: [
        { name: 'Standard', priceCents: 9500, quantity: 120 },
        { name: 'Front Row', priceCents: 15000, quantity: 24 },
      ],
    },
    {
      creatorId: creator2.id,
      title: 'Sunset Dhow Cruise Sessions',
      description: 'Live acoustic sets aboard a traditional dhow at golden hour.',
      category: 'Concerts',
      startsAt: daysFromNow(5, 18),
      location: 'Abu Dhabi Corniche Marina',
      country: 'AE',
      venueTimezone: 'Asia/Dubai',
      currency: 'aed',
      tiers: [
        { name: 'Deck', priceCents: 18000, quantity: 60 },
        { name: 'Upper Deck', description: 'Open seating with dinner', priceCents: 28000, quantity: 40 },
      ],
    },
    {
      creatorId: creator.id,
      title: 'Bassment Riyadh: Warehouse Night',
      description: 'Underground warehouse rave, international headliner TBA. 21+ only, ID at the door.',
      category: 'Music',
      startsAt: daysFromNow(12, 23),
      doorsAt: daysFromNow(12, 22),
      location: 'Warehouse 7, Industrial City',
      country: 'SA',
      venueTimezone: 'Asia/Riyadh',
      currency: 'sar',
      minAge: 21,
      tiers: [
        { name: 'Early Entry', priceCents: 12000, quantity: 150 },
        { name: 'Regular', priceCents: 18000, quantity: 250 },
      ],
    },
  ];
  let created = 0;
  for (const def of defs) {
    if (existing.has(def.title)) continue;
    const e = await createEventWithTiers(def);
    await publishEvent(e.event.id, def.creatorId, 'CREATOR');
    created++;
  }
  return created;
}

async function main() {
  const reset = process.argv.includes('--reset');
  const more = process.argv.includes('--more');
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
      `Refusing to seed ${target()}, set DYNAMODB_ENDPOINT for local, or SEED_ALLOW_REMOTE=1 for a remote dev/staging table.`
    );
  }
  if (reset && !isLocal() && process.env.RESET_CONFIRM !== env.tableName) {
    throw new Error(`Refusing to wipe remote table, set RESET_CONFIRM=${env.tableName} to confirm.`);
  }

  console.log(`==> Target: ${target()}`);
  if ((await ensureTable()) === 'created') console.log('    created table');
  if (reset) console.log(`    wiped ${await clearAllItems()} items`);

  if (more) {
    const creator = await getUserByEmail('creator@test.com');
    const creator2 = await getUserByEmail('layla@test.com');
    if (!creator || !creator2) {
      throw new Error('Base seed not present, run `npm run db:seed` first.');
    }
    const created = await seedExtraEvents(creator, creator2);
    console.log(created > 0 ? `    added ${created} extra events` : '    extra events already present');
    return;
  }

  const { skipped } = await seed();
  if (skipped) {
    console.log('    already seeded (run `npm run db:reset` to wipe and reseed)');
    return;
  }
  console.log('    seeded 4 users, 9 events (1 draft, 1 seated, 1 org-owned, 1 age-gated), 7 tickets, 1 resale listing, 1 offer, 1 promo, 1 org (verified, payout IBAN, cohost member)');
  console.log('    + 2 personal invites (Noor hosts a dinner; Sam hosts games night with approval on)');
  console.log(`\n    Accounts (no passwords; sign in with a one-time code, dev code: ${SEED_OTP_CODE})`);
  for (const u of SEED_USERS) console.log(`      ${u.role.padEnd(7)} ${u.email}${'phone' in u ? `  ${u.phone}` : ''}`);
  console.log('\n    POST /auth/otp/start {"contact":"fan@test.com"} -> POST /auth/otp/verify {"challenge_id","code":"' + SEED_OTP_CODE + '"}');
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

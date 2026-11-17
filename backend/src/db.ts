// DynamoDB single-table data layer for BlockTiks.
//
// Table: blocktiks (pk: String, sk: String)
// GSI1 (gsi1pk/gsi1sk): global feeds — currently the published-events feed.
// GSI2 (gsi2pk/gsi2sk): per-user/owner collections (creator events, orders, tickets).
//
// Key scheme:
//   USER#<id>            / PROFILE            user profile
//   USER#EMAIL#<email>   / ID                 email -> userId lookup
//   EVENT#<id>           / METADATA           event (+ gsi1 feed keys when PUBLISHED,
//                                             + gsi2 creator keys always)
//   EVENT#<id>           / TIER#<tierId>      ticket tier
//   ORDER#<id>           / METADATA           order (+ gsi2 user-orders keys)
//   ORDER#<id>           / ITEM#<tierId>      order line item
//   PI#<paymentIntentId> / ORDER              stripe PI -> orderId (webhook lookup)
//   TICKET#<code>        / METADATA           ticket (+ gsi2 user-tickets keys,
//                                             denormalized display attrs)
//   PROMO#<CODE>         / METADATA           promo code
//   EXPIRE#<orderId>     / INDEX              pending-order expiry index
//                                             (gsi1pk='EXPIRE', gsi1sk=expiresAt)
//
// Inventory model: each tier keeps `sold` and `available` counters where
// available = quantity - sold - reserved. Ordering reserves `available`
// atomically (ConditionExpression); payment success converts the hold to
// `sold`; failure/expiry credits `available` back. Exactly-once via the
// order status condition inside the same transaction.

import {
    BatchGetCommand,
    DeleteCommand,
    GetCommand,
    PutCommand,
    QueryCommand,
    TransactWriteCommand,
    UpdateCommand,
    type TransactWriteCommandInput
} from '@aws-sdk/lib-dynamodb';
import { createHash, randomInt, randomUUID } from 'crypto';
import { docClient } from './aws';
import { env } from './env';

const T = () => env.tableName;
const now = () => new Date().toISOString();

// ---------- key helpers ----------
const userPk = (id: string) => `USER#${id}`;
const emailPk = (email: string) => `USER#EMAIL#${email.toLowerCase()}`;
const eventPk = (id: string) => `EVENT#${id}`;
const orderPk = (id: string) => `ORDER#${id}`;
const ticketPk = (code: string) => `TICKET#${code}`;
const promoPk = (code: string) => `PROMO#${code.toUpperCase()}`;
const expirePk = (orderId: string) => `EXPIRE#${orderId}`;

const EVENT_FEED_PK = 'EVENTS#PUBLISHED';
const EXPIRE_GSI_PK = 'EXPIRE';
const eventFeedSk = (startsAt: string) => `STARTS#${startsAt}`;
const creatorPk = (creatorId: string) => `CREATOR#${creatorId}`;
const userOrdersPk = (userId: string) => `USER#${userId}#ORDERS`;
const userTicketsPk = (userId: string) => `USER#${userId}#TICKETS`;
const userListingsPk = (userId: string) => `USER#${userId}#LISTINGS`;
// GSI1 feed of every ticket issued for an event — powers the creator guest
// list / door check-in. Distinct namespace from EVENTS#PUBLISHED.
const eventTicketsGsiPk = (eventId: string) => `EVENTTIX#${eventId}`;
const ACTIVE_LISTINGS_GSI_PK = 'LISTINGS#ACTIVE';
const listingGsiSk = (eventId: string, iso: string) => `EVENT#${eventId}#${iso}`;
const listingPk = (ticketCode: string) => `LISTING#${ticketCode}`;
const offerPk = (id: string) => `OFFER#${id}`;
const userOffersPk = (userId: string) => `USER#${userId}#OFFERS`;
const ACTIVE_OFFERS_GSI_PK = 'OFFERS#ACTIVE';
const offerGsiSk = (eventId: string, tierKey: string, iso: string, id: string) =>
  `EVENT#${eventId}#${tierKey}#${iso}#${id}`;
const createdSk = (iso: string, id: string) => `CREATED#${iso}#${id}`;
const refreshPk = (tokenHash: string) => `REFRESH#${tokenHash}`;
const verifyPk = (tokenHash: string) => `VERIFY#${tokenHash}`;
const seatSk = (sectionId: string, seatLabel: string) => `SEAT#${sectionId}#${seatLabel}`;
const withdrawalPk = (id: string) => `WITHDRAW#${id}`;

// ---------- types ----------
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: 'FAN' | 'CREATOR' | 'ADMIN';
  stripeCustomerId?: string;
  stripeConnectAccountId?: string;
  stripeConnectDetailsSubmitted?: boolean;
  stripeConnectChargesEnabled?: boolean;
  stripeConnectPayoutsEnabled?: boolean;
  firstNameAr?: string;
  city?: string;
  interests?: string[];
  dateOfBirth?: string;
  emailVerified?: boolean;
  notificationPrefs?: { push?: boolean; email?: boolean; sms?: boolean };
  referralCode?: string;
  referredByCode?: string;
  referralCount?: number;
  deletedAt?: string;
  createdAt: string;
}

export interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  priceCents: number;
  quantity: number;
  sold: number;
  available?: number; // quantity - sold - reserved; absent on legacy items
  saleStartsAt?: string;
  saleEndsAt?: string;
}

export interface VenueSection {
  id: string;
  name: string;
  priceCents: number;
  capacity: number;
  rows?: number;
  seatsPerRow?: number;
  accessibleCount?: number;
  heldCount?: number;
}

export interface VenueLayout {
  sections: VenueSection[];
}

export interface EventItem {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  category: string;
  startsAt: string;
  endsAt?: string;
  location: string;
  address?: string;
  imageUrl?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  venueLayout?: VenueLayout;
  // ISO 4217 currency for all prices on this event (default 'usd').
  currency?: string;
  createdAt: string;
}

export interface PromoCode {
  code: string;
  creatorId?: string;
  eventId?: string;
  tierId?: string;
  tierName?: string;
  scope?: 'ALL' | 'EVENT' | 'TIER';
  kind?: 'PERCENT' | 'FIXED';
  value?: number; // percent for PERCENT, cents for FIXED
  percentOff?: number;
  amountOffCents?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  startsAt?: string;
  expiresAt?: string;
  endsAt?: string;
  validOnResale?: boolean;
  usedCount: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  tierId?: string;
  tierName: string;
  quantity: number;
  unitPriceCents: number;
  // Seated orders: which venue section the tickets are for.
  sectionId?: string;
  sectionName?: string;
  // Resale orders: the ticket code being transferred.
  ticketCode?: string;
  // Seated orders with seat-level picking: seat labels aligned with quantity.
  seatLabels?: string[];
}

export type OrderKind = 'TICKET' | 'RESALE' | 'SEATED';

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  kind?: OrderKind; // absent on legacy rows = TICKET
  listingCode?: string; // RESALE: ticket code being bought
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  subtotalCents: number;
  discountCents: number;
  feesCents: number;
  totalCents: number;
  promoCodeText?: string;
  stripePaymentIntentId?: string;
  ticketCodes?: string[];
  currency?: string;
  expiresAt?: string; // reservation expiry for PENDING orders
  createdAt: string;
  paidAt?: string;
}

export interface Ticket {
  code: string;
  orderId: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventLocation: string;
  tierId?: string; // absent on seated tickets (sectionName used instead)
  tierName: string;
  sectionName?: string; // seated events
  seatLabel?: string; // seat-level booking (e.g. "A-12")
  currency?: string;
  userId: string;
  status: 'VALID' | 'USED' | 'TRANSFERRED' | 'REFUNDED';
  checkedInAt?: string;
  transferredFrom?: string;
  transferredTo?: string;
  transferredAt?: string;
  createdAt: string;
}

export class EmailExistsError extends Error {}
export class ConditionFailedError extends Error {}

function isConditionalCheck(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    ((e as { name?: string }).name === 'ConditionalCheckFailedException' ||
      (e as { name?: string }).name === 'TransactionCanceledException')
  );
}

async function batchGet<T = Record<string, unknown>>(keys: { pk: string; sk: string }[]): Promise<T[]> {
  const items: T[] = [];
  for (let i = 0; i < keys.length; i += 100) {
    let requestItems: Record<string, { Keys: { pk: string; sk: string }[] }> = {
      [T()]: { Keys: keys.slice(i, i + 100) },
    };
    while (Object.keys(requestItems).length > 0) {
      const res = await docClient.send(
        new BatchGetCommand({ RequestItems: requestItems })
      );
      items.push(...((res.Responses?.[T()] ?? []) as T[]));
      requestItems = (res.UnprocessedKeys ?? {}) as typeof requestItems;
    }
  }
  return items;
}

// ---------- users ----------

function generateReferralCode(firstName: string, lastName: string, id: string): string {
  const base = `${firstName}${lastName}`.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  return `${base || 'SAHRA'}${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'FAN' | 'CREATOR';
  referredByCode?: string;
}): Promise<User> {
  const id = randomUUID();
  const createdAt = now();
  const referralCode = generateReferralCode(input.firstName, input.lastName, id);
  const user: User = {
    id,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: input.role,
    referralCode,
    referredByCode: input.referredByCode,
    referralCount: 0,
    createdAt,
  };
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: T(),
              Item: { pk: emailPk(user.email), sk: 'ID', userId: id, createdAt },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          {
            Put: {
              TableName: T(),
              Item: { pk: userPk(id), sk: 'PROFILE', ...user },
            },
          },
        ],
      })
    );
  } catch (e) {
    if (isConditionalCheck(e)) throw new EmailExistsError();
    throw e;
  }
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: userPk(id), sk: 'PROFILE' } })
  );
  return (res.Item as User | undefined) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: emailPk(email), sk: 'ID' } })
  );
  const userId = res.Item?.userId as string | undefined;
  return userId ? getUserById(userId) : null;
}

export async function updateUser(
  id: string,
  fields: Partial<
    Pick<
      User,
      | 'firstName'
      | 'lastName'
      | 'phone'
      | 'avatarUrl'
      | 'firstNameAr'
      | 'city'
      | 'interests'
      | 'dateOfBirth'
      | 'emailVerified'
      | 'notificationPrefs'
    >
  >
): Promise<User | null> {
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const sets: string[] = [];
  let i = 0;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const name = `#f${i}`;
    names[name] = key;
    sets.push(`${name} = :v${i}`);
    values[`:v${i}`] = value;
    i++;
  }
  if (sets.length === 0) return getUserById(id);
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: userPk(id), sk: 'PROFILE' },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk)',
    })
  );
  return getUserById(id);
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: userPk(id), sk: 'PROFILE' },
      UpdateExpression: 'SET passwordHash = :h',
      ExpressionAttributeValues: { ':h': passwordHash },
      ConditionExpression: 'attribute_exists(pk)',
    })
  );
}

// ---------- events & tiers ----------

export async function createEventWithTiers(input: {
  creatorId: string;
  title: string;
  description: string;
  category: string;
  startsAt: string;
  endsAt?: string;
  location: string;
  address?: string;
  imageUrl?: string;
  currency?: string;
  tiers: { name: string; description?: string; priceCents: number; quantity: number }[];
}): Promise<{ event: EventItem; tiers: TicketTier[] }> {
  const id = randomUUID();
  const createdAt = now();
  const currency = (input.currency ?? 'usd').toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) throw new ConditionFailedError('Invalid currency');
  const event: EventItem = {
    id,
    creatorId: input.creatorId,
    title: input.title,
    description: input.description,
    category: input.category,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    location: input.location,
    address: input.address,
    imageUrl: input.imageUrl,
    status: 'DRAFT',
    currency,
    createdAt,
  };
  const tiers: TicketTier[] = (input.tiers ?? []).map((t) => ({
    id: randomUUID(),
    eventId: id,
    name: t.name,
    description: t.description,
    priceCents: t.priceCents,
    quantity: t.quantity,
    sold: 0,
    available: t.quantity,
    saleStartsAt: undefined,
    saleEndsAt: undefined,
  }));

  const transactItems: TransactWriteCommandInput['TransactItems'] = [
    {
      Put: {
        TableName: T(),
        Item: {
          pk: eventPk(id),
          sk: 'METADATA',
          ...event,
          // GSI2: this creator's events (all statuses)
          gsi2pk: creatorPk(input.creatorId),
          gsi2sk: createdSk(createdAt, id),
        },
      },
    },
    ...tiers.map((tier) => ({
      Put: {
        TableName: T(),
        Item: { pk: eventPk(id), sk: `TIER#${tier.id}`, ...tier },
      },
    })),
  ];
  await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
  return { event, tiers };
}

export async function getEventMeta(id: string): Promise<EventItem | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: eventPk(id), sk: 'METADATA' } })
  );
  if (!res.Item) return null;
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as EventItem;
}

export async function getTiersForEvent(eventId: string): Promise<TicketTier[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': eventPk(eventId), ':prefix': 'TIER#' },
    })
  );
  return (res.Items ?? []).map((item) => {
    const { pk, sk, ...rest } = item as Record<string, unknown>;
    return { id: (sk as string).slice(5), ...rest } as unknown as TicketTier;
  });
}

export async function getEvent(id: string): Promise<{ event: EventItem; tiers: TicketTier[] } | null> {
  const event = await getEventMeta(id);
  if (!event) return null;
  const tiers = await getTiersForEvent(id);
  return { event, tiers };
}

export async function listPublishedEvents(opts: {
  category?: string;
  q?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ items: { event: EventItem; tiers: TicketTier[] }[]; nextCursor?: string }> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk >= :feedSk',
      ExpressionAttributeValues: {
        ':pk': EVENT_FEED_PK,
        ':feedSk': eventFeedSk(now()),
      },
      ScanIndexForward: true, // soonest first
      Limit: opts.limit ?? 50,
      ExclusiveStartKey: decodeCursor(opts.cursor) as never,
    })
  );
  let events = ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as EventItem;
  });
  if (opts.category) {
    events = events.filter((e) => e.category.toLowerCase() === opts.category!.toLowerCase());
  }
  if (opts.q) {
    const needle = opts.q.toLowerCase();
    events = events.filter(
      (e) =>
        e.title.toLowerCase().includes(needle) ||
        e.location.toLowerCase().includes(needle)
    );
  }

  // Fetch tiers for all events in parallel — bounded by Limit (<=50).
  // (Tiers live under each EVENT#<id> partition; a batch tier-index could be
  // added later if this ever becomes hot.)
  const tiersByEvent = new Map<string, TicketTier[]>();
  await Promise.all(
    events.map(async (e) => {
      tiersByEvent.set(e.id, await getTiersForEvent(e.id));
    })
  );
  const items = events.map((event) => ({ event, tiers: tiersByEvent.get(event.id) ?? [] }));
  return { items, nextCursor: encodeCursor(res.LastEvaluatedKey as Record<string, unknown> | undefined) };
}

export async function listCreatorEvents(creatorId: string): Promise<EventItem[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': creatorPk(creatorId) },
      ScanIndexForward: false,
      Limit: 100,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as EventItem;
  });
}

export async function publishEvent(
  id: string,
  actorId: string,
  actorRole: string
): Promise<EventItem | null> {
  const event = await getEventMeta(id);
  if (!event) return null;
  if (event.creatorId !== actorId && actorRole !== 'ADMIN') {
    throw new ConditionFailedError('Not the event creator');
  }
  const tiers = await getTiersForEvent(id);
  if (tiers.length === 0) {
    throw new ConditionFailedError('Event needs at least one ticket tier');
  }
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: eventPk(id), sk: 'METADATA' },
      UpdateExpression:
        'SET #status = :published, gsi1pk = :feedPk, gsi1sk = :feedSk',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':published': 'PUBLISHED',
        ':feedPk': EVENT_FEED_PK,
        ':feedSk': eventFeedSk(event.startsAt),
      },
    })
  );
  return { ...event, status: 'PUBLISHED' };
}

export async function getTier(tierId: string, eventId: string): Promise<TicketTier | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: eventPk(eventId), sk: `TIER#${tierId}` } })
  );
  if (!res.Item) return null;
  const { pk, sk, ...rest } = res.Item as Record<string, unknown>;
  return { id: (sk as string).slice(5), ...rest } as unknown as TicketTier;
}

// ---------- promo codes ----------

export async function getPromoByCode(code: string): Promise<PromoCode | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: promoPk(code), sk: 'METADATA' } })
  );
  if (!res.Item) return null;
  const { pk, sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as PromoCode;
}

// ---------- orders ----------

export async function createPendingOrder(input: {
  userId: string;
  eventId: string;
  kind?: OrderKind;
  listingCode?: string;
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  feesCents: number;
  totalCents: number;
  promoCodeText?: string;
  currency?: string;
  expiresAt: string;
}): Promise<Order> {
  const id = randomUUID();
  const createdAt = now();
  const order: Order = {
    id,
    userId: input.userId,
    eventId: input.eventId,
    kind: input.kind ?? 'TICKET',
    listingCode: input.listingCode,
    status: 'PENDING',
    subtotalCents: input.subtotalCents,
    discountCents: input.discountCents,
    feesCents: input.feesCents,
    totalCents: input.totalCents,
    promoCodeText: input.promoCodeText,
    currency: input.currency,
    expiresAt: input.expiresAt,
    createdAt,
  };
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: T(),
            Item: {
              pk: orderPk(id),
              sk: 'METADATA',
              ...order,
              gsi2pk: userOrdersPk(input.userId),
              gsi2sk: createdSk(createdAt, id),
            },
          },
        },
        ...input.items.map((item) => ({
          Put: {
            TableName: T(),
            Item: {
              pk: orderPk(id),
              sk: `ITEM#${item.tierId ?? item.sectionId ?? item.ticketCode ?? item.tierName}`,
              ...item,
            },
          },
        })),
        // Expiry index — lets the sweeper find stale PENDING orders via GSI1.
        {
          Put: {
            TableName: T(),
            Item: {
              pk: expirePk(id),
              sk: 'INDEX',
              orderId: id,
              expiresAt: input.expiresAt,
              gsi1pk: EXPIRE_GSI_PK,
              gsi1sk: input.expiresAt,
            },
          },
        },
      ],
    })
  );
  return order;
}

export async function setOrderPaymentIntent(orderId: string, paymentIntentId: string) {
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: T(),
            Key: { pk: orderPk(orderId), sk: 'METADATA' },
            UpdateExpression: 'SET stripePaymentIntentId = :pi',
            ExpressionAttributeValues: { ':pi': paymentIntentId },
          },
        },
        {
          Put: {
            TableName: T(),
            Item: { pk: `PI#${paymentIntentId}`, sk: 'ORDER', orderId },
          },
        },
      ],
    })
  );
}

// ---------- inventory holds (oversell protection) ----------

// Atomically reserve `quantity` tickets on a tier.
// available = quantity - sold - reserved; the ConditionExpression makes the
// check-and-decrement a single atomic operation, so concurrent buyers can't
// both grab the last ticket.
export async function reserveTickets(
  eventId: string,
  tierId: string,
  quantity: number
): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: eventPk(eventId), sk: `TIER#${tierId}` },
        UpdateExpression: 'ADD available :neg',
        ConditionExpression: 'available >= :qty',
        ExpressionAttributeValues: { ':neg': -quantity, ':qty': quantity },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false; // sold out / lost the race
    throw e;
  }
}

// Credit held tickets back to a tier (no order context — used when order
// creation itself failed before an order record existed).
export async function releaseTierHold(eventId: string, tierId: string, quantity: number) {
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: eventPk(eventId), sk: `TIER#${tierId}` },
      UpdateExpression: 'ADD available :qty',
      ExpressionAttributeValues: { ':qty': quantity },
    })
  );
}

// Credit held seats back to a venue section (order creation failed before
// an order record existed).
export async function releaseSectionHold(eventId: string, sectionId: string, quantity: number) {
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: eventPk(eventId), sk: `SECTION#${sectionId}` },
      UpdateExpression: 'ADD available :qty',
      ExpressionAttributeValues: { ':qty': quantity },
    })
  );
}

function expireIndexDelete(orderId: string) {
  return {
    Delete: {
      TableName: T(),
      Key: { pk: expirePk(orderId), sk: 'INDEX' },
    },
  };
}

// Release a PENDING order's inventory hold and mark it with the given status
// (FAILED for Stripe failures, EXPIRED/CANCELLED for sweeps/compensation).
// Exactly-once: the order status update is conditional on PENDING inside the
// same transaction as the tier credits, so webhook retries and sweeper races
// can't double-release.
export async function releaseOrder(
  orderId: string,
  status: 'FAILED' | 'EXPIRED' | 'CANCELLED'
): Promise<'released' | 'already'> {
  const order = await getOrderMeta(orderId);
  if (!order || order.status !== 'PENDING') return 'already';

  const items = await getOrderItems(orderId);
  const transactItems: TransactWriteCommandInput['TransactItems'] = [
    {
      Update: {
        TableName: T(),
        Key: { pk: orderPk(orderId), sk: 'METADATA' },
        UpdateExpression: 'SET #status = :status',
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status, ':pending': 'PENDING' },
      },
    },
    expireIndexDelete(orderId),
  ];

  // Release whatever the order held: tier seats, venue-section seats, or a
  // resale listing checkout claim. Only TICKET items carry tierId.
  for (const item of items) {
    if (item.tierId) {
      transactItems.push({
        Update: {
          TableName: T(),
          Key: { pk: eventPk(order.eventId), sk: `TIER#${item.tierId}` },
          UpdateExpression: 'ADD available :qty',
          ExpressionAttributeValues: { ':qty': item.quantity },
        },
      });
    }
    if (item.sectionId) {
      transactItems.push({
        Update: {
          TableName: T(),
          Key: { pk: eventPk(order.eventId), sk: `SECTION#${item.sectionId}` },
          UpdateExpression: 'ADD available :qty',
          ExpressionAttributeValues: { ':qty': item.quantity },
        },
      });
    }
    // Seat-level holds: HELD → AVAILABLE (only seats this order reserved).
    if (item.sectionId && item.seatLabels) {
      for (const label of item.seatLabels) {
        transactItems.push({
          Update: {
            TableName: T(),
            Key: { pk: eventPk(order.eventId), sk: seatSk(item.sectionId, label) },
            UpdateExpression: 'SET #status = :available REMOVE reservedAt',
            ConditionExpression: '#status = :held',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':available': 'AVAILABLE', ':held': 'HELD' },
          },
        });
      }
    }
  }
  // RESALE orders claimed the listing (ACTIVE → CHECKOUT) at intent time.
  if (order.kind === 'RESALE' && order.listingCode) {
    transactItems.push({
      Update: {
        TableName: T(),
        Key: { pk: listingPk(order.listingCode), sk: 'METADATA' },
        UpdateExpression: 'SET #status = :active',
        ConditionExpression: '#status = :checkout',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':active': 'ACTIVE', ':checkout': 'CHECKOUT' },
      },
    });
  }

  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    return 'released';
  } catch (e) {
    if (isConditionalCheck(e)) return 'already';
    throw e;
  }
}

// Find PENDING orders whose reservation window has passed.
// Driven by the EXPIRE index items on GSI1 (gsi1pk='EXPIRE', gsi1sk=expiresAt).
export async function listExpiredPendingOrders(nowIso: string, limit = 100): Promise<string[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk < :now',
      ExpressionAttributeValues: { ':pk': EXPIRE_GSI_PK, ':now': nowIso },
      Limit: limit,
    })
  );
  return ((res.Items ?? []) as { orderId?: string }[])
    .map((i) => i.orderId)
    .filter((x): x is string => Boolean(x));
}

export async function deleteExpireIndex(orderId: string) {
  await docClient.send(
    new DeleteCommand({ TableName: T(), Key: { pk: expirePk(orderId), sk: 'INDEX' } })
  );
}

export async function getOrderIdByPaymentIntent(paymentIntentId: string): Promise<string | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: `PI#${paymentIntentId}`, sk: 'ORDER' } })
  );
  return (res.Item?.orderId as string | undefined) ?? null;
}

async function getOrderMeta(orderId: string): Promise<Order | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: orderPk(orderId), sk: 'METADATA' } })
  );
  if (!res.Item) return null;
  const { pk, sk, gsi2pk, gsi2sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as Order;
}

async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': orderPk(orderId), ':prefix': 'ITEM#' },
    })
  );
  return (res.Items ?? []).map((item) => {
    const { pk, sk, tierId, ...rest } = item as Record<string, unknown>;
    return { tierId: tierId as string, ...rest } as unknown as OrderItem;
  });
}

export async function listUserOrders(
  userId: string,
  opts: { limit?: number; cursor?: string } = {}
): Promise<{
  items: (Order & { items: OrderItem[]; event?: { id: string; title: string; startsAt: string; location: string; imageUrl?: string } })[];
  nextCursor?: string;
}> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': userOrdersPk(userId) },
      ScanIndexForward: false,
      Limit: opts.limit ?? 100,
      ExclusiveStartKey: decodeCursor(opts.cursor) as never,
    })
  );
  const orders = ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as Order;
  });
  const items = await Promise.all(
    orders.map(async (order) => {
      const [items, eventMeta] = await Promise.all([
        getOrderItems(order.id),
        getEventMeta(order.eventId),
      ]);
      return {
        ...order,
        items,
        event: eventMeta
          ? {
              id: eventMeta.id,
              title: eventMeta.title,
              startsAt: eventMeta.startsAt,
              location: eventMeta.location,
              imageUrl: eventMeta.imageUrl,
            }
          : undefined,
      };
    })
  );
  return { items, nextCursor: encodeCursor(res.LastEvaluatedKey as Record<string, unknown> | undefined) };
}

export interface EventOrder extends Order {
  items: OrderItem[];
  buyerName: string;
  buyerEmail: string;
}

// Creator-facing order feed for one event. There is no event-order GSI yet, so
// this derives paid orders from the EVENTTIX ticket feed and hydrates each
// order's line items + buyer profile. Pending/failed checkouts have no issued
// tickets and therefore do not appear here.
export async function listEventOrders(eventId: string): Promise<EventOrder[]> {
  const tickets = await listEventTickets(eventId);
  const orderIds = [...new Set(tickets.map((ticket) => ticket.orderId).filter(Boolean))];
  if (orderIds.length === 0) return [];

  const orderRows = await batchGet<Record<string, unknown>>(
    orderIds.map((id) => ({ pk: orderPk(id), sk: 'METADATA' }))
  );
  const orders = orderRows
    .map((item) => {
      const { pk, sk, gsi2pk, gsi2sk, ...rest } = item;
      return rest as unknown as Order;
    })
    .filter((order) => order.eventId === eventId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (orders.length === 0) return [];

  const userIds = [...new Set(orders.map((order) => order.userId))];
  const [itemsByOrder, users] = await Promise.all([
    Promise.all(
      orders.map(async (order) => [order.id, await getOrderItems(order.id)] as const)
    ),
    batchGet<{ id: string; firstName?: string; lastName?: string; email?: string }>(
      userIds.map((id) => ({ pk: userPk(id), sk: 'PROFILE' }))
    ),
  ]);
  const itemsMap = new Map(itemsByOrder);
  const userMap = new Map(users.map((user) => [user.id, user]));

  return orders.map((order) => {
    const user = userMap.get(order.userId);
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    return {
      ...order,
      items: itemsMap.get(order.id) ?? [],
      buyerName: name || user?.email || 'Guest',
      buyerEmail: user?.email ?? '',
    };
  });
}

export async function getOrder(orderId: string): Promise<
  | (Order & {
      items: OrderItem[];
      event?: EventItem;
      tickets: Ticket[];
    })
  | null
> {
  const order = await getOrderMeta(orderId);
  if (!order) return null;
  const [items, tickets, event] = await Promise.all([
    getOrderItems(orderId),
    order.ticketCodes?.length
      ? batchGet<Ticket>(order.ticketCodes.map((code) => ({ pk: ticketPk(code), sk: 'METADATA' })))
      : Promise.resolve([] as Ticket[]),
    getEventMeta(order.eventId),
  ]);
  return { ...order, items, tickets, event: event ?? undefined };
}

// Fulfill a paid order: mark PAID, issue tickets, bump tier sold + promo uses.
// Idempotent — the order update is conditional on status = PENDING.
export async function fulfillOrder(orderId: string, paymentIntentId: string): Promise<'fulfilled' | 'already'> {
  const order = await getOrderMeta(orderId);
  if (!order) return 'already';
  if (order.status !== 'PENDING') return 'already';
  if (order.kind === 'RESALE') return fulfillResaleOrder(order, paymentIntentId);
  if (order.kind === 'SEATED') return fulfillSeatedOrder(order, paymentIntentId);

  const [items, event] = await Promise.all([getOrderItems(orderId), getEventMeta(order.eventId)]);
  const createdAt = now();

  const ticketCodes: string[] = [];
  const ticketPks: { pk: string; sk: string }[] = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const code = `BT-${orderId.replace(/-/g, '').slice(0, 6).toUpperCase()}-${ticketCodes.length + 1}-${randomUUID().slice(0, 6).toUpperCase()}`;
      ticketCodes.push(code);
      ticketPks.push({ pk: ticketPk(code), sk: 'METADATA' });
    }
  }

  const transactItems: TransactWriteCommandInput['TransactItems'] = [
    {
      Update: {
        TableName: T(),
        Key: { pk: orderPk(orderId), sk: 'METADATA' },
        UpdateExpression:
          'SET #status = :paid, paidAt = :paidAt, stripePaymentIntentId = :pi, ticketCodes = :codes',
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':paid': 'PAID',
          ':pending': 'PENDING',
          ':paidAt': createdAt,
          ':pi': paymentIntentId,
          ':codes': ticketCodes,
        },
      },
    },
    expireIndexDelete(orderId), // reservation consumed — stop the sweeper
  ];

  // tickets (denormalized for the wallet UI)
  let idx = 0;
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const code = ticketCodes[idx++];
      transactItems.push({
        Put: {
          TableName: T(),
          Item: {
            pk: ticketPk(code),
            sk: 'METADATA',
            code,
            orderId,
            eventId: order.eventId,
            eventTitle: event?.title ?? '',
            eventStartsAt: event?.startsAt ?? '',
            eventLocation: event?.location ?? '',
            tierId: item.tierId,
            tierName: item.tierName,
            sectionName: item.sectionName,
            currency: order.currency ?? 'usd',
            userId: order.userId,
            status: 'VALID',
            createdAt,
            gsi2pk: userTicketsPk(order.userId),
            gsi2sk: createdSk(createdAt, code),
            // GSI1: per-event ticket feed for guest lists / check-in.
            gsi1pk: eventTicketsGsiPk(order.eventId),
            gsi1sk: createdSk(createdAt, code),
          },
        },
      });
    }
    // bump sold count per tier
    if (item.tierId) {
      transactItems.push({
        Update: {
          TableName: T(),
          Key: { pk: eventPk(order.eventId), sk: `TIER#${item.tierId}` },
          UpdateExpression: 'ADD sold :qty',
          ExpressionAttributeValues: { ':qty': item.quantity },
        },
      });
    }
  }

  if (order.promoCodeText) {
    transactItems.push({
      Update: {
        TableName: T(),
        Key: { pk: promoPk(order.promoCodeText), sk: 'METADATA' },
        UpdateExpression: 'ADD usedCount :one',
        ExpressionAttributeValues: { ':one': 1 },
      },
    });
  }

  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (e) {
    if (isConditionalCheck(e)) return 'already'; // webhook retry / race — safe
    throw e;
  }
  return 'fulfilled';
}

// ---------- tickets ----------

export async function listUserTickets(
  userId: string,
  opts: { limit?: number; cursor?: string } = {}
): Promise<{ items: Ticket[]; nextCursor?: string }> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': userTicketsPk(userId) },
      ScanIndexForward: false,
      Limit: opts.limit ?? 100,
      ExclusiveStartKey: decodeCursor(opts.cursor) as never,
    })
  );
  const items = ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as Ticket;
  });
  return { items, nextCursor: encodeCursor(res.LastEvaluatedKey as Record<string, unknown> | undefined) };
}

// ---------- door ops: ticket lookup, check-in, guest list ----------

export async function getTicketByCode(code: string): Promise<Ticket | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: ticketPk(code), sk: 'METADATA' } })
  );
  if (!res.Item) return null;
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as Ticket;
}

export type TransferTicketResult =
  | { result: 'OK'; ticket: Ticket; recipient: User }
  | { result: 'NOT_FOUND' }
  | { result: 'FORBIDDEN' }
  | { result: 'NOT_YOURS' }
  | { result: 'NOT_VALID' }
  | { result: 'LISTED' }
  | { result: 'SELF' }
  | { result: 'RECIPIENT_NOT_FOUND' };

// Gift/transfer a VALID ticket to another user by email. The ticket code stays
// the same (the recipient's wallet/QR reflects the new owner); ownership and
// the per-user GSI2 feed move atomically.
export async function transferTicket(input: {
  ticketCode: string;
  fromUserId: string;
  recipientEmail: string;
}): Promise<TransferTicketResult> {
  const ticket = await getTicketByCode(input.ticketCode);
  if (!ticket) return { result: 'NOT_FOUND' };
  if (ticket.userId !== input.fromUserId) return { result: 'NOT_YOURS' };
  if (ticket.status !== 'VALID') return { result: 'NOT_VALID' };
  const listing = await getListing(input.ticketCode);
  if (listing && (listing.status === 'ACTIVE' || listing.status === 'CHECKOUT')) {
    return { result: 'LISTED' };
  }
  const recipient = await getUserByEmail(input.recipientEmail);
  if (!recipient || recipient.deletedAt) return { result: 'RECIPIENT_NOT_FOUND' };
  if (recipient.id === input.fromUserId) return { result: 'SELF' };

  const transferredAt = now();
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: ticketPk(input.ticketCode), sk: 'METADATA' },
        UpdateExpression:
          'SET userId = :to, gsi2pk = :ticketsPk, gsi2sk = :ticketsSk, transferredFrom = :from, transferredTo = :toId, transferredAt = :at',
        ConditionExpression: '#status = :valid AND userId = :from',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':to': recipient.id,
          ':ticketsPk': userTicketsPk(recipient.id),
          ':ticketsSk': createdSk(ticket.createdAt, input.ticketCode),
          ':from': input.fromUserId,
          ':toId': recipient.id,
          ':at': transferredAt,
          ':valid': 'VALID',
        },
      })
    );
  } catch (e) {
    if (isConditionalCheck(e)) return { result: 'NOT_VALID' };
    throw e;
  }
  return {
    result: 'OK',
    ticket: { ...ticket, userId: recipient.id, transferredFrom: input.fromUserId, transferredTo: recipient.id, transferredAt },
    recipient,
  };
}

// ---------- set-your-price offers (standing auto-buy requests) ----------

export interface Offer {
  id: string;
  buyerId: string;
  eventId: string;
  tierName: string;
  tierKey: string;
  sectionName?: string;
  maxPriceCents: number;
  quantity: number;
  matchedCount: number;
  status: 'ACTIVE' | 'MATCHED' | 'CANCELLED';
  lastListingCode?: string;
  lastMatchedAt?: string;
  createdAt: string;
}

export function offerTierKey(tierName: string, sectionName?: string): string {
  return [tierName, sectionName].filter(Boolean).join('::').trim().toLowerCase();
}

export class OfferError extends Error {}

export async function createOffer(input: {
  buyerId: string;
  eventId: string;
  tierName: string;
  sectionName?: string;
  maxPriceCents: number;
  quantity: number;
}): Promise<Offer> {
  const event = await getEventMeta(input.eventId);
  if (!event || event.status !== 'PUBLISHED') throw new OfferError('Event is not on sale');
  if (!input.tierName?.trim()) throw new OfferError('Ticket tier is required');
  if (!Number.isInteger(input.maxPriceCents) || input.maxPriceCents < 1) {
    throw new OfferError('Enter a valid max price');
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 8) {
    throw new OfferError('Quantity must be between 1 and 8');
  }
  const existing = (await listUserOffers(input.buyerId)).items;
  const duplicate = existing.find(
    (offer) =>
      offer.status === 'ACTIVE' &&
      offer.eventId === input.eventId &&
      offer.tierKey === offerTierKey(input.tierName, input.sectionName)
  );
  if (duplicate) throw new OfferError('You already have an active offer for these tickets');

  const id = randomUUID();
  const createdAt = now();
  const tierKey = offerTierKey(input.tierName, input.sectionName);
  const offer: Offer = {
    id,
    buyerId: input.buyerId,
    eventId: input.eventId,
    tierName: input.tierName.trim(),
    tierKey,
    sectionName: input.sectionName?.trim() || undefined,
    maxPriceCents: input.maxPriceCents,
    quantity: input.quantity,
    matchedCount: 0,
    status: 'ACTIVE',
    createdAt,
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: offerPk(id),
        sk: 'METADATA',
        ...offer,
        gsi1pk: ACTIVE_OFFERS_GSI_PK,
        gsi1sk: offerGsiSk(input.eventId, tierKey, createdAt, id),
        gsi2pk: userOffersPk(input.buyerId),
        gsi2sk: createdSk(createdAt, id),
      },
    })
  );
  return offer;
}

function stripOfferKeys(item: Record<string, unknown>): Offer {
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = item;
  return { ...(rest as unknown as Offer), matchedCount: (rest.matchedCount as number) ?? 0 };
}

export async function getOffer(id: string): Promise<Offer | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: offerPk(id), sk: 'METADATA' } })
  );
  return res.Item ? stripOfferKeys(res.Item) : null;
}

export async function listUserOffers(
  userId: string,
  opts: { limit?: number; cursor?: string } = {}
): Promise<{ items: Offer[]; nextCursor?: string }> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': userOffersPk(userId) },
      ScanIndexForward: false,
      Limit: opts.limit ?? 200,
      ExclusiveStartKey: decodeCursor(opts.cursor) as never,
    })
  );
  const items = ((res.Items ?? []) as Record<string, unknown>[])
    .map(stripOfferKeys)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { items, nextCursor: encodeCursor(res.LastEvaluatedKey as Record<string, unknown> | undefined) };
}

export async function listActiveOffersForTier(input: {
  eventId: string;
  tierName: string;
  sectionName?: string;
}): Promise<Offer[]> {
  const tierKey = offerTierKey(input.tierName, input.sectionName);
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': ACTIVE_OFFERS_GSI_PK,
        ':prefix': `EVENT#${input.eventId}#${tierKey}#`,
      },
      ScanIndexForward: true,
      Limit: 200,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[])
    .map(stripOfferKeys)
    .filter(
      (offer) =>
        offer.status === 'ACTIVE' &&
        offer.matchedCount < offer.quantity &&
        (offer.sectionName ?? '') === (input.sectionName ?? '')
    );
}

async function matchOffer(offer: Offer, listingCode: string, priceCents: number): Promise<Offer> {
  const matchedCount = offer.matchedCount + 1;
  const status = matchedCount >= offer.quantity ? 'MATCHED' : 'ACTIVE';
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: offerPk(offer.id), sk: 'METADATA' },
      UpdateExpression:
        'SET matchedCount = :matched, #status = :status, lastListingCode = :code, lastMatchedAt = :at',
      ConditionExpression: '#status = :active AND (attribute_not_exists(matchedCount) OR matchedCount < :quantity)',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':matched': matchedCount,
        ':status': status,
        ':active': 'ACTIVE',
        ':quantity': offer.quantity,
        ':code': listingCode,
        ':at': now(),
      },
    })
  );
  return { ...offer, matchedCount, status, lastListingCode: listingCode, lastMatchedAt: now() };
}

// Called after a resale listing is created. The earliest eligible standing
// offer at or above the ask is marked matched so the buyer sees it in Tickets;
// payment still goes through the normal resale checkout when the buyer accepts.
export async function matchOffersForListing(listing: Listing): Promise<Offer[]> {
  const offers = await listActiveOffersForTier({
    eventId: listing.eventId,
    tierName: listing.tierName,
  });
  const eligible = offers
    .filter((offer) => offer.maxPriceCents >= listing.priceCents)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const matched: Offer[] = [];
  for (const offer of eligible) {
    try {
      matched.push(await matchOffer(offer, listing.ticketCode, listing.priceCents));
      break; // one ticket can only satisfy one standing offer
    } catch (e) {
      if (!isConditionalCheck(e)) throw e;
    }
  }
  return matched;
}

export async function cancelOffer(userId: string, offerId: string): Promise<'cancelled' | 'not_found' | 'forbidden'> {
  const offer = await getOffer(offerId);
  if (!offer) return 'not_found';
  if (offer.buyerId !== userId) return 'forbidden';
  if (offer.status !== 'ACTIVE') return 'not_found';
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: offerPk(offerId), sk: 'METADATA' },
      UpdateExpression: 'SET #status = :cancelled',
      ConditionExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':cancelled': 'CANCELLED', ':active': 'ACTIVE' },
    })
  );
  return 'cancelled';
}

export type CheckInResult =
  | { result: 'OK'; ticket: Ticket }
  | { result: 'ALREADY_USED'; ticket: Ticket }
  | { result: 'WRONG_EVENT' }
  | { result: 'NOT_FOUND' }
  | { result: 'FORBIDDEN' };

// Creator/admin scans a ticket code at the door. Atomic VALID → USED flip so
// two scanners can't both get a green light.
export async function checkInTicket(
  eventId: string,
  code: string,
  actorId: string,
  actorRole: string
): Promise<CheckInResult> {
  const event = await getEventMeta(eventId);
  if (!event) return { result: 'NOT_FOUND' };
  if (event.creatorId !== actorId && actorRole !== 'ADMIN') {
    return { result: 'FORBIDDEN' };
  }
  const ticket = await getTicketByCode(code);
  if (!ticket) return { result: 'NOT_FOUND' };
  if (ticket.eventId !== eventId) return { result: 'WRONG_EVENT' };
  if (ticket.status !== 'VALID') {
    return { result: 'ALREADY_USED', ticket };
  }
  const checkedInAt = now();
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: ticketPk(code), sk: 'METADATA' },
        UpdateExpression: 'SET #status = :used, checkedInAt = :at',
        ConditionExpression: '#status = :valid',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':used': 'USED',
          ':valid': 'VALID',
          ':at': checkedInAt,
        },
      })
    );
    return { result: 'OK', ticket: { ...ticket, status: 'USED', checkedInAt } };
  } catch (e) {
    if (isConditionalCheck(e)) {
      const fresh = await getTicketByCode(code);
      return { result: 'ALREADY_USED', ticket: fresh ?? ticket };
    }
    throw e;
  }
}

// Every ticket issued for an event, via the GSI1 EVENTTIX# feed written at
// fulfillment. (Tickets issued before this index existed won't appear.)
export async function listEventTickets(eventId: string): Promise<Ticket[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': eventTicketsGsiPk(eventId) },
      ScanIndexForward: true,
      Limit: 1000,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as Ticket;
  });
}

export interface EventGuest extends Ticket {
  guestName: string;
  guestEmail: string;
}

export async function listEventGuests(eventId: string): Promise<EventGuest[]> {
  const tickets = await listEventTickets(eventId);
  const userIds = [...new Set(tickets.map((t) => t.userId))];
  const users = await batchGet<{ id: string; firstName?: string; lastName?: string; email?: string }>(
    userIds.map((id) => ({ pk: userPk(id), sk: 'PROFILE' }))
  );
  const byId = new Map(users.map((u) => [u.id, u]));
  return tickets.map((t) => {
    const u = byId.get(t.userId);
    const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
    return {
      ...t,
      guestName: name || u?.email || 'Guest',
      guestEmail: u?.email ?? '',
    };
  });
}

// ---------- resale listings ----------

export interface Listing {
  ticketCode: string;
  sellerId: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventLocation: string;
  tierName: string;
  priceCents: number;
  currency?: string;
  status: 'ACTIVE' | 'CHECKOUT' | 'SOLD' | 'CANCELLED';
  buyerId?: string;
  createdAt: string;
}

function stripKeys(item: Record<string, unknown>) {
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = item;
  return rest;
}

export async function getListing(ticketCode: string): Promise<Listing | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: listingPk(ticketCode), sk: 'METADATA' } })
  );
  return res.Item ? (stripKeys(res.Item) as unknown as Listing) : null;
}

export class ListingError extends Error {}

// List a VALID ticket for resale. One listing per ticket code (pk = code);
// re-listing after SOLD/CANCELLED overwrites the record.
export async function createListing(input: {
  sellerId: string;
  ticketCode: string;
  priceCents: number;
}): Promise<Listing> {
  const ticket = await getTicketByCode(input.ticketCode);
  if (!ticket) throw new ListingError('Ticket not found');
  if (ticket.userId !== input.sellerId) throw new ListingError('Not your ticket');
  if (ticket.status !== 'VALID') throw new ListingError('Ticket is not sellable');

  const existing = await getListing(input.ticketCode);
  if (existing && (existing.status === 'ACTIVE' || existing.status === 'CHECKOUT')) {
    throw new ListingError('Ticket is already listed');
  }

  const event = await getEventMeta(ticket.eventId);
  const createdAt = now();
  const listing: Listing = {
    ticketCode: input.ticketCode,
    sellerId: input.sellerId,
    eventId: ticket.eventId,
    eventTitle: ticket.eventTitle,
    eventStartsAt: ticket.eventStartsAt,
    eventLocation: ticket.eventLocation,
    tierName: ticket.tierName,
    priceCents: input.priceCents,
    currency: ticket.currency ?? event?.currency ?? 'usd',
    status: 'ACTIVE',
    createdAt,
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: listingPk(input.ticketCode),
        sk: 'METADATA',
        ...listing,
        gsi1pk: ACTIVE_LISTINGS_GSI_PK,
        gsi1sk: listingGsiSk(ticket.eventId, createdAt),
        gsi2pk: userListingsPk(input.sellerId),
        gsi2sk: createdSk(createdAt, input.ticketCode),
      },
      // Allow overwrite only of terminal states.
      ConditionExpression:
        'attribute_not_exists(pk) OR #status = :sold OR #status = :cancelled',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':sold': 'SOLD', ':cancelled': 'CANCELLED' },
    })
  );
  return listing;
}

// Active listings, optionally scoped to one event (GSI1 sk prefix).
export async function listActiveListings(eventId?: string): Promise<Listing[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: eventId
        ? 'gsi1pk = :pk AND begins_with(gsi1sk, :prefix)'
        : 'gsi1pk = :pk',
      ExpressionAttributeValues: eventId
        ? { ':pk': ACTIVE_LISTINGS_GSI_PK, ':prefix': `EVENT#${eventId}#` }
        : { ':pk': ACTIVE_LISTINGS_GSI_PK },
      ScanIndexForward: false,
      Limit: 200,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[])
    .map((item) => stripKeys(item) as unknown as Listing)
    .filter((l) => l.status === 'ACTIVE');
}

export async function listSellerListings(
  sellerId: string,
  opts: { limit?: number; cursor?: string } = {}
): Promise<{ items: Listing[]; nextCursor?: string }> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': userListingsPk(sellerId) },
      ScanIndexForward: false,
      Limit: opts.limit ?? 200,
      ExclusiveStartKey: decodeCursor(opts.cursor) as never,
    })
  );
  const items = ((res.Items ?? []) as Record<string, unknown>[]).map(
    (item) => stripKeys(item) as unknown as Listing
  );
  return { items, nextCursor: encodeCursor(res.LastEvaluatedKey as Record<string, unknown> | undefined) };
}

// Atomically claim a listing for checkout: ACTIVE → CHECKOUT. Returns false
// when it's already listed-sold/claimed or missing.
export async function claimListingForCheckout(ticketCode: string): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: listingPk(ticketCode), sk: 'METADATA' },
        UpdateExpression: 'SET #status = :checkout',
        ConditionExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':checkout': 'CHECKOUT', ':active': 'ACTIVE' },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// Release a CHECKOUT claim back to ACTIVE (order creation failed before an
// order record existed, so releaseOrder never ran).
export async function releaseListingCheckout(ticketCode: string): Promise<void> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: listingPk(ticketCode), sk: 'METADATA' },
        UpdateExpression: 'SET #status = :active',
        ConditionExpression: '#status = :checkout',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':active': 'ACTIVE', ':checkout': 'CHECKOUT' },
      })
    );
  } catch (e) {
    if (!isConditionalCheck(e)) throw e;
  }
}

export async function cancelListing(sellerId: string, ticketCode: string): Promise<'cancelled' | 'not_found' | 'forbidden'> {
  const listing = await getListing(ticketCode);
  if (!listing) return 'not_found';
  if (listing.sellerId !== sellerId) return 'forbidden';
  if (listing.status !== 'ACTIVE') return 'not_found';
  await docClient.send(
    new DeleteCommand({ TableName: T(), Key: { pk: listingPk(ticketCode), sk: 'METADATA' } })
  );
  return 'cancelled';
}

// Fulfill a paid resale order: listing CHECKOUT → SOLD, ticket ownership
// moves to the buyer (stays VALID), order → PAID. One transaction, so a
// double-fulfill or a stale listing fails cleanly.
async function fulfillResaleOrder(
  order: Order,
  paymentIntentId: string
): Promise<'fulfilled' | 'already'> {
  if (!order.listingCode) return 'already';
  const createdAt = now();
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: T(),
              Key: { pk: orderPk(order.id), sk: 'METADATA' },
              UpdateExpression:
                'SET #status = :paid, paidAt = :paidAt, stripePaymentIntentId = :pi, ticketCodes = :codes',
              ConditionExpression: '#status = :pending',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: {
                ':paid': 'PAID',
                ':pending': 'PENDING',
                ':paidAt': createdAt,
                ':pi': paymentIntentId,
                ':codes': [order.listingCode],
              },
            },
          },
          expireIndexDelete(order.id),
          {
            Update: {
              TableName: T(),
              Key: { pk: listingPk(order.listingCode), sk: 'METADATA' },
              UpdateExpression: 'SET #status = :sold, buyerId = :buyer',
              ConditionExpression: '#status IN (:checkout, :active)',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: {
                ':sold': 'SOLD',
                ':checkout': 'CHECKOUT',
                ':active': 'ACTIVE',
                ':buyer': order.userId,
              },
            },
          },
          {
            // Transfer the ticket: new owner + move it between the per-user
            // GSI2 feeds so it appears in the buyer's wallet.
            Update: {
              TableName: T(),
              Key: { pk: ticketPk(order.listingCode), sk: 'METADATA' },
              UpdateExpression:
                'SET userId = :buyer, gsi2pk = :ticketsPk, gsi2sk = :ticketsSk',
              ConditionExpression: '#status = :valid',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: {
                ':buyer': order.userId,
                ':ticketsPk': userTicketsPk(order.userId),
                ':ticketsSk': createdSk(createdAt, order.listingCode),
                ':valid': 'VALID',
              },
            },
          },
        ],
      })
    );
    return 'fulfilled';
  } catch (e) {
    if (isConditionalCheck(e)) return 'already';
    throw e;
  }
}

// ---------- venue layouts & seated sections ----------

// Section inventory items live at EVENT#<id> / SECTION#<sectionId> with the
// same sold/available counters as tiers.
export interface SectionInventory {
  sectionId: string;
  name: string;
  priceCents: number;
  capacity: number;
  sold: number;
  available?: number;
}

export async function getSection(eventId: string, sectionId: string): Promise<SectionInventory | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: eventPk(eventId), sk: `SECTION#${sectionId}` } })
  );
  if (!res.Item) return null;
  const { pk, sk, ...rest } = res.Item as Record<string, unknown>;
  return { sectionId, ...rest } as unknown as SectionInventory;
}

export async function listSections(eventId: string): Promise<SectionInventory[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': eventPk(eventId), ':prefix': 'SECTION#' },
    })
  );
  return (res.Items ?? []).map((item) => {
    const { pk, sk, ...rest } = item as Record<string, unknown>;
    return { sectionId: (sk as string).slice(8), ...rest } as unknown as SectionInventory;
  });
}

// Creator sets/replaces the venue layout. Upserts SECTION# inventory rows so
// section availability counters exist before the first order.
export async function setVenueLayout(
  eventId: string,
  actorId: string,
  actorRole: string,
  layout: VenueLayout
): Promise<EventItem | null> {
  const event = await getEventMeta(eventId);
  if (!event) return null;
  if (event.creatorId !== actorId && actorRole !== 'ADMIN') {
    throw new ConditionFailedError('Not the event creator');
  }

  const existing = await listSections(eventId);
  const existingById = new Map(existing.map((section) => [section.sectionId, section]));
  const nextIds = new Set(layout.sections.map((section) => section.id));
  const transactItems: TransactWriteCommandInput['TransactItems'] = [
    {
      Update: {
        TableName: T(),
        Key: { pk: eventPk(eventId), sk: 'METADATA' },
        UpdateExpression: 'SET venueLayout = :layout',
        ExpressionAttributeValues: { ':layout': layout },
      },
    },
  ];

  for (const section of layout.sections) {
    const previous = existingById.get(section.id);
    let sold = 0;
    let available = section.capacity;
    if (previous) {
      sold = previous.sold ?? 0;
      const previousAvailable =
        previous.available ?? Math.max(0, previous.capacity - sold);
      const reserved = Math.max(
        0,
        previous.capacity - sold - previousAvailable
      );
      const minimumCapacity = sold + reserved;
      if (section.capacity < minimumCapacity) {
        throw new ConditionFailedError(
          `Section ${section.name || section.id} capacity cannot be below ${minimumCapacity} sold/reserved seats`
        );
      }
      available = Math.max(
        0,
        previousAvailable + (section.capacity - previous.capacity)
      );
    }
    transactItems.push({
      Put: {
        TableName: T(),
        Item: {
          pk: eventPk(eventId),
          sk: `SECTION#${section.id}`,
          sectionId: section.id,
          name: section.name,
          priceCents: section.priceCents,
          capacity: section.capacity,
          sold,
          available,
        },
      },
    });
  }

  for (const previous of existing) {
    if (nextIds.has(previous.sectionId)) continue;
    const sold = previous.sold ?? 0;
    const available = previous.available ?? Math.max(0, previous.capacity - sold);
    const reserved = Math.max(0, previous.capacity - sold - available);
    if (sold > 0 || reserved > 0) {
      throw new ConditionFailedError(
        `Cannot remove ${previous.name || previous.sectionId}; it has sold or reserved seats`
      );
    }
    transactItems.push({
      Delete: {
        TableName: T(),
        Key: { pk: eventPk(eventId), sk: `SECTION#${previous.sectionId}` },
      },
    });
  }

  await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
  return { ...event, venueLayout: layout };
}

export async function reserveSectionSeats(
  eventId: string,
  sectionId: string,
  quantity: number
): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: eventPk(eventId), sk: `SECTION#${sectionId}` },
        UpdateExpression: 'ADD available :neg',
        ConditionExpression: 'available >= :qty',
        ExpressionAttributeValues: { ':neg': -quantity, ':qty': quantity },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// Fulfill a paid seated order: bump section sold counters and issue tickets
// stamped with the section name.
async function fulfillSeatedOrder(
  order: Order,
  paymentIntentId: string
): Promise<'fulfilled' | 'already'> {
  const [items, event] = await Promise.all([getOrderItems(order.id), getEventMeta(order.eventId)]);
  const createdAt = now();

  const ticketCodes: string[] = [];
  const ticketPuts: TransactWriteCommandInput['TransactItems'] = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const code = `BT-${order.id.replace(/-/g, '').slice(0, 6).toUpperCase()}-${ticketCodes.length + 1}-${randomUUID().slice(0, 6).toUpperCase()}`;
      ticketCodes.push(code);
      ticketPuts.push({
        Put: {
          TableName: T(),
          Item: {
            pk: ticketPk(code),
            sk: 'METADATA',
            code,
            orderId: order.id,
            eventId: order.eventId,
            eventTitle: event?.title ?? '',
            eventStartsAt: event?.startsAt ?? '',
            eventLocation: event?.location ?? '',
            tierName: item.sectionName ?? item.tierName,
            sectionName: item.sectionName,
            seatLabel: item.seatLabels?.[i],
            currency: order.currency ?? 'usd',
            userId: order.userId,
            status: 'VALID',
            createdAt,
            gsi2pk: userTicketsPk(order.userId),
            gsi2sk: createdSk(createdAt, code),
            gsi1pk: eventTicketsGsiPk(order.eventId),
            gsi1sk: createdSk(createdAt, code),
          },
        },
      });
    }
    if (item.sectionId) {
      ticketPuts.push({
        Update: {
          TableName: T(),
          Key: { pk: eventPk(order.eventId), sk: `SECTION#${item.sectionId}` },
          UpdateExpression: 'ADD sold :qty',
          ExpressionAttributeValues: { ':qty': item.quantity },
        },
      });
      // Seat-level: HELD → SOLD for the exact seats this order reserved.
      if (item.seatLabels) {
        for (const label of item.seatLabels) {
          ticketPuts.push({
            Update: {
              TableName: T(),
              Key: { pk: eventPk(order.eventId), sk: seatSk(item.sectionId, label) },
              UpdateExpression: 'SET #status = :sold REMOVE reservedAt',
              ConditionExpression: '#status = :held',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: { ':sold': 'SOLD', ':held': 'HELD' },
            },
          });
        }
      }
    }
  }

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: T(),
              Key: { pk: orderPk(order.id), sk: 'METADATA' },
              UpdateExpression:
                'SET #status = :paid, paidAt = :paidAt, stripePaymentIntentId = :pi, ticketCodes = :codes',
              ConditionExpression: '#status = :pending',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: {
                ':paid': 'PAID',
                ':pending': 'PENDING',
                ':paidAt': createdAt,
                ':pi': paymentIntentId,
                ':codes': ticketCodes,
              },
            },
          },
          expireIndexDelete(order.id),
          ...ticketPuts,
        ],
      })
    );
    return 'fulfilled';
  } catch (e) {
    if (isConditionalCheck(e)) return 'already';
    throw e;
  }
}

// ---------- account lifecycle ----------

const resetPk = (email: string) => `RESET#${email.toLowerCase()}`;

function resetCodeHash(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export async function createPasswordReset(email: string): Promise<{ code: string; expiresAt: string }> {
  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: resetPk(email),
        sk: 'CODE',
        codeHash: resetCodeHash(code),
        expiresAt,
        createdAt: now(),
      },
    })
  );
  return { code, expiresAt };
}

async function passwordResetMatches(email: string, code: string): Promise<boolean> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: resetPk(email), sk: 'CODE' } })
  );
  const item = res.Item as { codeHash?: string; expiresAt?: string } | undefined;
  return Boolean(
    item?.codeHash === resetCodeHash(code) && item.expiresAt && new Date(item.expiresAt) > new Date()
  );
}

export async function verifyPasswordReset(email: string, code: string): Promise<boolean> {
  return passwordResetMatches(email, code);
}

export async function consumePasswordReset(email: string, code: string): Promise<boolean> {
  if (!(await passwordResetMatches(email, code))) return false;
  await docClient.send(
    new DeleteCommand({ TableName: T(), Key: { pk: resetPk(email), sk: 'CODE' } })
  );
  return true;
}

export async function deleteUser(id: string): Promise<boolean> {
  const user = await getUserById(id);
  if (!user || user.deletedAt) return false;
  const deletedAt = now();
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: T(),
            Key: { pk: emailPk(user.email), sk: 'ID' },
          },
        },
        {
          Update: {
            TableName: T(),
            Key: { pk: userPk(id), sk: 'PROFILE' },
            UpdateExpression:
              'SET deletedAt = :deletedAt, firstName = :firstName, lastName = :lastName, passwordHash = :passwordHash REMOVE phone, avatarUrl, firstNameAr, city, interests, dateOfBirth, notificationPrefs, stripeCustomerId',
            ExpressionAttributeValues: {
              ':deletedAt': deletedAt,
              ':firstName': 'Deleted',
              ':lastName': 'User',
              ':passwordHash': '!deleted',
            },
            ConditionExpression: 'attribute_exists(pk)',
          },
        },
      ],
    })
  );
  // A deleted account must not keep sellable inventory or standing offers:
  // cancel active resale listings and offers so nothing can be purchased on
  // behalf of a deleted user.
  const [listings, offers] = await Promise.all([
    listSellerListings(id),
    listUserOffers(id),
  ]);
  for (const listing of listings.items) {
    if (listing.status === 'ACTIVE' || listing.status === 'CHECKOUT') {
      await cancelListing(id, listing.ticketCode).catch(() => undefined);
    }
  }
  for (const offer of offers.items) {
    if (offer.status === 'ACTIVE') {
      await cancelOffer(id, offer.id).catch(() => undefined);
    }
  }
  await revokeAllRefreshTokens(id).catch(() => undefined);
  return true;
}

// ---------- promo CRUD ----------

const PROMOS_GSI_PK = 'PROMOS#ALL';

export async function createPromo(input: PromoCode & { creatorId: string }): Promise<PromoCode> {
  const code = input.code.trim().toUpperCase();
  const timestamp = now();
  const promo: PromoCode = {
    ...input,
    code,
    usedCount: input.usedCount ?? 0,
    active: input.active ?? true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: promoPk(code),
        sk: 'METADATA',
        ...promo,
        gsi1pk: PROMOS_GSI_PK,
        gsi1sk: createdSk(timestamp, code),
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  );
  return promo;
}

export async function listPromos(creatorId?: string): Promise<PromoCode[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': PROMOS_GSI_PK },
      ScanIndexForward: false,
      Limit: 200,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[])
    .map((item) => stripKeys(item) as unknown as PromoCode)
    .filter((promo) => !creatorId || promo.creatorId === creatorId);
}

export async function updatePromo(
  code: string,
  fields: Partial<Omit<PromoCode, 'code' | 'usedCount'>>
): Promise<PromoCode | null> {
  const key = promoPk(code);
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: key, sk: 'METADATA' } })
  );
  if (!res.Item) return null;
  const next = {
    ...(res.Item as Record<string, unknown>),
    ...fields,
    code: code.toUpperCase(),
    updatedAt: now(),
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        ...next,
        pk: key,
        sk: 'METADATA',
        gsi1pk: PROMOS_GSI_PK,
        gsi1sk: (res.Item as { gsi1sk?: string }).gsi1sk ?? createdSk(now(), code.toUpperCase()),
      },
    })
  );
  return stripKeys(next) as unknown as PromoCode;
}

export async function deletePromo(code: string): Promise<boolean> {
  try {
    await docClient.send(
      new DeleteCommand({ TableName: T(), Key: { pk: promoPk(code), sk: 'METADATA' } })
    );
    return true;
  } catch {
    return false;
  }
}

export async function incrementPromoUsage(code: string): Promise<void> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: promoPk(code), sk: 'METADATA' },
        UpdateExpression: 'ADD usedCount :one SET updatedAt = :now',
        ExpressionAttributeValues: { ':one': 1, ':now': now() },
        ConditionExpression: 'attribute_exists(pk)',
      })
    );
  } catch (e) {
    if (!isConditionalCheck(e)) throw e;
  }
}

// ---------- creator broadcasts ----------

export interface Broadcast {
  id: string;
  eventId: string;
  creatorId: string;
  audience: string;
  audienceFilter?: { tierName?: string; sectionName?: string; checkedIn?: boolean };
  message: string;
  channels: { push: boolean; email: boolean; sms: boolean };
  recipientCount: number;
  recipientIds?: string[];
  createdAt: string;
}

const broadcastPk = (eventId: string) => `BROADCAST#${eventId}`;
const broadcastsGsiPk = (eventId: string) => `BROADCASTS#${eventId}`;

export async function createBroadcast(input: Omit<Broadcast, 'id' | 'createdAt'>): Promise<Broadcast> {
  const id = randomUUID();
  const createdAt = now();
  const broadcast: Broadcast = { ...input, id, createdAt };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: broadcastPk(input.eventId),
        sk: createdSk(createdAt, id),
        ...broadcast,
        gsi1pk: broadcastsGsiPk(input.eventId),
        gsi1sk: createdAt,
      },
    })
  );
  return broadcast;
}

export async function listEventBroadcasts(eventId: string): Promise<Broadcast[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': broadcastsGsiPk(eventId) },
      ScanIndexForward: false,
      Limit: 20,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map(
    (item) => stripKeys(item) as unknown as Broadcast
  );
}

export async function listBroadcastsForEvents(eventIds: string[]): Promise<Broadcast[]> {
  const feeds = await Promise.all(eventIds.map((eventId) => listEventBroadcasts(eventId)));
  return feeds.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
}

export async function setUserStripeCustomerId(id: string, stripeCustomerId: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: userPk(id), sk: 'PROFILE' },
      UpdateExpression: 'SET stripeCustomerId = :id',
      ExpressionAttributeValues: { ':id': stripeCustomerId },
      ConditionExpression: 'attribute_exists(pk)',
    })
  );
}

// ---------- refresh tokens (opaque, rotating) ----------

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Issues a new refresh token for the user. Only one active refresh token per
// user: issuing a new one revokes the previous (rotation on every refresh).
export async function issueRefreshToken(userId: string): Promise<string> {
  const token = randomUUID() + randomUUID();
  const tokenHash = hashToken(token);
  const createdAt = now();
  // Revoke any existing refresh tokens for this user first.
  await revokeAllRefreshTokens(userId);
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: refreshPk(tokenHash),
        sk: 'TOKEN',
        userId,
        createdAt,
        gsi2pk: `USER#${userId}#REFRESH`,
        gsi2sk: createdSk(createdAt, tokenHash.slice(0, 12)),
      },
    })
  );
  return token;
}

export async function getRefreshTokenUserId(token: string): Promise<string | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: refreshPk(hashToken(token)), sk: 'TOKEN' } })
  );
  return (res.Item?.userId as string | undefined) ?? null;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({ TableName: T(), Key: { pk: refreshPk(hashToken(token)), sk: 'TOKEN' } })
  );
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}#REFRESH` },
    })
  );
  for (const item of res.Items ?? []) {
    const pk = item.pk as string;
    await docClient.send(new DeleteCommand({ TableName: T(), Key: { pk, sk: 'TOKEN' } }));
  }
}

// ---------- email verification tokens ----------

export async function createEmailVerificationToken(userId: string, email: string): Promise<string> {
  const token = randomUUID() + randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: verifyPk(hashToken(token)),
        sk: 'TOKEN',
        userId,
        email: email.toLowerCase(),
        expiresAt,
        createdAt: now(),
      },
    })
  );
  return token;
}

export async function consumeEmailVerificationToken(
  token: string
): Promise<{ userId: string; email: string } | null> {
  const key = { pk: verifyPk(hashToken(token)), sk: 'TOKEN' };
  const res = await docClient.send(new GetCommand({ TableName: T(), Key: key }));
  const item = res.Item as { userId?: string; email?: string; expiresAt?: string } | undefined;
  if (!item?.userId || !item.expiresAt || new Date(item.expiresAt) <= new Date()) return null;
  await docClient.send(new DeleteCommand({ TableName: T(), Key: key }));
  return { userId: item.userId, email: item.email ?? '' };
}

// ---------- referrals ----------

export async function getUserByReferralCode(code: string): Promise<User | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: `USER#REFERRAL#${code.toUpperCase()}`, sk: 'ID' } })
  );
  const userId = res.Item?.userId as string | undefined;
  return userId ? getUserById(userId) : null;
}

// Records a referral relationship: sets referredByCode on the new user (once),
// increments the referrer's count, and writes a REFERRAL# row for listing.
export async function applyReferralCode(userId: string, code: string): Promise<boolean> {
  const referrer = await getUserByReferralCode(code);
  if (!referrer || referrer.id === userId || referrer.deletedAt) return false;
  const user = await getUserById(userId);
  if (!user || user.referredByCode) return false;
  const createdAt = now();
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: T(),
              Key: { pk: userPk(userId), sk: 'PROFILE' },
              UpdateExpression: 'SET referredByCode = :code',
              ConditionExpression: 'attribute_not_exists(referredByCode)',
              ExpressionAttributeValues: { ':code': referrer.referralCode },
            },
          },
          {
            Update: {
              TableName: T(),
              Key: { pk: userPk(referrer.id), sk: 'PROFILE' },
              UpdateExpression: 'ADD referralCount :one',
              ExpressionAttributeValues: { ':one': 1 },
            },
          },
          {
            Put: {
              TableName: T(),
              Item: {
                pk: userPk(referrer.id),
                sk: `REFERRAL#${createdAt}#${userId}`,
                referredUserId: userId,
                referredEmail: user.email,
                referredName: [user.firstName, user.lastName].filter(Boolean).join(' '),
                createdAt,
                gsi2pk: userReferralsPk(referrer.id),
                gsi2sk: createdSk(createdAt, userId),
              },
            },
          },
        ],
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false; // already referred
    throw e;
  }
}

const userReferralsPk = (userId: string) => `USER#${userId}#REFERRALS`;

export interface ReferralRow {
  referredUserId: string;
  referredEmail: string;
  referredName: string;
  createdAt: string;
}

export async function listUserReferrals(userId: string): Promise<ReferralRow[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': userReferralsPk(userId) },
      ScanIndexForward: false,
      Limit: 200,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => ({
    referredUserId: item.referredUserId as string,
    referredEmail: item.referredEmail as string,
    referredName: item.referredName as string,
    createdAt: item.createdAt as string,
  }));
}

// Registers the referral-code lookup item for a new user. Called right after
// createUser so codes are resolvable immediately.
export async function registerReferralCode(userId: string, code: string): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: `USER#REFERRAL#${code.toUpperCase()}`, sk: 'ID', userId },
    })
  );
}

// ---------- Stripe Connect (payouts) ----------

export async function setUserStripeConnectAccount(
  id: string,
  accountId: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: userPk(id), sk: 'PROFILE' },
      UpdateExpression: 'SET stripeConnectAccountId = :acct',
      ExpressionAttributeValues: { ':acct': accountId },
      ConditionExpression: 'attribute_exists(pk)',
    })
  );
}

export async function updateUserStripeConnectStatus(
  id: string,
  fields: {
    detailsSubmitted?: boolean;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  }
): Promise<void> {
  const sets: string[] = [];
  const values: Record<string, unknown> = {};
  let i = 0;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    sets.push(`stripeConnect${key[0].toUpperCase()}${key.slice(1)} = :v${i}`);
    values[`:v${i}`] = value;
    i++;
  }
  if (sets.length === 0) return;
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: userPk(id), sk: 'PROFILE' },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(pk)',
    })
  );
}

// ---------- withdrawals ----------

export interface Withdrawal {
  id: string;
  userId: string;
  amountCents: number;
  currency: string;
  stripePayoutId?: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  createdAt: string;
}

export async function createWithdrawal(input: {
  userId: string;
  amountCents: number;
  currency: string;
  stripePayoutId?: string;
}): Promise<Withdrawal> {
  const id = randomUUID();
  const createdAt = now();
  const withdrawal: Withdrawal = {
    id,
    userId: input.userId,
    amountCents: input.amountCents,
    currency: input.currency,
    stripePayoutId: input.stripePayoutId,
    status: 'PENDING',
    createdAt,
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: withdrawalPk(id),
        sk: 'METADATA',
        ...withdrawal,
        gsi2pk: userWithdrawalsPk(input.userId),
        gsi2sk: createdSk(createdAt, id),
      },
    })
  );
  return withdrawal;
}

const userWithdrawalsPk = (userId: string) => `USER#${userId}#WITHDRAWALS`;

export async function updateWithdrawal(
  id: string,
  fields: Partial<Pick<Withdrawal, 'status' | 'stripePayoutId'>>
): Promise<void> {
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const sets: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    names[`#${key}`] = key;
    values[`:${key}`] = value;
    sets.push(`#${key} = :${key}`);
  }
  if (sets.length === 0) return;
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: withdrawalPk(id), sk: 'METADATA' },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

export async function listUserWithdrawals(userId: string): Promise<Withdrawal[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': userWithdrawalsPk(userId) },
      ScanIndexForward: false,
      Limit: 200,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as Withdrawal;
  });
}

// ---------- seat-level inventory ----------

export interface SectionSeat {
  sectionId: string;
  seatLabel: string;
  status: 'AVAILABLE' | 'HELD' | 'SOLD';
  accessible: boolean;
  permanentlyHeld: boolean;
}

function seatLabelFor(rowIndex: number, col: number): string {
  // A..Z then AA.. for large venues.
  let label = '';
  let n = rowIndex;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `${label}-${col}`;
}

// Generates the seat list for a section from its layout geometry. Returns []
// when the section has no row/seat geometry (capacity-only sections).
export function seatsForSection(section: VenueSection): { label: string; accessible: boolean; held: boolean }[] {
  const rows = section.rows ?? 0;
  const seatsPerRow = section.seatsPerRow ?? 0;
  if (rows < 1 || seatsPerRow < 1) return [];
  const total = Math.min(section.capacity, rows * seatsPerRow);
  const seats: { label: string; accessible: boolean; held: boolean }[] = [];
  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / seatsPerRow);
    const col = (i % seatsPerRow) + 1;
    seats.push({ label: seatLabelFor(row, col), accessible: false, held: false });
  }
  // Accessible seats at the back, permanently-held seats at the front.
  const accessibleCount = Math.min(section.accessibleCount ?? 0, total);
  const heldCount = Math.min(section.heldCount ?? 0, total - accessibleCount);
  for (let i = total - accessibleCount; i < total; i++) seats[i].accessible = true;
  for (let i = 0; i < heldCount; i++) seats[i].held = true;
  return seats;
}

async function listRawSeats(eventId: string, sectionId: string): Promise<Record<string, unknown>[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': eventPk(eventId), ':prefix': `SEAT#${sectionId}#` },
    })
  );
  return (res.Items ?? []) as Record<string, unknown>[];
}

// Lazily materializes seat rows for a section on first access. Idempotent and
// race-safe: concurrent ensures lose the condition check and re-read.
export async function ensureSectionSeats(eventId: string, section: VenueSection): Promise<void> {
  const existing = await listRawSeats(eventId, section.id);
  if (existing.length > 0) return;
  const seats = seatsForSection(section);
  if (seats.length === 0) return;
  for (let i = 0; i < seats.length; i += 90) {
    const chunk = seats.slice(i, i + 90);
    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: chunk.map((seat) => ({
            Put: {
              TableName: T(),
              Item: {
                pk: eventPk(eventId),
                sk: seatSk(section.id, seat.label),
                sectionId: section.id,
                seatLabel: seat.label,
                status: seat.held ? 'HELD' : 'AVAILABLE',
                accessible: seat.accessible,
                permanentlyHeld: seat.held,
              },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          })),
        })
      );
    } catch (e) {
      if (!isConditionalCheck(e)) throw e;
      return; // another request won the race
    }
  }
}

export async function listSectionSeats(eventId: string, sectionId: string): Promise<SectionSeat[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': eventPk(eventId), ':prefix': `SEAT#${sectionId}#` },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[])
    .map((item) => ({
      sectionId: item.sectionId as string,
      seatLabel: item.seatLabel as string,
      status: (item.status as SectionSeat['status']) ?? 'AVAILABLE',
      accessible: Boolean(item.accessible),
      permanentlyHeld: Boolean(item.permanentlyHeld),
    }))
    .sort((a, b) => a.seatLabel.localeCompare(b.seatLabel, undefined, { numeric: true }));
}

// Atomically holds specific seats: AVAILABLE → HELD. Returns false if any seat
// is unavailable (sold, held, or already reserved).
export async function reserveSeats(
  eventId: string,
  sectionId: string,
  seatLabels: string[]
): Promise<boolean> {
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: seatLabels.map((label) => ({
          Update: {
            TableName: T(),
            Key: { pk: eventPk(eventId), sk: seatSk(sectionId, label) },
            UpdateExpression: 'SET #status = :held, reservedAt = :at',
            ConditionExpression: '#status = :available',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':held': 'HELD',
              ':available': 'AVAILABLE',
              ':at': now(),
            },
          },
        })),
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// Releases held seats back to AVAILABLE (PENDING order failed/expired).
export async function releaseSeats(
  eventId: string,
  sectionId: string,
  seatLabels: string[]
): Promise<void> {
  for (let i = 0; i < seatLabels.length; i += 90) {
    const chunk = seatLabels.slice(i, i + 90);
    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: chunk.map((label) => ({
            Update: {
              TableName: T(),
              Key: { pk: eventPk(eventId), sk: seatSk(sectionId, label) },
              UpdateExpression: 'SET #status = :available REMOVE reservedAt',
              ConditionExpression: '#status = :held',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: { ':available': 'AVAILABLE', ':held': 'HELD' },
            },
          })),
        })
      );
    } catch (e) {
      if (!isConditionalCheck(e)) throw e;
    }
  }
}

// Marks held seats as SOLD at fulfillment.
export async function markSeatsSold(
  eventId: string,
  sectionId: string,
  seatLabels: string[]
): Promise<void> {
  for (let i = 0; i < seatLabels.length; i += 90) {
    const chunk = seatLabels.slice(i, i + 90);
    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: chunk.map((label) => ({
            Update: {
              TableName: T(),
              Key: { pk: eventPk(eventId), sk: seatSk(sectionId, label) },
              UpdateExpression: 'SET #status = :sold REMOVE reservedAt',
              ConditionExpression: '#status = :held',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: { ':sold': 'SOLD', ':held': 'HELD' },
            },
          })),
        })
      );
    } catch (e) {
      if (!isConditionalCheck(e)) throw e;
    }
  }
}

// ---------- cursor pagination helpers ----------

export function encodeCursor(key: Record<string, unknown> | undefined): string | undefined {
  if (!key) return undefined;
  return Buffer.from(JSON.stringify(key)).toString('base64');
}

export function decodeCursor(cursor: string | undefined): Record<string, unknown> | undefined {
  if (!cursor) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

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
    QueryCommand,
    TransactWriteCommand,
    UpdateCommand,
    type TransactWriteCommandInput
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
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
const createdSk = (iso: string, id: string) => `CREATED#${iso}#${id}`;

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
  createdAt: string;
}

export interface PromoCode {
  code: string;
  eventId?: string;
  percentOff?: number;
  amountOffCents?: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
}

export interface OrderItem {
  tierId: string;
  tierName: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  subtotalCents: number;
  discountCents: number;
  feesCents: number;
  totalCents: number;
  promoCodeText?: string;
  stripePaymentIntentId?: string;
  ticketCodes?: string[];
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
  tierId: string;
  tierName: string;
  userId: string;
  status: 'VALID' | 'USED' | 'TRANSFERRED' | 'REFUNDED';
  checkedInAt?: string;
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

export async function createUser(input: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'FAN' | 'CREATOR';
}): Promise<User> {
  const id = randomUUID();
  const createdAt = now();
  const user: User = {
    id,
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: input.role,
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
  fields: Partial<Pick<User, 'firstName' | 'lastName' | 'phone' | 'avatarUrl'>>
): Promise<User | null> {
  const names: Record<string, string> = {
    firstName: '#firstName',
    lastName: '#lastName',
    phone: '#phone',
    avatarUrl: '#avatarUrl',
  };
  const values: Record<string, unknown> = {};
  const sets: string[] = [];
  let i = 0;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const placeholder = `:v${i++}`;
    sets.push(`${names[key]} = ${placeholder}`);
    values[placeholder] = value;
  }
  if (sets.length === 0) return getUserById(id);
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: userPk(id), sk: 'PROFILE' },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: {
        '#firstName': 'firstName',
        '#lastName': 'lastName',
        '#phone': 'phone',
        '#avatarUrl': 'avatarUrl',
      },
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
  tiers: { name: string; description?: string; priceCents: number; quantity: number }[];
}): Promise<{ event: EventItem; tiers: TicketTier[] }> {
  const id = randomUUID();
  const createdAt = now();
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

async function getEventMeta(id: string): Promise<EventItem | null> {
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
}): Promise<{ event: EventItem; tiers: TicketTier[] }[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': EVENT_FEED_PK },
      ScanIndexForward: true, // soonest first
      Limit: opts.limit ?? 50,
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
  return events.map((event) => ({ event, tiers: tiersByEvent.get(event.id) ?? [] }));
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
  tier: TicketTier;
  quantity: number;
  subtotalCents: number;
  discountCents: number;
  feesCents: number;
  totalCents: number;
  promoCodeText?: string;
  expiresAt: string;
}): Promise<Order> {
  const id = randomUUID();
  const createdAt = now();
  const order: Order = {
    id,
    userId: input.userId,
    eventId: input.eventId,
    status: 'PENDING',
    subtotalCents: input.subtotalCents,
    discountCents: input.discountCents,
    feesCents: input.feesCents,
    totalCents: input.totalCents,
    promoCodeText: input.promoCodeText,
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
        {
          Put: {
            TableName: T(),
            Item: {
              pk: orderPk(id),
              sk: `ITEM#${input.tier.id}`,
              tierId: input.tier.id,
              tierName: input.tier.name,
              quantity: input.quantity,
              unitPriceCents: input.tier.priceCents,
            },
          },
        },
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
    ...items.map((item) => ({
      Update: {
        TableName: T(),
        Key: { pk: eventPk(order.eventId), sk: `TIER#${item.tierId}` },
        UpdateExpression: 'ADD available :qty',
        ExpressionAttributeValues: { ':qty': item.quantity },
      },
    })),
  ];

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

export async function listUserOrders(userId: string): Promise<
  (Order & { items: OrderItem[]; event?: { id: string; title: string; startsAt: string; location: string; imageUrl?: string } })[]
> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': userOrdersPk(userId) },
      ScanIndexForward: false,
      Limit: 100,
    })
  );
  const orders = ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as Order;
  });
  return Promise.all(
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
            userId: order.userId,
            status: 'VALID',
            createdAt,
            gsi2pk: userTicketsPk(order.userId),
            gsi2sk: createdSk(createdAt, code),
          },
        },
      });
    }
    // bump sold count per tier
    transactItems.push({
      Update: {
        TableName: T(),
        Key: { pk: eventPk(order.eventId), sk: `TIER#${item.tierId}` },
        UpdateExpression: 'ADD sold :qty',
        ExpressionAttributeValues: { ':qty': item.quantity },
      },
    });
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

export async function listUserTickets(userId: string): Promise<Ticket[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': userTicketsPk(userId) },
      ScanIndexForward: false,
      Limit: 100,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as Ticket;
  });
}

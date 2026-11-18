// DynamoDB single-table data layer for BlockTiks.
//
// Table: blocktiks (pk: String, sk: String)
// GSI1 (gsi1pk/gsi1sk): global feeds, currently the published-events feed.
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
import { createHash, createHmac, randomBytes, randomInt, randomUUID } from 'crypto';
import { docClient } from './aws';
import { env } from './env';

const T = () => env.tableName;
const now = () => new Date().toISOString();

// ---------- key helpers ----------
const userPk = (id: string) => `USER#${id}`;
const emailPk = (email: string) => `USER#EMAIL#${email.toLowerCase()}`;
const phonePk = (phone: string) => `USER#PHONE#${phone}`;
const applePk = (sub: string) => `USER#APPLE#${sub}`;
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
// GSI1 feed of every ticket issued for an event, powers the creator guest
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
// Idempotency-Key dedupe store: one row per (user, client key) holding the
// original successful response so a retry can return it verbatim (P4).
const idempotencyPk = (userId: string, key: string) =>
  `IDEMP#${userId}#${key.slice(0, 128)}`;

// ---------- types ----------
// v2 identity (no passwords): email and phone are both nullable but at least
// one is set; each is unique (lookup rows USER#EMAIL# / USER#PHONE#) and
// verified by OTP. `name` is the only field required at creation (A2);
// firstName/lastName are kept, derived from `name`, for v1 readers.
export interface User {
  id: string;
  email?: string;
  phone?: string;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  appleSub?: string;
  name?: string;
  intent?: ('going_out' | 'hosting_friends' | 'running_events')[];
  locale?: 'en' | 'ar';
  numerals?: 'latn' | 'arab';
  firstName: string;
  lastName: string;
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
  notificationPrefs?: {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
    selling?: boolean;
    remind?: boolean;
    weekly?: boolean;
  };
  referralCode?: string;
  referredByCode?: string;
  referralCount?: number;
  deletedAt?: string;
  // A4: profile-switcher landing — 'personal' or an org id the user last
  // signed into Studio as. Drives `landing` on sign-in.
  lastMode?: string;
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
  // Owning organisation (events created under X-Org-Id). Legacy events have
  // only creatorId — treated as owner for permissions and ledger routing.
  ownerOrgId?: string;
  title: string;
  description: string;
  category: string;
  startsAt: string;
  doorsAt?: string;
  endsAt?: string;
  // When sales open (E1 'scheduled' state); absent = on sale at publish.
  onSaleAt?: string;
  location: string;
  address?: string;
  // ISO 3166 alpha-2 — drives tax (P6 / decision-13).
  country?: string;
  // IANA timezone of the venue; times are stored UTC, displayed in this tz.
  venueTimezone?: string;
  imageUrl?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | 'POSTPONED';
  postponedAt?: string;
  refundWindowEndsAt?: string; // decision-2: 14-day refund window after postpone
  venueLayout?: VenueLayout;
  // Resale controls (R2/R4). resaleCapPct is a percent multiplier on face
  // (110 = face x 1.10, decision-8 default); absent = platform default.
  resaleEnabled?: boolean;
  resaleCapPct?: number;
  royaltyPct?: number;
  minAge?: number; // decision-15: DOB on account + confirm at checkout
  // ISO 4217 currency for all prices on this event (default 'usd').
  currency?: string;
  createdAt: string;
}

// E1 lifecycle. `status` stays the stored coarse enum for compatibility; this
// derives the spec's finer-grained state on read.
export function eventLifecycleState(
  event: EventItem,
  tiers?: { available?: number; quantity: number; sold: number }[]
): string {
  const nowMs = Date.now();
  switch (event.status) {
    case 'DRAFT':
      return 'draft';
    case 'CANCELLED':
      return 'cancelled';
    case 'POSTPONED':
      return 'postponed';
    case 'COMPLETED':
      return 'ended';
    case 'PUBLISHED': {
      const endMs = Date.parse(event.endsAt ?? event.startsAt);
      if (!Number.isNaN(endMs) && endMs <= nowMs) return 'ended';
      const doorsMs = event.doorsAt ? Date.parse(event.doorsAt) : NaN;
      if (!Number.isNaN(doorsMs) && doorsMs <= nowMs) return 'live';
      if (event.onSaleAt && Date.parse(event.onSaleAt) > nowMs) return 'scheduled';
      if (tiers && tiers.length > 0 && tiers.every((t) => (t.available ?? t.quantity - t.sold) <= 0)) {
        return 'sold_out';
      }
      return 'on_sale';
    }
    default:
      return 'draft';
  }
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
  // Human-facing display code (spec: SA-#####). `id` stays the primary key.
  code?: string;
  userId: string;
  eventId: string;
  kind?: OrderKind; // absent on legacy rows = TICKET
  listingCode?: string; // RESALE: ticket code being bought
  holdId?: string; // orders created through the holds checkout contract
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'CANCELLED' | 'PARTIALLY_REFUNDED';
  subtotalCents: number;
  discountCents: number;
  feesCents: number;
  taxCents?: number; // P6: VAT extracted from the all-in price (decision-13)
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
  status: 'VALID' | 'USED' | 'TRANSFERRED' | 'REFUNDED' | 'TRANSFER_PENDING' | 'VOID';
  // Face value at issuance (R2 resale cap base — the original face, never
  // the price a resale buyer paid).
  faceCents?: number;
  checkedInAt?: string;
  // D4/D1: which device admitted this ticket and when (device clock).
  checkedInDeviceId?: string;
  checkedInScannedAt?: string;
  checkedInScanId?: string;
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

export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

// Creates an account for a verified contact (OTP verify / Apple). Lookup rows
// for each contact are conditional puts, so a duplicate contact fails the
// whole transaction with ContactExistsError.
export async function createUser(input: {
  email?: string;
  phone?: string;
  name?: string;
  appleSub?: string;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  role?: 'FAN' | 'CREATOR';
  referredByCode?: string;
}): Promise<User> {
  if (!input.email && !input.phone) throw new Error('createUser: email or phone is required');
  const id = randomUUID();
  const createdAt = now();
  const name = input.name?.trim() || undefined;
  const { firstName, lastName } = splitName(name ?? '');
  const referralCode = generateReferralCode(firstName, lastName, id);
  const user: User = {
    id,
    email: input.email?.toLowerCase(),
    phone: input.phone,
    emailVerifiedAt: input.emailVerifiedAt,
    phoneVerifiedAt: input.phoneVerifiedAt,
    emailVerified: Boolean(input.emailVerifiedAt),
    appleSub: input.appleSub,
    name,
    firstName,
    lastName,
    role: input.role ?? 'FAN',
    referralCode,
    referredByCode: input.referredByCode,
    referralCount: 0,
    createdAt,
  };
  const lookup = (pk: string) => ({
    Put: {
      TableName: T(),
      Item: { pk, sk: 'ID', userId: id, createdAt },
      ConditionExpression: 'attribute_not_exists(pk)',
    },
  });
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          ...(user.email ? [lookup(emailPk(user.email))] : []),
          ...(user.phone ? [lookup(phonePk(user.phone))] : []),
          ...(user.appleSub ? [lookup(applePk(user.appleSub))] : []),
          { Put: { TableName: T(), Item: { pk: userPk(id), sk: 'PROFILE', ...user } } },
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

async function getUserByLookup(pk: string): Promise<User | null> {
  const res = await docClient.send(new GetCommand({ TableName: T(), Key: { pk, sk: 'ID' } }));
  const userId = res.Item?.userId as string | undefined;
  return userId ? getUserById(userId) : null;
}

export const getUserByEmail = (email: string) => getUserByLookup(emailPk(email));
export const getUserByPhone = (phone: string) => getUserByLookup(phonePk(phone));
export const getUserByAppleSub = (sub: string) => getUserByLookup(applePk(sub));

export function getUserByContact(contact: { kind: 'email' | 'phone'; value: string }): Promise<User | null> {
  return contact.kind === 'email' ? getUserByEmail(contact.value) : getUserByPhone(contact.value);
}

// A7: swap the user's email or phone to a freshly verified contact. The new
// lookup row is conditional (contact_taken), the old one is deleted.
export async function updateUserContact(
  id: string,
  contact: { kind: 'email' | 'phone'; value: string }
): Promise<User | null> {
  const user = await getUserById(id);
  if (!user) return null;
  const verifiedAt = now();
  const old = contact.kind === 'email' ? user.email : user.phone;
  const newPk = contact.kind === 'email' ? emailPk(contact.value) : phonePk(contact.value);
  const oldPk = old ? (contact.kind === 'email' ? emailPk(old) : phonePk(old)) : null;
  if (oldPk === newPk) return user;
  const field = contact.kind === 'email' ? 'email' : 'phone';
  const verifiedField = contact.kind === 'email' ? 'emailVerifiedAt' : 'phoneVerifiedAt';
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: T(),
              Item: { pk: newPk, sk: 'ID', userId: id, createdAt: verifiedAt },
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          ...(oldPk ? [{ Delete: { TableName: T(), Key: { pk: oldPk, sk: 'ID' } } }] : []),
          {
            Update: {
              TableName: T(),
              Key: { pk: userPk(id), sk: 'PROFILE' },
              UpdateExpression: `SET #f = :v, #vf = :at${contact.kind === 'email' ? ', emailVerified = :t' : ''}`,
              ExpressionAttributeNames: { '#f': field, '#vf': verifiedField },
              ExpressionAttributeValues: {
                ':v': contact.value,
                ':at': verifiedAt,
                ...(contact.kind === 'email' ? { ':t': true } : {}),
              },
              ConditionExpression: 'attribute_exists(pk)',
            },
          },
        ],
      })
    );
  } catch (e) {
    if (isConditionalCheck(e)) throw new EmailExistsError();
    throw e;
  }
  return getUserById(id);
}

// Links a Sign in with Apple subject to an existing account.
export async function linkAppleSub(id: string, sub: string): Promise<void> {
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: T(),
            Item: { pk: applePk(sub), sk: 'ID', userId: id, createdAt: now() },
            ConditionExpression: 'attribute_not_exists(pk)',
          },
        },
        {
          Update: {
            TableName: T(),
            Key: { pk: userPk(id), sk: 'PROFILE' },
            UpdateExpression: 'SET appleSub = :s',
            ExpressionAttributeValues: { ':s': sub },
            ConditionExpression: 'attribute_exists(pk)',
          },
        },
      ],
    })
  );
}

export async function updateUser(
  id: string,
  fields: Partial<
    Pick<
      User,
      | 'firstName'
      | 'lastName'
      | 'name'
      | 'intent'
      | 'locale'
      | 'numerals'
      | 'emailVerifiedAt'
      | 'phoneVerifiedAt'
      | 'avatarUrl'
      | 'firstNameAr'
      | 'city'
      | 'interests'
      | 'dateOfBirth'
      | 'emailVerified'
      | 'notificationPrefs'
      | 'lastMode'
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

// ---------- events & tiers ----------

export async function createEventWithTiers(input: {
  creatorId: string;
  ownerOrgId?: string;
  title: string;
  description: string;
  category: string;
  startsAt: string;
  doorsAt?: string;
  endsAt?: string;
  onSaleAt?: string;
  location: string;
  address?: string;
  country?: string;
  venueTimezone?: string;
  imageUrl?: string;
  currency?: string;
  resaleEnabled?: boolean;
  resaleCapPct?: number;
  royaltyPct?: number;
  minAge?: number;
  tiers: { name: string; description?: string; priceCents: number; quantity: number; saleStartsAt?: string; saleEndsAt?: string }[];
}): Promise<{ event: EventItem; tiers: TicketTier[] }> {
  const id = randomUUID();
  const createdAt = now();
  const currency = (input.currency ?? 'usd').toLowerCase();
  if (!/^[a-z]{3}$/.test(currency)) throw new ConditionFailedError('Invalid currency');
  const event: EventItem = {
    id,
    creatorId: input.creatorId,
    ownerOrgId: input.ownerOrgId,
    title: input.title,
    description: input.description,
    category: input.category,
    startsAt: input.startsAt,
    doorsAt: input.doorsAt,
    endsAt: input.endsAt,
    onSaleAt: input.onSaleAt,
    location: input.location,
    address: input.address,
    country: input.country?.toUpperCase(),
    venueTimezone: input.venueTimezone,
    imageUrl: input.imageUrl,
    status: 'DRAFT',
    resaleEnabled: input.resaleEnabled ?? true,
    resaleCapPct: input.resaleCapPct,
    royaltyPct: input.royaltyPct,
    minAge: input.minAge,
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
    saleStartsAt: t.saleStartsAt,
    saleEndsAt: t.saleEndsAt,
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
  const target = Math.max(1, opts.limit ?? 50);
  const nowMs = Date.now();
  const maxScanPages = 20;
  let scanPages = 0;
  const availabilityMs = (event: EventItem) => {
    const endMs = Date.parse(event.endsAt ?? '');
    const startMs = Date.parse(event.startsAt);
    return Number.isNaN(endMs) ? startMs : endMs;
  };

  const matches: EventItem[] = [];
  let exclusiveStartKey = decodeCursor(opts.cursor) as
    | Record<string, unknown>
    | undefined;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  // The feed is sorted soonest-first, so ended events cluster at the front.
  // Scan until filled with available events, but cap pages so misses do not
  // read the entire catalog; nextCursor lets callers continue scanning.
  while (matches.length < target && scanPages < maxScanPages) {
    scanPages += 1;
    const remaining = target - matches.length;
    const limit = Math.max(1, Math.min(remaining, 50));
    const res = await docClient.send(
      new QueryCommand({
        TableName: T(),
        IndexName: 'gsi1',
        KeyConditionExpression: 'gsi1pk = :pk',
        ExpressionAttributeValues: { ':pk': EVENT_FEED_PK },
        ScanIndexForward: true,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey as never,
      })
    );

    let events = ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
      const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = item;
      return rest as unknown as EventItem;
    });
    events = events.filter((event) => {
      if (opts.category && event.category.toLowerCase() !== opts.category!.toLowerCase()) {
        return false;
      }
      if (opts.q) {
        const needle = opts.q.toLowerCase();
        const matchesQuery =
          event.title.toLowerCase().includes(needle) ||
          event.location.toLowerCase().includes(needle);
        if (!matchesQuery) return false;
      }
      const availableAt = availabilityMs(event);
      return !Number.isNaN(availableAt) && availableAt >= nowMs;
    });
    matches.push(...events);

    lastEvaluatedKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    if (!lastEvaluatedKey) break;
    exclusiveStartKey = lastEvaluatedKey;
  }

  // Fetch tiers for all matched events in parallel.
  // (Tiers live under each EVENT#<id> partition; a batch tier-index could be
  // added later if this ever becomes hot.)
  const tiersByEvent = new Map<string, TicketTier[]>();
  await Promise.all(
    matches.map(async (event) => {
      tiersByEvent.set(event.id, await getTiersForEvent(event.id));
    })
  );
  const items = matches.map((event) => ({
    event,
    tiers: tiersByEvent.get(event.id) ?? [],
  }));
  return { items, nextCursor: encodeCursor(lastEvaluatedKey) };
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
  // Org-owned events are published by org admin/cohost; legacy events by
  // their creator (platform ADMIN always allowed). Throws messages that map
  // 1:1 to spec error codes so routes can echo them.
  if (!(await canManageEvent(event, actorId, actorRole))) {
    throw new ConditionFailedError('Not the event creator');
  }
  const tiers = await getTiersForEvent(id);
  if (tiers.length === 0) {
    throw new ConditionFailedError('no_tiers');
  }
  if (event.ownerOrgId) {
    const org = await getOrg(event.ownerOrgId);
    if (org?.verificationStatus !== 'approved') {
      throw new ConditionFailedError('org_unverified');
    }
    // Publish is blocked until every co-host accepts their split.
    const hosts = await listEventHosts(id);
    if (hosts.some((h) => h.role === 'cohost' && !h.accepted)) {
      throw new ConditionFailedError('splits_not_accepted');
    }
  }
  if (event.status === 'PUBLISHED') return event;
  if (event.status === 'CANCELLED') throw new ConditionFailedError('cancelled');
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
  holdId?: string;
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  feesCents: number;
  taxCents?: number;
  totalCents: number;
  promoCodeText?: string;
  currency?: string;
  expiresAt: string;
}): Promise<Order> {
  const id = randomUUID();
  const createdAt = now();
  const order: Order = {
    id,
    code: `SA-${randomInt(10000, 100000)}`,
    userId: input.userId,
    eventId: input.eventId,
    kind: input.kind ?? 'TICKET',
    listingCode: input.listingCode,
    holdId: input.holdId,
    status: 'PENDING',
    subtotalCents: input.subtotalCents,
    discountCents: input.discountCents,
    feesCents: input.feesCents,
    taxCents: input.taxCents,
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
        // Expiry index, lets the sweeper find stale PENDING orders via GSI1.
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

// Credit held tickets back to a tier (no order context, used when order
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
  // Hold-based orders can carry resale lines (item.ticketCode); release each
  // claimed listing back to ACTIVE.
  for (const item of items) {
    if (item.ticketCode) {
      transactItems.push({
        Update: {
          TableName: T(),
          Key: { pk: listingPk(item.ticketCode), sk: 'METADATA' },
          UpdateExpression: 'SET #status = :active',
          ConditionExpression: '#status = :checkout',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':active': 'ACTIVE', ':checkout': 'CHECKOUT' },
        },
      });
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

// Find PENDING orders / active holds whose reservation window has passed.
// Driven by the EXPIRE index items on GSI1 (gsi1pk='EXPIRE', gsi1sk=expiresAt):
// each index item carries `orderId` (EXPIRE#<id>) or `holdId` (HEXPIRE#<id>).
export async function listExpiredIndex(
  nowIso: string,
  limit = 100
): Promise<{ orderId?: string; holdId?: string; transferId?: string }[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk < :now',
      ExpressionAttributeValues: { ':pk': EXPIRE_GSI_PK, ':now': nowIso },
      Limit: limit,
    })
  );
  return (res.Items ?? []) as { orderId?: string; holdId?: string; transferId?: string }[];
}

export async function listExpiredPendingOrders(nowIso: string, limit = 100): Promise<string[]> {
  const items = await listExpiredIndex(nowIso, limit);
  return items.map((i) => i.orderId).filter((x): x is string => Boolean(x));
}

export async function deleteExpireIndex(orderId: string) {
  await docClient.send(
    new DeleteCommand({ TableName: T(), Key: { pk: expirePk(orderId), sk: 'INDEX' } })
  );
}

// ---------- idempotency keys ----------

export interface IdempotentRecord {
  orderId?: string;
  response: Record<string, unknown>;
  createdAt: string;
}

// Returns the stored response for a previously-seen key, or null on first use.
export async function getIdempotentResponse(
  userId: string,
  key: string
): Promise<IdempotentRecord | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: idempotencyPk(userId, key), sk: 'META' } })
  );
  if (!res.Item) return null;
  const { pk, sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as IdempotentRecord;
}

// First-write-wins: a racing duplicate request keeps the original record.
export async function recordIdempotentResponse(
  userId: string,
  key: string,
  orderId: string | undefined,
  response: Record<string, unknown>
): Promise<void> {
  try {
    await docClient.send(
      new PutCommand({
        TableName: T(),
        Item: {
          pk: idempotencyPk(userId, key),
          sk: 'META',
          orderId,
          response,
          createdAt: now(),
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      })
    );
  } catch (e) {
    if (!isConditionalCheck(e)) throw e;
  }
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
// Idempotent, the order update is conditional on status = PENDING.
export async function fulfillOrder(orderId: string, paymentIntentId: string): Promise<'fulfilled' | 'already'> {
  const order = await getOrderMeta(orderId);
  if (!order) return 'already';
  if (order.status !== 'PENDING') return 'already';
  // Hold-based orders may mix GA / seated / resale lines — unified path.
  // Every path funnels through fulfillAndRecord so the ledger post happens
  // exactly once (fulfillment itself is atomic; the ledger is append-only
  // so a retried post would double-count — keyed on this status flip).
  const fulfillAndRecord = async (
    fn: () => Promise<'fulfilled' | 'already'>
  ): Promise<'fulfilled' | 'already'> => {
    const result = await fn();
    if (result === 'fulfilled') {
      await recordSaleLedger(order).catch((e) =>
        console.error(`fulfillOrder: ledger post failed for ${orderId}`, e)
      );
    }
    return result;
  };
  if (order.holdId) return fulfillAndRecord(() => fulfillHoldOrder(orderId, paymentIntentId));
  if (order.kind === 'RESALE') return fulfillAndRecord(() => fulfillResaleOrder(order, paymentIntentId));
  if (order.kind === 'SEATED') return fulfillAndRecord(() => fulfillSeatedOrder(order, paymentIntentId));
  return fulfillAndRecord(async () => {

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
    expireIndexDelete(orderId), // reservation consumed, stop the sweeper
  ];

  // tickets (denormalized for the wallet UI) + a v1 credential each (R1).
  let idx = 0;
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      const code = ticketCodes[idx++];
      const cred = credentialItem(code, 1, createdAt);
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
            faceCents: item.unitPriceCents,
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
      transactItems.push({ Put: { TableName: T(), Item: cred.item } });
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
    if (isConditionalCheck(e)) return 'already'; // webhook retry / race, safe
    throw e;
  }
  return 'fulfilled';
  });
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

// ---------- ticket credentials (R1, decision-1 default: option b) ----------
//
// The ticket code is the human/wallet identifier; the QR carries a versioned
// credential payload `sahra1.<ticketCode>.<version>.<secret>`. Every change
// of holder (resale, transfer claim, refund/void) revokes the current
// credential and issues version+1, so a screenshotted QR scans `superseded`.
// TODO(decision-1): option (c) time-based QR rotation is deferred — the
// credential response returns rotates_at: null.

export interface TicketCredential {
  ticketCode: string;
  version: number;
  secret: string;
  payload: string;
  // sha256(payload) — what the offline door manifest stores (never the secret).
  hash: string;
  issuedAt: string;
  revokedAt?: string;
}

const credSk = (version: number) => `CRED#${String(version).padStart(4, '0')}`;

export function credentialPayloadFor(ticketCode: string, version: number, secret: string): string {
  return `sahra1.${ticketCode}.${version}.${secret}`;
}

export function credentialHash(payload: string): string {
  return createHash('sha256').update(payload).digest('hex');
}

// Parses a scanned QR payload. Returns null for anything that isn't a Sahra
// credential (e.g. a bare legacy ticket code, which callers handle separately).
export function parseCredentialPayload(
  raw: string
): { ticketCode: string; version: number; secret: string } | null {
  const m = /^sahra1\.(.+)\.(\d+)\.([A-Za-z0-9_-]+)$/.exec(raw.trim());
  if (!m) return null;
  return { ticketCode: m[1], version: parseInt(m[2], 10), secret: m[3] };
}

function credentialItem(
  ticketCode: string,
  version: number,
  issuedAt: string
): { item: Record<string, unknown>; credential: TicketCredential } {
  const secret = randomUUID().replace(/-/g, '');
  const payload = credentialPayloadFor(ticketCode, version, secret);
  const credential: TicketCredential = {
    ticketCode,
    version,
    secret,
    payload,
    hash: credentialHash(payload),
    issuedAt,
  };
  return {
    item: {
      pk: ticketPk(ticketCode),
      sk: credSk(version),
      ...credential,
    },
    credential,
  };
}

function stripCredKeys(item: Record<string, unknown>): TicketCredential {
  const { pk, sk, ...rest } = item;
  return rest as unknown as TicketCredential;
}

export async function listCredentials(ticketCode: string): Promise<TicketCredential[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': ticketPk(ticketCode), ':prefix': 'CRED#' },
    })
  );
  return (res.Items ?? []).map((item) => stripCredKeys(item as Record<string, unknown>));
}

export async function getCurrentCredential(ticketCode: string): Promise<TicketCredential | null> {
  const creds = await listCredentials(ticketCode);
  return creds.filter((c) => !c.revokedAt).sort((a, b) => b.version - a.version)[0] ?? null;
}

// Issues version 1 for a ticket that has none (legacy rows predating
// credentials get backfilled lazily on first access).
export async function ensureTicketCredential(ticketCode: string): Promise<TicketCredential> {
  const current = await getCurrentCredential(ticketCode);
  if (current) return current;
  const { item, credential } = credentialItem(ticketCode, 1, now());
  try {
    await docClient.send(
      new PutCommand({
        TableName: T(),
        Item: item,
        ConditionExpression: 'attribute_not_exists(pk)',
      })
    );
  } catch (e) {
    if (!isConditionalCheck(e)) throw e;
    const raced = await getCurrentCredential(ticketCode);
    if (raced) return raced;
  }
  return credential;
}

// Revoke the current credential and issue the next version. Used outside a
// transaction (transfer claim path); the fulfill path uses the txn variants
// below so rotation is atomic with the ownership move.
export async function rotateTicketCredential(ticketCode: string): Promise<TicketCredential> {
  const current = await getCurrentCredential(ticketCode);
  const nextVersion = (current?.version ?? 0) + 1;
  const issuedAt = now();
  const transactItems: TransactWriteCommandInput['TransactItems'] = [];
  if (current) {
    transactItems.push({
      Update: {
        TableName: T(),
        Key: { pk: ticketPk(ticketCode), sk: credSk(current.version) },
        UpdateExpression: 'SET revokedAt = :at',
        ExpressionAttributeValues: { ':at': issuedAt },
      },
    });
  }
  const { item, credential } = credentialItem(ticketCode, nextVersion, issuedAt);
  transactItems.push({ Put: { TableName: T(), Item: item } });
  await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
  return credential;
}

type TxnItems = NonNullable<TransactWriteCommandInput['TransactItems']>;

// TransactWrite pieces for rotating a credential inside a larger transaction.
// Returns the ops plus the credential that will become current.
export async function credentialRotateOps(ticketCode: string): Promise<{
  ops: TxnItems;
  credential: TicketCredential;
}> {
  const current = await getCurrentCredential(ticketCode);
  const nextVersion = (current?.version ?? 0) + 1;
  const issuedAt = now();
  const ops: TxnItems = [];
  if (current) {
    ops.push({
      Update: {
        TableName: T(),
        Key: { pk: ticketPk(ticketCode), sk: credSk(current.version) },
        UpdateExpression: 'SET revokedAt = :at',
        ConditionExpression: 'attribute_not_exists(revokedAt)',
        ExpressionAttributeValues: { ':at': issuedAt },
      },
    });
  }
  const { item, credential } = credentialItem(ticketCode, nextVersion, issuedAt);
  ops.push({ Put: { TableName: T(), Item: item } });
  return { ops, credential };
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
  // X2/R1: the sender's QR stops working on transfer — rotate the credential
  // in the same transaction as the ownership move.
  const rotate = await credentialRotateOps(input.ticketCode);
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
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
            },
          },
          ...rotate.ops,
        ],
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
  // PriceWatch upgrades (J): tier_id joins the name-based tierKey so new
  // watches target the tier id while legacy offers keep matching by name.
  tierId?: string;
  tierName: string;
  tierKey: string;
  sectionName?: string;
  maxPriceCents: number;
  quantity: number;
  matchedCount: number;
  status: 'ACTIVE' | 'MATCHED' | 'CANCELLED' | 'PAUSED';
  // W2: saved payment method for auto-buy on match (Stripe pm_ id).
  paymentMethodId?: string;
  autoBuy?: boolean;
  // W4: a failed auto-charge pauses the watch until the buyer resumes.
  pausedReason?: string;
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
  tierId?: string;
  sectionName?: string;
  maxPriceCents: number;
  quantity: number;
  paymentMethodId?: string;
  autoBuy?: boolean;
}): Promise<Offer> {
  const event = await getEventMeta(input.eventId);
  if (!event || event.status !== 'PUBLISHED') throw new OfferError('Event is not on sale');
  if (!input.tierName?.trim()) throw new OfferError('Ticket tier is required');
  if (!Number.isInteger(input.maxPriceCents) || input.maxPriceCents < 1) {
    throw new OfferError('Enter a valid max price');
  }
  // B1: max 6 tickets per order — a standing watch can't exceed it either.
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 6) {
    throw new OfferError('Quantity must be between 1 and 6');
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
    tierId: input.tierId,
    tierName: input.tierName.trim(),
    tierKey,
    sectionName: input.sectionName?.trim() || undefined,
    maxPriceCents: input.maxPriceCents,
    quantity: input.quantity,
    matchedCount: 0,
    status: 'ACTIVE',
    paymentMethodId: input.paymentMethodId,
    autoBuy: input.autoBuy,
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
  }).then((all) =>
    // Watches that carry a tierId only match listings in the same tier;
    // name-keyed legacy watches match by tier name as before.
    all.filter((o) => !o.tierId || !listing.tierId || o.tierId === listing.tierId)
  );
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

// W4: a failed auto-charge pauses the watch; the buyer resumes it explicitly.
export async function pauseOffer(offerId: string, reason: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: offerPk(offerId), sk: 'METADATA' },
      UpdateExpression: 'SET #status = :paused, pausedReason = :reason REMOVE gsi1pk, gsi1sk',
      ConditionExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':paused': 'PAUSED', ':active': 'ACTIVE', ':reason': reason },
    })
  );
}

export async function resumeOffer(
  userId: string,
  offerId: string
): Promise<'resumed' | 'not_found' | 'forbidden'> {
  const offer = await getOffer(offerId);
  if (!offer) return 'not_found';
  if (offer.buyerId !== userId) return 'forbidden';
  if (offer.status !== 'PAUSED') return 'not_found';
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: offerPk(offerId), sk: 'METADATA' },
      UpdateExpression:
        'SET #status = :active, gsi1pk = :gpk, gsi1sk = :gsk REMOVE pausedReason',
      ConditionExpression: '#status = :paused',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':active': 'ACTIVE',
        ':paused': 'PAUSED',
        ':gpk': ACTIVE_OFFERS_GSI_PK,
        ':gsk': offerGsiSk(offer.eventId, offer.tierKey, offer.createdAt, offer.id),
      },
    })
  );
  return 'resumed';
}

export type CheckInResult =
  | { result: 'OK'; ticket: Ticket }
  | { result: 'ALREADY_USED'; ticket: Ticket }
  | { result: 'VOID'; ticket: Ticket }
  | { result: 'SUPERSEDED'; ticket: Ticket }
  | { result: 'WRONG_EVENT' }
  | { result: 'NOT_FOUND' }
  | { result: 'FORBIDDEN' };

// Creator/admin scans a ticket code or a `sahra1.` credential payload at the
// door. Atomic VALID → USED flip so two scanners can't both get a green
// light. Stale credential versions scan SUPERSEDED (R1).
export async function checkInTicket(
  eventId: string,
  code: string,
  actorId: string,
  actorRole: string,
  scan?: { deviceId?: string; scannedAt?: string; scanId?: string }
): Promise<CheckInResult> {
  const event = await getEventMeta(eventId);
  if (!event) return { result: 'NOT_FOUND' };
  // Door scans are allowed for owner-org admin/cohost plus scoped gate
  // staff (G); legacy creator-owned events keep the creatorId check.
  if (!(await canManageEvent(event, actorId, actorRole, ['admin', 'cohost', 'gate']))) {
    return { result: 'FORBIDDEN' };
  }
  const parsed = parseCredentialPayload(code);
  const ticketCode = parsed?.ticketCode ?? code;
  const ticket = await getTicketByCode(ticketCode);
  if (!ticket) return { result: 'NOT_FOUND' };
  if (ticket.eventId !== eventId) return { result: 'WRONG_EVENT' };
  // D1: a USED ticket reports when/where it was admitted; any other non-VALID
  // state (refunded, transferred away, void) scans as VOID, not ALREADY_USED.
  if (ticket.status === 'USED') {
    return { result: 'ALREADY_USED', ticket };
  }
  if (ticket.status !== 'VALID') {
    return { result: 'VOID', ticket };
  }
  // Credential payloads must be the current unrevoked version; an older QR
  // (e.g. a screenshot taken before a resale) is SUPERSEDED.
  if (parsed) {
    const creds = await listCredentials(ticketCode);
    const presented = creds.find(
      (c) => c.version === parsed.version && c.secret === parsed.secret
    );
    const current = creds
      .filter((c) => !c.revokedAt)
      .sort((a, b) => b.version - a.version)[0];
    if (!presented || presented.revokedAt || !current || current.version !== presented.version) {
      return { result: 'SUPERSEDED', ticket };
    }
  }
  const checkedInAt = now();
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: ticketPk(ticketCode), sk: 'METADATA' },
        UpdateExpression:
          'SET #status = :used, checkedInAt = :at, checkedInDeviceId = :dev, checkedInScannedAt = :sat, checkedInScanId = :sid',
        ConditionExpression: '#status = :valid',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':used': 'USED',
          ':valid': 'VALID',
          ':at': checkedInAt,
          ':dev': scan?.deviceId ?? 'manual',
          ':sat': scan?.scannedAt ?? checkedInAt,
          ':sid': scan?.scanId ?? checkedInAt,
        },
      })
    );
    return { result: 'OK', ticket: { ...ticket, status: 'USED', checkedInAt } };
  } catch (e) {
    if (isConditionalCheck(e)) {
      const fresh = await getTicketByCode(ticketCode);
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
  // Listing id. Single-ticket creates use the groupId; spec multi-ticket
  // listings share one groupId across their per-ticket rows.
  groupId?: string;
  sellerId: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventLocation: string;
  tierId?: string;
  tierName: string;
  priceCents: number;
  splitRule?: 'any' | 'all' | 'pairs';
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

export class ListingError extends Error {
  code: string;
  cap?: number;
  constructor(message: string, code = 'invalid', cap?: number) {
    super(message);
    this.code = code;
    this.cap = cap;
  }
}

// R2: resale price cap = face × resale_cap_pct, rounded. Face is the
// original face value on the ticket (not what the seller paid); for legacy
// tickets without faceCents we fall back to the current tier price.
export async function resaleCapCents(ticket: Ticket, event: EventItem | null): Promise<number> {
  let faceCents = ticket.faceCents;
  if (faceCents == null && ticket.tierId) {
    const tier = await getTier(ticket.tierId, ticket.eventId);
    faceCents = tier?.priceCents;
  }
  faceCents ??= 0;
  const capPct = event?.resaleCapPct ?? env.resaleCapPct;
  return Math.round((faceCents * capPct) / 100);
}

// List a VALID ticket for resale. One listing per ticket code (pk = code);
// re-listing after SOLD/CANCELLED overwrites the record.
export async function createListing(input: {
  sellerId: string;
  ticketCode: string;
  priceCents: number;
  splitRule?: 'any' | 'all' | 'pairs';
  groupId?: string;
}): Promise<Listing> {
  const ticket = await getTicketByCode(input.ticketCode);
  if (!ticket) throw new ListingError('Ticket not found', 'not_found');
  if (ticket.userId !== input.sellerId) throw new ListingError('Not your ticket', 'not_holder');
  // X3: a ticket with a transfer pending can't be listed.
  if (ticket.status === 'TRANSFER_PENDING') {
    throw new ListingError('Ticket has a transfer pending', 'transfer_pending');
  }
  if (ticket.status !== 'VALID') throw new ListingError('Ticket is not sellable', 'not_sellable');

  const existing = await getListing(input.ticketCode);
  if (existing && (existing.status === 'ACTIVE' || existing.status === 'CHECKOUT')) {
    throw new ListingError('Ticket is already listed', 'already_listed');
  }

  const event = await getEventMeta(ticket.eventId);
  if (event?.resaleEnabled === false) {
    throw new ListingError('The organiser disabled resale for this event', 'resale_disabled');
  }
  // R2: cap = face × cap% — checked at listing time.
  const cap = await resaleCapCents(ticket, event);
  if (input.priceCents > cap) {
    throw new ListingError(
      `Price exceeds the resale cap for this event`,
      'above_cap',
      cap
    );
  }

  const createdAt = now();
  const listing: Listing = {
    ticketCode: input.ticketCode,
    groupId: input.groupId ?? input.ticketCode,
    sellerId: input.sellerId,
    eventId: ticket.eventId,
    eventTitle: ticket.eventTitle,
    eventStartsAt: ticket.eventStartsAt,
    eventLocation: ticket.eventLocation,
    tierId: ticket.tierId,
    tierName: ticket.tierName,
    priceCents: input.priceCents,
    splitRule: input.splitRule ?? 'any',
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

// Create a (possibly multi-ticket) listing group. Each ticket gets its own
// LISTING# row under a shared groupId so checkout can claim them one at a
// time while the spec shape exposes a single listing with ticket_ids[].
export async function createListingGroup(input: {
  sellerId: string;
  ticketCodes: string[];
  priceCents: number;
  splitRule?: 'any' | 'all' | 'pairs';
}): Promise<{ groupId: string; listings: Listing[] }> {
  const groupId = randomUUID();
  const listings: Listing[] = [];
  for (const ticketCode of input.ticketCodes) {
    listings.push(
      await createListing({
        sellerId: input.sellerId,
        ticketCode,
        priceCents: input.priceCents,
        splitRule: input.splitRule,
        groupId,
      })
    );
  }
  return { groupId, listings };
}

// Active listings, optionally scoped to one event (GSI1 sk prefix).
// R7: cheapest first.
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
    .filter((l) => l.status === 'ACTIVE')
    .sort((a, b) => a.priceCents - b.priceCents || a.createdAt.localeCompare(b.createdAt));
}

// Active listings inside one tier of one event, cheapest first (R7). New
// listings carry tierId; legacy rows match by tierName.
export async function listActiveListingsForTier(
  eventId: string,
  tierId: string,
  tierName?: string
): Promise<Listing[]> {
  const listings = await listActiveListings(eventId);
  return listings.filter((l) =>
    l.tierId ? l.tierId === tierId : tierName ? l.tierName === tierName : false
  );
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

export async function cancelListing(sellerId: string, ticketCode: string): Promise<'cancelled' | 'not_found' | 'forbidden' | 'already_sold'> {
  const listing = await getListing(ticketCode);
  if (!listing) return 'not_found';
  if (listing.sellerId !== sellerId) return 'forbidden';
  if (listing.status === 'SOLD') return 'already_sold';
  if (listing.status !== 'ACTIVE') return 'not_found';
  await docClient.send(
    new DeleteCommand({ TableName: T(), Key: { pk: listingPk(ticketCode), sk: 'METADATA' } })
  );
  return 'cancelled';
}

// Cancel by listing group id (spec DELETE /listings/{id}) — removes every
// ACTIVE row in the group. Returns the same codes as cancelListing.
export async function cancelListingGroup(
  sellerId: string,
  groupId: string
): Promise<'cancelled' | 'not_found' | 'forbidden' | 'already_sold'> {
  const mine = await listSellerListings(sellerId, { limit: 200 });
  const group = mine.items.filter((l) => (l.groupId ?? l.ticketCode) === groupId);
  if (group.length === 0) {
    // Maybe the id is a bare ticket code.
    return cancelListing(sellerId, groupId);
  }
  const active = group.filter((l) => l.status === 'ACTIVE');
  if (active.length === 0) {
    return group.some((l) => l.status === 'SOLD') ? 'already_sold' : 'not_found';
  }
  for (const listing of active) {
    await docClient.send(
      new DeleteCommand({
        TableName: T(),
        Key: { pk: listingPk(listing.ticketCode), sk: 'METADATA' },
      })
    );
  }
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
  // R1: rotate the credential atomically with the ownership move — the
  // seller's QR becomes superseded the moment the buyer owns the ticket.
  const rotate = await credentialRotateOps(order.listingCode);
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
          ...rotate.ops,
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
  if (!(await canManageEvent(event, actorId, actorRole))) {
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
            faceCents: item.unitPriceCents,
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
      ticketPuts.push({ Put: { TableName: T(), Item: credentialItem(code, 1, createdAt).item } });
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

export type DeletionBlock =
  | 'has_tickets'
  | 'has_listings'
  | 'has_price_watches'
  | 'has_balance'
  | 'sole_admin';

// A6/T3: orgs where this user is the only active admin.
async function listSoleAdminOrgIds(userId: string): Promise<string[]> {
  const memberships = await listUserMemberships(userId);
  const out: string[] = [];
  for (const { membership, org } of memberships) {
    if (membership.role !== 'admin') continue;
    const admins = (await listOrgMembers(org.id)).filter(
      (m) => m.role === 'admin' && m.status === 'active'
    );
    if (admins.length <= 1) out.push(org.id);
  }
  return out;
}

// A6: account deletion is blocked while the user has upcoming tickets,
// active listings, active price watches, a non-zero earnings balance, or is
// the sole admin of an org.
export async function accountDeletionBlockers(id: string): Promise<DeletionBlock[]> {
  const blocks: DeletionBlock[] = [];
  const nowMs = Date.now();
  const [ticketsResult, listingsResult, offersResult, withdrawals, soleAdminOrgs] =
    await Promise.all([
      listUserTickets(id, { limit: 200 }),
      listSellerListings(id, { limit: 200 }),
      listUserOffers(id, { limit: 200 }),
      listUserWithdrawals(id),
      listSoleAdminOrgIds(id),
    ]);
  const upcoming = ticketsResult.items.some(
    (ticket) =>
      (ticket.status === 'VALID' || ticket.status === 'TRANSFER_PENDING') &&
      Date.parse(ticket.eventStartsAt) > nowMs
  );
  if (upcoming) blocks.push('has_tickets');
  if (listingsResult.items.some((l) => l.status === 'ACTIVE' || l.status === 'CHECKOUT')) {
    blocks.push('has_listings');
  }
  if (offersResult.items.some((o) => o.status === 'ACTIVE')) {
    blocks.push('has_price_watches');
  }
  const readyCents = listingsResult.items
    .filter((l) => l.status === 'SOLD' && Date.parse(l.eventStartsAt) <= nowMs)
    .reduce((sum, l) => sum + l.priceCents, 0);
  const withdrawnCents = withdrawals
    .filter((w) => w.status === 'PAID')
    .reduce((sum, w) => sum + w.amountCents, 0);
  if (readyCents - withdrawnCents > 0) blocks.push('has_balance');
  if (soleAdminOrgs.length > 0) blocks.push('sole_admin');
  return blocks;
}

export async function deleteUser(id: string): Promise<boolean> {
  const user = await getUserById(id);
  if (!user || user.deletedAt) return false;
  const deletedAt = now();
  const lookups = [
    user.email ? emailPk(user.email) : null,
    user.phone ? phonePk(user.phone) : null,
    user.appleSub ? applePk(user.appleSub) : null,
  ].filter((pk): pk is string => Boolean(pk));
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        ...lookups.map((pk) => ({ Delete: { TableName: T(), Key: { pk, sk: 'ID' } } })),
        {
          Update: {
            TableName: T(),
            Key: { pk: userPk(id), sk: 'PROFILE' },
            UpdateExpression:
              'SET deletedAt = :deletedAt, firstName = :firstName, lastName = :lastName, #name = :name REMOVE email, phone, appleSub, avatarUrl, firstNameAr, city, interests, dateOfBirth, notificationPrefs, stripeCustomerId, intent',
            ExpressionAttributeNames: { '#name': 'name' },
            ExpressionAttributeValues: {
              ':deletedAt': deletedAt,
              ':firstName': 'Deleted',
              ':lastName': 'User',
              ':name': 'Deleted User',
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
  await revokeUserSessions(id).catch(() => undefined);
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

// Issues a refresh token bound to a Session. Rotation revokes the previous
// token of the same session only, so each device stays signed in on its own.
export async function issueRefreshToken(userId: string, sessionId?: string): Promise<string> {
  const token = randomUUID() + randomUUID();
  const tokenHash = hashToken(token);
  const createdAt = now();
  await revokeSessionRefreshTokens(userId, sessionId);
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: refreshPk(tokenHash),
        sk: 'TOKEN',
        userId,
        sessionId,
        createdAt,
        gsi2pk: `USER#${userId}#REFRESH`,
        gsi2sk: createdSk(createdAt, tokenHash.slice(0, 12)),
      },
    })
  );
  return token;
}

// Deletes refresh tokens for one session (or the session-less legacy ones
// when sessionId is undefined).
export async function revokeSessionRefreshTokens(userId: string, sessionId?: string): Promise<void> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}#REFRESH` },
    })
  );
  for (const item of res.Items ?? []) {
    if ((item.sessionId as string | undefined) !== sessionId) continue;
    await docClient.send(new DeleteCommand({ TableName: T(), Key: { pk: item.pk as string, sk: 'TOKEN' } }));
  }
}

export async function getRefreshToken(token: string): Promise<{ userId: string; sessionId?: string } | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: refreshPk(hashToken(token)), sk: 'TOKEN' } })
  );
  if (!res.Item) return null;
  return { userId: res.Item.userId as string, sessionId: res.Item.sessionId as string | undefined };
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

// A7: password change signs out all OTHER sessions — revokes every refresh
// token except the one the caller presented (when given).
export async function revokeOtherRefreshTokens(userId: string, keepToken?: string): Promise<void> {
  const keepHash = keepToken ? hashToken(keepToken) : null;
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
    if (keepHash && pk === refreshPk(keepHash)) continue;
    await docClient.send(new DeleteCommand({ TableName: T(), Key: { pk, sk: 'TOKEN' } }));
  }
}

// ---------- per-user promo grants (A3: WELCOME10 on onboarding) ----------

// Records that a user was granted a promo code. The promo itself still lives
// in PROMO#<CODE>; this row just marks the grant (e.g. WELCOME10 granted when
// onboarding completes).
export async function grantPromoToUser(userId: string, code: string): Promise<void> {
  try {
    await docClient.send(
      new PutCommand({
        TableName: T(),
        Item: {
          pk: userPk(userId),
          sk: `GRANT#PROMO#${code.toUpperCase()}`,
          code: code.toUpperCase(),
          grantedAt: now(),
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      })
    );
  } catch (e) {
    if (!isConditionalCheck(e)) throw e;
  }
}

export async function listUserPromoGrants(userId: string): Promise<string[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'GRANT#PROMO#' },
    })
  );
  return (res.Items ?? []).map((item) => item.code as string);
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

// ---------- checkout holds (decision-16: 10-min hold, seats shown held) ----------

const holdPk = (id: string) => `HOLD#${id}`;
const hexpirePk = (id: string) => `HEXPIRE#${id}`;

export interface HoldLine {
  tierId?: string;
  sectionId?: string;
  listingCode?: string; // resale line — listings are keyed by ticket code
  seatLabels?: string[];
  qty: number;
  unitPriceCents: number; // price snapshot at hold time
  tierName?: string;
  sectionName?: string;
}

export interface Hold {
  id: string;
  userId: string;
  eventId: string;
  lines: HoldLine[];
  status: 'ACTIVE' | 'CONVERTED' | 'EXPIRED' | 'RELEASED' | 'CLEARED';
  expiresAt: string;
  createdAt: string;
}

export async function createHold(input: {
  userId: string;
  eventId: string;
  lines: HoldLine[];
  expiresAt: string;
}): Promise<Hold> {
  const id = randomUUID();
  const createdAt = now();
  const hold: Hold = {
    id,
    userId: input.userId,
    eventId: input.eventId,
    lines: input.lines,
    status: 'ACTIVE',
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
              pk: holdPk(id),
              sk: 'METADATA',
              ...hold,
              gsi2pk: `USER#${input.userId}#HOLDS`,
              gsi2sk: createdSk(createdAt, id),
            },
          },
        },
        {
          Put: {
            TableName: T(),
            Item: {
              pk: hexpirePk(id),
              sk: 'INDEX',
              holdId: id,
              expiresAt: input.expiresAt,
              gsi1pk: EXPIRE_GSI_PK,
              gsi1sk: input.expiresAt,
            },
          },
        },
      ],
    })
  );
  return hold;
}

export async function getHold(id: string): Promise<Hold | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: holdPk(id), sk: 'METADATA' } })
  );
  if (!res.Item) return null;
  const { pk, sk, gsi2pk, gsi2sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as Hold;
}

// Inventory-credit ops for a hold's lines (the mirror of what POST /holds
// reserved). Used by expire/clear/release paths inside one transaction with
// the status flip so inventory can't be double-released.
function holdCreditOps(hold: Hold): TxnItems {
  const ops: TxnItems = [];
  for (const line of hold.lines) {
    if (line.tierId) {
      ops.push({
        Update: {
          TableName: T(),
          Key: { pk: eventPk(hold.eventId), sk: `TIER#${line.tierId}` },
          UpdateExpression: 'ADD available :qty',
          ExpressionAttributeValues: { ':qty': line.qty },
        },
      });
    }
    if (line.sectionId) {
      ops.push({
        Update: {
          TableName: T(),
          Key: { pk: eventPk(hold.eventId), sk: `SECTION#${line.sectionId}` },
          UpdateExpression: 'ADD available :qty',
          ExpressionAttributeValues: { ':qty': line.qty },
        },
      });
      for (const label of line.seatLabels ?? []) {
        ops.push({
          Update: {
            TableName: T(),
            Key: { pk: eventPk(hold.eventId), sk: seatSk(line.sectionId, label) },
            UpdateExpression: 'SET #status = :available REMOVE reservedAt',
            ConditionExpression: '#status = :held',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':available': 'AVAILABLE', ':held': 'HELD' },
          },
        });
      }
    }
    if (line.listingCode) {
      ops.push({
        Update: {
          TableName: T(),
          Key: { pk: listingPk(line.listingCode), sk: 'METADATA' },
          UpdateExpression: 'SET #status = :active',
          ConditionExpression: '#status = :checkout',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':active': 'ACTIVE', ':checkout': 'CHECKOUT' },
        },
      });
    }
  }
  return ops;
}

// ACTIVE → terminal with inventory credited back, atomically. Returns false
// if the hold was already consumed/expired.
async function settleHold(id: string, to: 'EXPIRED' | 'RELEASED' | 'CLEARED', from: 'ACTIVE' | 'CONVERTED' = 'ACTIVE'): Promise<boolean> {
  const hold = await getHold(id);
  if (!hold) return false;
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: T(),
              Key: { pk: holdPk(id), sk: 'METADATA' },
              UpdateExpression: 'SET #status = :to',
              ConditionExpression: '#status = :from',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: { ':to': to, ':from': from },
            },
          },
          {
            Delete: { TableName: T(), Key: { pk: hexpirePk(id), sk: 'INDEX' } },
          },
          ...holdCreditOps(hold),
        ],
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

export const expireHold = (id: string) => settleHold(id, 'EXPIRED');
export const clearHold = (id: string) => settleHold(id, 'CLEARED');
// Compensation when an order was converted but order creation failed after
// conversion — returns the inventory to the pool.
export const releaseConvertedHold = (id: string) => settleHold(id, 'RELEASED', 'CONVERTED');

// ACTIVE → CONVERTED (the order now owns the reservation; hold is terminal).
// No inventory movement — ownership moves to the order's release path.
export async function convertHold(id: string): Promise<boolean> {
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: T(),
              Key: { pk: holdPk(id), sk: 'METADATA' },
              UpdateExpression: 'SET #status = :converted',
              ConditionExpression: '#status = :active',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: { ':converted': 'CONVERTED', ':active': 'ACTIVE' },
            },
          },
          {
            Delete: { TableName: T(), Key: { pk: hexpirePk(id), sk: 'INDEX' } },
          },
        ],
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// Fetch a hold, lazily expiring it if its window has passed (the local dev
// server has no cron; the Lambda sweeper covers production).
export async function getUsableHold(id: string): Promise<Hold | null> {
  let hold = await getHold(id);
  if (hold && hold.status === 'ACTIVE' && Date.parse(hold.expiresAt) <= Date.now()) {
    await expireHold(id);
    hold = await getHold(id);
  }
  return hold;
}

export async function listUserHolds(userId: string): Promise<Hold[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}#HOLDS` },
      ScanIndexForward: false,
      Limit: 100,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as Hold;
  });
}

// A5: switching profile clears any active checkout hold.
export async function clearUserActiveHolds(userId: string): Promise<number> {
  const holds = await listUserHolds(userId);
  let cleared = 0;
  for (const hold of holds) {
    if (hold.status === 'ACTIVE' && (await clearHold(hold.id))) cleared++;
  }
  return cleared;
}

// Unified fulfillment for orders created from a Hold: dispatches per line —
// GA tiers, seated sections, and resale listings can coexist in one order.
export async function fulfillHoldOrder(
  orderId: string,
  paymentIntentId: string
): Promise<'fulfilled' | 'already'> {
  const order = await getOrderMeta(orderId);
  if (!order || order.status !== 'PENDING') return 'already';

  const [items, event] = await Promise.all([getOrderItems(orderId), getEventMeta(order.eventId)]);
  const createdAt = now();

  // Resale lines rotate the seller's credential inside the same transaction.
  const rotateOpsByCode = new Map<string, TxnItems>();
  for (const item of items) {
    if (item.ticketCode && !rotateOpsByCode.has(item.ticketCode)) {
      rotateOpsByCode.set(item.ticketCode, (await credentialRotateOps(item.ticketCode)).ops);
    }
  }

  const transactItems: TxnItems = [
    expireIndexDelete(orderId),
  ];

  const ticketCodes: string[] = [];
  for (const item of items) {
    if (item.ticketCode) {
      // Resale line: listing CHECKOUT → SOLD, ticket ownership → buyer.
      ticketCodes.push(item.ticketCode);
      transactItems.push(
        {
          Update: {
            TableName: T(),
            Key: { pk: listingPk(item.ticketCode), sk: 'METADATA' },
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
          Update: {
            TableName: T(),
            Key: { pk: ticketPk(item.ticketCode), sk: 'METADATA' },
            UpdateExpression: 'SET userId = :buyer, gsi2pk = :ticketsPk, gsi2sk = :ticketsSk',
            ConditionExpression: '#status = :valid',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':buyer': order.userId,
              ':ticketsPk': userTicketsPk(order.userId),
              ':ticketsSk': createdSk(createdAt, item.ticketCode),
              ':valid': 'VALID',
            },
          },
        },
        ...(rotateOpsByCode.get(item.ticketCode) ?? [])
      );
      continue;
    }

    // New tickets (GA tier or seated section line).
    for (let i = 0; i < item.quantity; i++) {
      const code = `BT-${orderId.replace(/-/g, '').slice(0, 6).toUpperCase()}-${ticketCodes.length + 1}-${randomUUID().slice(0, 6).toUpperCase()}`;
      ticketCodes.push(code);
      transactItems.push(
        {
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
              seatLabel: item.seatLabels?.[i],
              currency: order.currency ?? 'usd',
              faceCents: item.unitPriceCents,
              userId: order.userId,
              status: 'VALID',
              createdAt,
              gsi2pk: userTicketsPk(order.userId),
              gsi2sk: createdSk(createdAt, code),
              gsi1pk: eventTicketsGsiPk(order.eventId),
              gsi1sk: createdSk(createdAt, code),
            },
          },
        },
        { Put: { TableName: T(), Item: credentialItem(code, 1, createdAt).item } }
      );
    }
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
    if (item.sectionId) {
      transactItems.push({
        Update: {
          TableName: T(),
          Key: { pk: eventPk(order.eventId), sk: `SECTION#${item.sectionId}` },
          UpdateExpression: 'ADD sold :qty',
          ExpressionAttributeValues: { ':qty': item.quantity },
        },
      });
      for (const label of item.seatLabels ?? []) {
        transactItems.push({
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

  transactItems.unshift({
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
  });

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
    if (isConditionalCheck(e)) return 'already';
    throw e;
  }
  return 'fulfilled';
}

// ---------- reminders (E4: "Remind me" on events not yet on sale) ----------

export interface Reminder {
  userId: string;
  eventId: string;
  createdAt: string;
}

export async function putReminder(userId: string, eventId: string): Promise<Reminder> {
  const reminder = { userId, eventId, createdAt: now() };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: userPk(userId), sk: `REMINDER#${eventId}`, ...reminder },
    })
  );
  return reminder;
}

export async function deleteReminder(userId: string, eventId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({ TableName: T(), Key: { pk: userPk(userId), sk: `REMINDER#${eventId}` } })
  );
}

export async function getReminder(userId: string, eventId: string): Promise<Reminder | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: userPk(userId), sk: `REMINDER#${eventId}` } })
  );
  return (res.Item as Reminder | undefined) ?? null;
}

export async function listUserReminders(userId: string): Promise<Reminder[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'REMINDER#' },
    })
  );
  return (res.Items ?? []) as Reminder[];
}

// ---------- transfers (X1–X4, decision-14: return after 48h or doors) ----------

const transferPk = (id: string) => `TRANSFER#${id}`;
const texpirePk = (id: string) => `TEXPIRE#${id}`;
const transferContactPk = (contact: string) => `TCONTACT#${contact.toLowerCase()}`;

export interface Transfer {
  id: string;
  eventId: string;
  ticketIds: string[]; // ticket codes
  fromUserId: string;
  toContact: string; // email or E.164 phone (decision-17: no OTP needed to send)
  toContactKind: 'email' | 'phone';
  toUserId?: string;
  status: 'pending' | 'claimed' | 'returned' | 'cancelled';
  expiresAt: string;
  createdAt: string;
  claimedAt?: string;
}

export class TransferError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export function normalizeContact(to: string): { kind: 'email' | 'phone'; value: string } | null {
  const trimmed = to.trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
    return { kind: 'email', value: trimmed.toLowerCase() };
  }
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (/^\+?\d{7,15}$/.test(digits)) {
    return { kind: 'phone', value: digits.startsWith('+') ? digits : `+${digits}` };
  }
  return null;
}

// POST /transfers — mark tickets TRANSFER_PENDING and open a pending
// transfer addressed to an email or phone. Atomically: ticket status flips,
// transfer row, contact index, expiry index.
export async function createTransfer(input: {
  fromUserId: string;
  ticketIds: string[];
  to: string;
}): Promise<Transfer> {
  const contact = normalizeContact(input.to);
  if (!contact) throw new TransferError('Send to an email or phone number with country code', 'bad_contact');

  const sender = await getUserById(input.fromUserId);
  if (sender) {
    const selfEmail = contact.kind === 'email' && sender.email === contact.value;
    const selfPhone =
      contact.kind === 'phone' &&
      sender.phone &&
      normalizeContact(sender.phone)?.value === contact.value;
    if (selfEmail || selfPhone) {
      throw new TransferError('You cannot transfer a ticket to yourself', 'self_transfer');
    }
  }

  const tickets = await batchGet<Ticket>(
    input.ticketIds.map((code) => ({ pk: ticketPk(code), sk: 'METADATA' }))
  );
  if (tickets.length !== input.ticketIds.length) {
    throw new TransferError('Ticket not found', 'not_found');
  }
  const eventIds = [...new Set(tickets.map((t) => t.eventId))];
  if (eventIds.length !== 1) throw new TransferError('All tickets must be for the same event', 'mixed_events');
  const event = await getEventMeta(eventIds[0]);

  // X4: transfers are disabled once doors open (or the event has started
  // when no doorsAt is set).
  const cutoff = event?.doorsAt ?? event?.startsAt;
  if (cutoff && Date.parse(cutoff) <= Date.now()) {
    throw new TransferError('Transfers closed — doors are open', 'event_started');
  }

  for (const ticket of tickets) {
    if (ticket.userId !== input.fromUserId) throw new TransferError('Not your ticket', 'not_holder');
    if (ticket.status === 'TRANSFER_PENDING') {
      throw new TransferError('Ticket already has a transfer pending', 'transfer_pending');
    }
    if (ticket.status !== 'VALID') throw new TransferError('Ticket is not transferable', 'not_valid');
    const listing = await getListing(ticket.code);
    if (listing && (listing.status === 'ACTIVE' || listing.status === 'CHECKOUT')) {
      throw new TransferError('Cancel the resale listing before transferring', 'listed');
    }
  }

  const id = randomUUID();
  const createdAt = now();
  // decision-14: unclaimed transfers return after 48h, or at doors-open if
  // that's sooner.
  const ttlMs = env.transferTtlHours * 3600_000;
  const expiryMs = Math.min(
    Date.now() + ttlMs,
    cutoff ? Date.parse(cutoff) : Number.POSITIVE_INFINITY
  );
  const expiresAt = new Date(expiryMs).toISOString();

  const transfer: Transfer = {
    id,
    eventId: eventIds[0],
    ticketIds: input.ticketIds,
    fromUserId: input.fromUserId,
    toContact: contact.value,
    toContactKind: contact.kind,
    status: 'pending',
    expiresAt,
    createdAt,
  };

  const transactItems: TxnItems = tickets.map((ticket) => ({
    Update: {
      TableName: T(),
      Key: { pk: ticketPk(ticket.code), sk: 'METADATA' },
      UpdateExpression: 'SET #status = :pending, transferId = :tid',
      ConditionExpression: '#status = :valid AND userId = :from',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':pending': 'TRANSFER_PENDING',
        ':valid': 'VALID',
        ':tid': id,
        ':from': input.fromUserId,
      },
    },
  })) as TxnItems;
  transactItems.push(
    {
      Put: {
        TableName: T(),
        Item: {
          pk: transferPk(id),
          sk: 'METADATA',
          ...transfer,
          gsi2pk: `USER#${input.fromUserId}#TRANSFERS`,
          gsi2sk: createdSk(createdAt, id),
        },
      },
    },
    {
      Put: {
        TableName: T(),
        Item: { pk: transferContactPk(contact.value), sk: `TR#${id}`, transferId: id },
      },
    },
    {
      Put: {
        TableName: T(),
        Item: {
          pk: texpirePk(id),
          sk: 'INDEX',
          transferId: id,
          expiresAt,
          gsi1pk: EXPIRE_GSI_PK,
          gsi1sk: expiresAt,
        },
      },
    }
  );
  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (e) {
    if (isConditionalCheck(e)) {
      throw new TransferError('One or more tickets are not transferable', 'not_valid');
    }
    throw e;
  }
  return transfer;
}

export async function getTransfer(id: string): Promise<Transfer | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: transferPk(id), sk: 'METADATA' } })
  );
  if (!res.Item) return null;
  const { pk, sk, gsi2pk, gsi2sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as Transfer;
}

// Settle a pending transfer to a terminal state, returning tickets to the
// sender (returned/cancelled) — one transaction so a racing claim can't win.
async function settleTransfer(id: string, to: 'returned' | 'cancelled'): Promise<boolean> {
  const transfer = await getTransfer(id);
  if (!transfer || transfer.status !== 'pending') return false;
  const tickets = await batchGet<Ticket>(
    transfer.ticketIds.map((code) => ({ pk: ticketPk(code), sk: 'METADATA' }))
  );
  const transactItems: TxnItems = [
    {
      Update: {
        TableName: T(),
        Key: { pk: transferPk(id), sk: 'METADATA' },
        UpdateExpression: 'SET #status = :to',
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':to': to, ':pending': 'pending' },
      },
    },
    { Delete: { TableName: T(), Key: { pk: texpirePk(id), sk: 'INDEX' } } },
    { Delete: { TableName: T(), Key: { pk: transferContactPk(transfer.toContact), sk: `TR#${id}` } } },
  ];
  for (const ticket of tickets) {
    transactItems.push({
      Update: {
        TableName: T(),
        Key: { pk: ticketPk(ticket.code), sk: 'METADATA' },
        UpdateExpression: 'SET #status = :valid REMOVE transferId',
        ConditionExpression: '#status = :pending AND userId = :from',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':valid': 'VALID',
          ':pending': 'TRANSFER_PENDING',
          ':from': transfer.fromUserId,
        },
      },
    });
  }
  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

export const cancelTransferBySender = (id: string) => settleTransfer(id, 'cancelled');
export const expireTransfer = (id: string) => settleTransfer(id, 'returned');

// POST /transfers/{id}/claim — the recipient (authed; contact must match
// their account email or phone) takes ownership. Tickets move, credentials
// rotate (X2), the sender's QRs become superseded.
export async function claimTransfer(id: string, claimantId: string): Promise<Transfer> {
  const transfer = await getTransfer(id);
  if (!transfer) throw new TransferError('Transfer not found', 'not_found');
  if (transfer.status !== 'pending') {
    throw new TransferError('Transfer already claimed or closed', 'already_claimed');
  }
  if (Date.parse(transfer.expiresAt) <= Date.now()) {
    await expireTransfer(id);
    throw new TransferError('Transfer has expired', 'expired');
  }
  const claimant = await getUserById(claimantId);
  if (!claimant) throw new TransferError('User not found', 'not_found');
  const claimantPhone = claimant.phone ? normalizeContact(claimant.phone)?.value : undefined;
  const matches =
    (transfer.toContactKind === 'email' && claimant.email === transfer.toContact) ||
    (transfer.toContactKind === 'phone' && claimantPhone === transfer.toContact);
  if (!matches) throw new TransferError('This transfer is addressed to someone else', 'not_recipient');
  if (claimantId === transfer.fromUserId) {
    throw new TransferError('You cannot claim your own transfer', 'self_transfer');
  }

  const tickets = await batchGet<Ticket>(
    transfer.ticketIds.map((code) => ({ pk: ticketPk(code), sk: 'METADATA' }))
  );
  const claimedAt = now();
  const transactItems: TxnItems = [
    {
      Update: {
        TableName: T(),
        Key: { pk: transferPk(id), sk: 'METADATA' },
        UpdateExpression: 'SET #status = :claimed, toUserId = :to, claimedAt = :at',
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':claimed': 'claimed',
          ':pending': 'pending',
          ':to': claimantId,
          ':at': claimedAt,
        },
      },
    },
    { Delete: { TableName: T(), Key: { pk: texpirePk(id), sk: 'INDEX' } } },
    { Delete: { TableName: T(), Key: { pk: transferContactPk(transfer.toContact), sk: `TR#${id}` } } },
  ];
  for (const ticket of tickets) {
    const rotate = await credentialRotateOps(ticket.code);
    transactItems.push(
      {
        Update: {
          TableName: T(),
          Key: { pk: ticketPk(ticket.code), sk: 'METADATA' },
          UpdateExpression:
            'SET #status = :valid, userId = :to, gsi2pk = :ticketsPk, gsi2sk = :ticketsSk, transferredFrom = :from, transferredTo = :toId, transferredAt = :at REMOVE transferId',
          ConditionExpression: '#status = :pending AND userId = :from',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':valid': 'VALID',
            ':pending': 'TRANSFER_PENDING',
            ':to': claimantId,
            ':ticketsPk': userTicketsPk(claimantId),
            ':ticketsSk': createdSk(ticket.createdAt, ticket.code),
            ':from': transfer.fromUserId,
            ':toId': claimantId,
            ':at': claimedAt,
          },
        },
      },
      ...rotate.ops
    );
  }
  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
  } catch (e) {
    if (isConditionalCheck(e)) throw new TransferError('Transfer already claimed or closed', 'already_claimed');
    throw e;
  }
  return { ...transfer, status: 'claimed', toUserId: claimantId, claimedAt };
}

// Transfers the user sent plus pending transfers addressed to their
// email/phone (claimable).
export async function listUserTransfers(userId: string): Promise<{ sent: Transfer[]; incoming: Transfer[] }> {
  const user = await getUserById(userId);
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}#TRANSFERS` },
      ScanIndexForward: false,
      Limit: 100,
    })
  );
  const sent = ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as Transfer;
  });
  const contacts = [user?.email, user?.phone ? normalizeContact(user.phone)?.value : undefined]
    .filter((c): c is string => Boolean(c));
  const incoming: Transfer[] = [];
  for (const contact of contacts) {
    const idx = await docClient.send(
      new QueryCommand({
        TableName: T(),
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': transferContactPk(contact), ':prefix': 'TR#' },
      })
    );
    for (const item of idx.Items ?? []) {
      const transfer = await getTransfer(item.transferId as string);
      if (transfer && transfer.status === 'pending') incoming.push(transfer);
    }
  }
  return { sent, incoming };
}

// ---------- organisations, memberships, event hosts (G, rule O/T) ----------

const orgPk = (id: string) => `ORG#${id}`;
const minvitePk = (email: string) => `MINVITE#${email.toLowerCase()}`;
const hostSk = (orgId: string) => `HOST#${orgId}`;

export interface Organisation {
  id: string;
  name: string;
  type: string; // promoter | venue | artist | other
  city?: string;
  createdByUserId: string;
  // O3: none -> submitted -> approved / rejected (platform review is manual;
  // approval lands via internal tooling).
  verificationStatus: 'none' | 'submitted' | 'approved' | 'rejected';
  legalName?: string;
  licenceNo?: string;
  verificationDocs?: string[];
  payoutAccount?: { iban: string; holder: string; payoutAccountId: string };
  createdAt: string;
}

export interface Membership {
  id: string;
  orgId: string;
  userId?: string; // null until the invite is accepted
  inviteEmail: string;
  role: 'admin' | 'cohost' | 'gate';
  // Gate staff can be scoped to specific events (empty = all org events).
  eventScope?: string[];
  status: 'invited' | 'active' | 'revoked' | 'left';
  invitedBy?: string;
  expiresAt?: string; // T2: invites lapse after 7 days
  createdAt: string;
  acceptedAt?: string;
}

export interface EventHost {
  eventId: string;
  orgId: string;
  role: 'owner' | 'cohost';
  // Basis points of the net payout (sum across hosts must equal 10000).
  splitBps: number;
  accepted: boolean;
  createdAt: string;
}

export class OrgError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

// ISO 13616 IBAN check (mod-97). Accepts with/without spaces.
export function isValidIban(iban: string): boolean {
  const normalized = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(normalized)) return false;
  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const numeric = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export async function createOrg(input: {
  name: string;
  type: string;
  city?: string;
  createdByUserId: string;
}): Promise<Organisation> {
  // name_exists_for_you: the caller can't create a second org with the same name.
  const existing = await listUserMemberships(input.createdByUserId);
  if (
    existing.some(
      ({ membership, org }) =>
        membership.role === 'admin' && org.name.toLowerCase() === input.name.trim().toLowerCase()
    )
  ) {
    throw new OrgError('You already manage an organisation with this name', 'name_exists_for_you');
  }
  const id = randomUUID();
  const createdAt = now();
  const org: Organisation = {
    id,
    name: input.name.trim(),
    type: input.type,
    city: input.city,
    createdByUserId: input.createdByUserId,
    verificationStatus: 'none',
    createdAt,
  };
  const membership: Membership = {
    id: randomUUID(),
    orgId: id,
    userId: input.createdByUserId,
    inviteEmail: '',
    role: 'admin',
    status: 'active',
    createdAt,
    acceptedAt: createdAt,
  };
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: T(), Item: { pk: orgPk(id), sk: 'METADATA', ...org } } },
        {
          Put: {
            TableName: T(),
            Item: {
              pk: orgPk(id),
              sk: `MEMBER#${membership.id}`,
              ...membership,
              gsi2pk: `USER#${input.createdByUserId}#MEMBERSHIPS`,
              gsi2sk: `ORG#${id}`,
            },
          },
        },
      ],
    })
  );
  return org;
}

export async function getOrg(id: string): Promise<Organisation | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: orgPk(id), sk: 'METADATA' } })
  );
  if (!res.Item) return null;
  const { pk, sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as Organisation;
}

export async function listOrgMembers(orgId: string): Promise<Membership[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': orgPk(orgId), ':prefix': 'MEMBER#' },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = item;
    return { id: (sk as string).slice(7), ...rest } as unknown as Membership;
  });
}

// Active membership for a (user, org) pair — the X-Org-Id check.
export async function getMembership(userId: string, orgId: string): Promise<Membership | null> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}#MEMBERSHIPS`,
        ':sk': `ORG#${orgId}`,
      },
    })
  );
  const item = res.Items?.[0];
  if (!item) return null;
  const { pk, sk, gsi2pk, gsi2sk, ...rest } = item as Record<string, unknown>;
  const membership = rest as unknown as Membership;
  return membership.status === 'active' ? membership : null;
}

export async function listUserMemberships(
  userId: string
): Promise<{ membership: Membership; org: Organisation }[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}#MEMBERSHIPS` },
      Limit: 100,
    })
  );
  const out: { membership: Membership; org: Organisation }[] = [];
  for (const item of res.Items ?? []) {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = item as Record<string, unknown>;
    const membership = rest as unknown as Membership;
    if (membership.status !== 'active') continue;
    const org = await getOrg(membership.orgId);
    if (org) out.push({ membership, org });
  }
  return out;
}

// Pending invites addressed to this user's email (they show up in /me/memberships).
export async function listInvitesForEmail(email: string): Promise<Membership[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': minvitePk(email), ':prefix': 'M#' },
    })
  );
  const out: Membership[] = [];
  for (const item of res.Items ?? []) {
    const membership = await getMembershipById(item.orgId as string, item.membershipId as string);
    if (membership && membership.status === 'invited') out.push(membership);
  }
  return out;
}

export async function getMembershipById(orgId: string, membershipId: string): Promise<Membership | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: orgPk(orgId), sk: `MEMBER#${membershipId}` } })
  );
  if (!res.Item) return null;
  const { pk, sk, gsi2pk, gsi2sk, ...rest } = res.Item as Record<string, unknown>;
  return { id: (sk as string).slice(7), ...rest } as unknown as Membership;
}

// T2: invite a member by email; the invite lapses in 7 days.
export async function inviteMember(input: {
  orgId: string;
  email: string;
  role: 'admin' | 'cohost' | 'gate';
  eventScope?: string[];
  invitedBy: string;
}): Promise<Membership> {
  const email = input.email.trim().toLowerCase();
  const org = await getOrg(input.orgId);
  if (!org) throw new OrgError('Organisation not found', 'not_found');
  if (org.verificationStatus !== 'approved') {
    // Studio blocks team invites until the org clears verification (O3).
    throw new OrgError('Organisation must be verified before inviting members', 'org_unverified');
  }
  const members = await listOrgMembers(input.orgId);
  const clash = members.find(
    (m) => m.inviteEmail === email && (m.status === 'invited' || m.status === 'active')
  );
  // Also block inviting someone who is already an active member.
  const invitedUser = await getUserByEmail(email);
  if (clash || (invitedUser && (await getMembership(invitedUser.id, input.orgId)))) {
    throw new OrgError('This person is already a member or has a pending invite', 'already_member');
  }
  const membership: Membership = {
    id: randomUUID(),
    orgId: input.orgId,
    inviteEmail: email,
    role: input.role,
    eventScope: input.eventScope,
    status: 'invited',
    invitedBy: input.invitedBy,
    expiresAt: new Date(Date.now() + env.inviteTtlDays * 24 * 3600_000).toISOString(),
    createdAt: now(),
  };
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: T(),
            Item: { pk: orgPk(input.orgId), sk: `MEMBER#${membership.id}`, ...membership },
          },
        },
        {
          Put: {
            TableName: T(),
            Item: {
              pk: minvitePk(email),
              sk: `M#${membership.id}`,
              orgId: input.orgId,
              membershipId: membership.id,
            },
          },
        },
      ],
    })
  );
  return membership;
}

export async function acceptMembership(membershipId: string, userId: string): Promise<Membership> {
  const user = await getUserById(userId);
  if (!user) throw new OrgError('User not found', 'not_found');
  // Locate the invite via the email index.
  if (!user.email) throw new OrgError('Invite not found', 'not_found');
  const invites = await listInvitesForEmail(user.email);
  const invite = invites.find((m) => m.id === membershipId);
  if (!invite) throw new OrgError('Invite not found', 'not_found');
  if (invite.expiresAt && Date.parse(invite.expiresAt) <= Date.now()) {
    throw new OrgError('Invite has expired', 'invite_expired');
  }
  const acceptedAt = now();
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: T(),
            Key: { pk: orgPk(invite.orgId), sk: `MEMBER#${membershipId}` },
            UpdateExpression:
              'SET #status = :active, userId = :uid, gsi2pk = :gpk, gsi2sk = :gsk, acceptedAt = :at',
            ConditionExpression: '#status = :invited',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':active': 'active',
              ':invited': 'invited',
              ':uid': userId,
              ':gpk': `USER#${userId}#MEMBERSHIPS`,
              ':gsk': `ORG#${invite.orgId}`,
              ':at': acceptedAt,
            },
          },
        },
        {
          Delete: {
            TableName: T(),
            Key: { pk: minvitePk(invite.inviteEmail), sk: `M#${membershipId}` },
          },
        },
      ],
    })
  );
  return { ...invite, status: 'active', userId, acceptedAt };
}

export async function updateMember(
  orgId: string,
  membershipId: string,
  patch: { role?: 'admin' | 'cohost' | 'gate'; eventScope?: string[] }
): Promise<Membership | null> {
  const membership = await getMembershipById(orgId, membershipId);
  if (!membership) return null;
  // last_admin: can't demote the final active admin.
  if (patch.role && membership.role === 'admin') {
    const members = await listOrgMembers(orgId);
    const admins = members.filter((m) => m.status === 'active' && m.role === 'admin');
    if (admins.length === 1 && admins[0].id === membershipId) {
      throw new OrgError('Cannot demote the last admin', 'last_admin');
    }
  }
  const sets: string[] = [];
  const values: Record<string, unknown> = {};
  if (patch.role) {
    sets.push('#role = :role');
    values[':role'] = patch.role;
  }
  if (patch.eventScope !== undefined) {
    sets.push('eventScope = :scope');
    values[':scope'] = patch.eventScope;
  }
  if (sets.length === 0) return membership;
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: orgPk(orgId), sk: `MEMBER#${membershipId}` },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: values,
    })
  );
  return { ...membership, ...patch };
}

export async function removeMember(orgId: string, membershipId: string): Promise<void> {
  const membership = await getMembershipById(orgId, membershipId);
  if (!membership) return;
  if (membership.role === 'admin' && membership.status === 'active') {
    const members = await listOrgMembers(orgId);
    const admins = members.filter((m) => m.status === 'active' && m.role === 'admin');
    if (admins.length === 1 && admins[0].id === membershipId) {
      throw new OrgError('Cannot remove the last admin', 'last_admin');
    }
  }
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: orgPk(orgId), sk: `MEMBER#${membershipId}` },
      UpdateExpression: 'SET #status = :revoked REMOVE gsi2pk, gsi2sk',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':revoked': 'revoked' },
    })
  );
  if (membership.status === 'invited') {
    await docClient.send(
      new DeleteCommand({
        TableName: T(),
        Key: { pk: minvitePk(membership.inviteEmail), sk: `M#${membershipId}` },
      })
    );
  }
}

export async function submitOrgVerification(
  orgId: string,
  input: { legalName: string; licenceNo: string; docs?: string[] }
): Promise<Organisation> {
  const org = await getOrg(orgId);
  if (!org) throw new OrgError('Organisation not found', 'not_found');
  if (!input.licenceNo?.trim()) throw new OrgError('Licence number is required', 'licence_invalid');
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: orgPk(orgId), sk: 'METADATA' },
      UpdateExpression:
        'SET verificationStatus = :submitted, legalName = :ln, licenceNo = :lic, verificationDocs = :docs',
      ExpressionAttributeValues: {
        ':submitted': 'submitted',
        ':ln': input.legalName,
        ':lic': input.licenceNo.trim(),
        ':docs': input.docs ?? [],
      },
    })
  );
  return {
    ...org,
    verificationStatus: 'submitted',
    legalName: input.legalName,
    licenceNo: input.licenceNo.trim(),
    verificationDocs: input.docs ?? [],
  };
}

// Admin/internal hook: approve or reject a submitted verification. Called by
// platform tooling; Studio only submits. Kept as a db function so the
// verification.decided webhook can flip it.
export async function setOrgVerificationStatus(
  orgId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: orgPk(orgId), sk: 'METADATA' },
      UpdateExpression: 'SET verificationStatus = :s',
      ExpressionAttributeValues: { ':s': status },
    })
  );
}

export async function setOrgPayoutAccount(
  orgId: string,
  input: { iban: string; holder: string }
): Promise<Organisation> {
  const org = await getOrg(orgId);
  if (!org) throw new OrgError('Organisation not found', 'not_found');
  const iban = input.iban.replace(/\s+/g, '').toUpperCase();
  if (!isValidIban(iban)) throw new OrgError('IBAN is invalid', 'iban_invalid');
  // O4: the account holder must match the legal name from verification.
  if (
    org.legalName &&
    org.legalName.trim().toLowerCase() !== input.holder.trim().toLowerCase()
  ) {
    throw new OrgError('Account holder must match the verified legal name', 'name_mismatch');
  }
  const payoutAccount = { iban, holder: input.holder.trim(), payoutAccountId: randomUUID() };
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: orgPk(orgId), sk: 'METADATA' },
      UpdateExpression: 'SET payoutAccount = :pa',
      ExpressionAttributeValues: { ':pa': payoutAccount },
    })
  );
  return { ...org, payoutAccount };
}

// Org event pointer row so GET /orgs/{id}/events stays a single query.
export async function linkEventToOrg(eventId: string, orgId: string): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: orgPk(orgId), sk: `EVENT#${eventId}`, eventId, createdAt: now() },
    })
  );
}

export async function listOrgEventIds(orgId: string): Promise<string[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': orgPk(orgId), ':prefix': 'EVENT#' },
    })
  );
  return (res.Items ?? []).map((i) => i.eventId as string);
}

export async function listEventHosts(eventId: string): Promise<EventHost[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': eventPk(eventId), ':prefix': 'HOST#' },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, ...rest } = item;
    return { orgId: (sk as string).slice(5), ...rest } as unknown as EventHost;
  });
}

// Add or replace the co-host split rows for an event. decision-11: splits
// lock at first sale — after that, changes need both orgs' admins and only
// apply to future sales (enforced here as a hard lock).
export async function setEventHost(input: {
  eventId: string;
  orgId: string;
  role: 'owner' | 'cohost';
  splitBps: number;
}): Promise<EventHost> {
  const host: EventHost = {
    eventId: input.eventId,
    orgId: input.orgId,
    role: input.role,
    splitBps: input.splitBps,
    accepted: input.role === 'owner',
    createdAt: now(),
  };
  const existing = await listEventHosts(input.eventId);
  const prior = existing.find((h) => h.orgId === input.orgId);
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: eventPk(input.eventId),
        sk: hostSk(input.orgId),
        ...host,
        createdAt: prior?.createdAt ?? host.createdAt,
      },
    })
  );
  return { ...host, createdAt: prior?.createdAt ?? host.createdAt };
}

export async function acceptEventHost(eventId: string, orgId: string): Promise<EventHost | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: eventPk(eventId), sk: hostSk(orgId) } })
  );
  if (!res.Item) return null;
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: eventPk(eventId), sk: hostSk(orgId) },
      UpdateExpression: 'SET accepted = :yes',
      ExpressionAttributeValues: { ':yes': true },
    })
  );
  // The co-host's Studio/door surfaces list the event via the org pointer.
  await linkEventToOrg(eventId, orgId);
  const { pk, sk, ...rest } = res.Item as Record<string, unknown>;
  return { orgId, ...(rest as object), accepted: true } as unknown as EventHost;
}

// Permission check shared by Studio routes: if the event belongs to an org,
// the caller needs an active membership in `roles`; otherwise fall back to
// the legacy creatorId check (platform ADMIN always allowed).
export async function canManageEvent(
  event: EventItem,
  userId: string,
  userRole: string,
  roles: ('admin' | 'cohost' | 'gate')[] = ['admin', 'cohost']
): Promise<boolean> {
  if (userRole === 'ADMIN') return true;
  if (event.ownerOrgId) {
    const membership = await getMembership(userId, event.ownerOrgId);
    if (membership && roles.includes(membership.role)) {
      // Gate staff can only touch events inside their scope.
      if (membership.role === 'gate' && membership.eventScope?.length) {
        return membership.eventScope.includes(event.id);
      }
      return true;
    }
    // Co-host org members manage their own slice (hosts endpoints handle this).
    const hosts = await listEventHosts(event.id);
    for (const host of hosts) {
      if (host.role !== 'cohost' || !host.accepted) continue;
      const m = await getMembership(userId, host.orgId);
      if (m && roles.includes(m.role)) return true;
    }
    return false;
  }
  return event.creatorId === userId;
}

// ---------- event management: tier CRUD, cancel, postpone (G, E2/E3) ----------

// POST /events/{id}/tiers — add a tier to a draft or published event.
export async function addEventTier(
  eventId: string,
  input: {
    name: string;
    description?: string;
    priceCents: number;
    quantity: number;
    saleStartsAt?: string;
    saleEndsAt?: string;
  }
): Promise<TicketTier> {
  const event = await getEventMeta(eventId);
  if (!event) throw new OrgError('Event not found', 'not_found');
  if (!input.name?.trim() || input.quantity < 1 || input.priceCents < 0) {
    throw new OrgError('Invalid tier', 'validation');
  }
  const tier: TicketTier = {
    id: randomUUID(),
    eventId,
    name: input.name.trim(),
    description: input.description,
    priceCents: input.priceCents,
    quantity: input.quantity,
    sold: 0,
    available: input.quantity,
    saleStartsAt: input.saleStartsAt,
    saleEndsAt: input.saleEndsAt,
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: eventPk(eventId), sk: `TIER#${tier.id}`, ...tier },
    })
  );
  return tier;
}

// PATCH /events/{id}/tiers/{tier} — E2/E3: price/name edits are free while
// no tickets sold; quantity can't drop below sold.
export async function updateEventTier(
  eventId: string,
  tierId: string,
  patch: Partial<Pick<TicketTier, 'name' | 'description' | 'priceCents' | 'quantity' | 'saleStartsAt' | 'saleEndsAt'>>
): Promise<TicketTier | null> {
  const tier = await getTier(tierId, eventId);
  if (!tier) return null;
  const hasSales = tier.sold > 0;
  if (hasSales && (patch.priceCents !== undefined && patch.priceCents !== tier.priceCents)) {
    throw new OrgError('Cannot change the price of a tier with sales', 'tier_has_sales');
  }
  if (patch.quantity !== undefined && patch.quantity < tier.sold) {
    throw new OrgError('Quantity cannot be less than tickets already sold', 'tier_has_sales');
  }
  const sets: string[] = [];
  const removes: string[] = [];
  const values: Record<string, unknown> = {};
  const set = (key: string, value: unknown, name = `#${key}`) => {
    sets.push(`${name} = :${key}`);
    values[`:${key}`] = value;
  };
  if (patch.name !== undefined) set('name', patch.name.trim());
  if (patch.description !== undefined) set('description', patch.description);
  if (patch.priceCents !== undefined) set('priceCents', patch.priceCents);
  if (patch.quantity !== undefined) {
    set('quantity', patch.quantity);
    set('available', Math.max(0, patch.quantity - tier.sold));
  }
  if (patch.saleStartsAt !== undefined) {
    if (patch.saleStartsAt === null) removes.push('saleStartsAt');
    else set('saleStartsAt', patch.saleStartsAt);
  }
  if (patch.saleEndsAt !== undefined) {
    if (patch.saleEndsAt === null) removes.push('saleEndsAt');
    else set('saleEndsAt', patch.saleEndsAt);
  }
  if (sets.length === 0 && removes.length === 0) return tier;
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: eventPk(eventId), sk: `TIER#${tierId}` },
      UpdateExpression:
        `${sets.length ? `SET ${sets.join(', ')}` : ''}${removes.length ? ` REMOVE ${removes.join(', ')}` : ''}`.trim(),
      ExpressionAttributeNames: {
        '#name': 'name',
        '#description': 'description',
        '#priceCents': 'priceCents',
        '#quantity': 'quantity',
        '#available': 'available',
        '#saleStartsAt': 'saleStartsAt',
        '#saleEndsAt': 'saleEndsAt',
      },
      ExpressionAttributeValues: values,
    })
  );
  return { ...tier, ...patch };
}

// DELETE /events/{id}/tiers/{tier} — allowed until the tier has sales.
export async function deleteEventTier(eventId: string, tierId: string): Promise<void> {
  const tier = await getTier(tierId, eventId);
  if (!tier) return;
  if (tier.sold > 0) {
    throw new OrgError('Cannot delete a tier that has sold tickets', 'tier_has_sales');
  }
  await docClient.send(
    new DeleteCommand({ TableName: T(), Key: { pk: eventPk(eventId), sk: `TIER#${tierId}` } })
  );
}

// PATCH /events/{id} — E3: after first sale, date/venue are locked and
// sold tiers can't be removed (tier deletion guards cover the latter).
export async function updateEventFields(
  eventId: string,
  patch: Partial<
    Pick<
      EventItem,
      | 'title'
      | 'description'
      | 'category'
  | 'startsAt'
      | 'endsAt'
      | 'doorsAt'
      | 'onSaleAt'
      | 'location'
      | 'address'
      | 'imageUrl'
      | 'minAge'
      | 'resaleEnabled'
      | 'resaleCapPct'
      | 'royaltyPct'
      | 'country'
      | 'venueTimezone'
    >
  >
): Promise<EventItem | null> {
  const event = await getEventMeta(eventId);
  if (!event) return null;
  const movingDate = patch.startsAt !== undefined && patch.startsAt !== event.startsAt;
  const movingVenue =
    (patch.location !== undefined && patch.location !== event.location) ||
    (patch.address !== undefined && patch.address !== event.address);
  if (movingDate || movingVenue) {
    const tiers = await getTiersForEvent(eventId);
    if (tiers.some((t) => t.sold > 0)) {
      throw new OrgError('Cannot change date or venue after tickets have sold', 'has_sales');
    }
  }
  const sets: string[] = [];
  const removes: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    names[`#${key}`] = key;
    if (value === null) {
      removes.push(`#${key}`);
    } else {
      sets.push(`#${key} = :${key}`);
      values[`:${key}`] = value;
    }
  }
  if (sets.length === 0 && removes.length === 0) return event;
  // Keep the feed key in sync when a draft isn't indexed yet — no-op there.
  if (patch.startsAt !== undefined && event.status === 'PUBLISHED') {
    sets.push('gsi1sk = :feedSk');
    values[':feedSk'] = eventFeedSk(patch.startsAt);
  }
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: eventPk(eventId), sk: 'METADATA' },
      UpdateExpression:
        `${sets.length ? `SET ${sets.join(', ')}` : ''}${removes.length ? ` REMOVE ${removes.join(', ')}` : ''}`.trim(),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
    })
  );
  return { ...event, ...patch } as EventItem;
}

// Void a ticket on refund/event-cancel (B: revoke the current credential and
// issue a fresh version so any stale QR scans superseded/VOID).
export async function voidTicket(code: string, reason: string): Promise<void> {
  const rotate = await credentialRotateOps(code);
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: T(),
            Key: { pk: ticketPk(code), sk: 'METADATA' },
            UpdateExpression: 'SET #status = :void, voidReason = :reason, voidedAt = :at',
            ConditionExpression: '#status = :valid OR #status = :pending',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':void': 'VOID',
              ':valid': 'VALID',
              ':pending': 'TRANSFER_PENDING',
              ':reason': reason,
              ':at': now(),
            },
          },
        },
        ...rotate.ops,
      ],
    })
  );
}

// POST /events/{id}/cancel — decision-2: all valid tickets become VOID and
// their credentials are revoked; buyers are refunded through the ledger
// (package H wires the Stripe refund — the void happens here).
export async function cancelEvent(eventId: string): Promise<EventItem | null> {
  const event = await getEventMeta(eventId);
  if (!event) return null;
  if (event.status === 'CANCELLED') return event;
  // Pending transfers return to their senders first so the settle writes
  // succeed before the tickets are voided below.
  const transfers = await listEventTransfers(eventId).catch(() => [] as string[]);
  for (const tid of transfers) await expireTransfer(tid).catch(() => false);
  const listings = await listActiveListings(eventId).catch(() => []);
  for (const listing of listings) {
    await cancelListing(listing.sellerId, listing.ticketCode).catch(() => 'not_found' as const);
  }
  const tickets = await listEventTickets(eventId);
  for (const ticket of tickets) {
    if (ticket.status !== 'VALID') continue;
    try {
      await voidTicket(ticket.code, 'event_cancelled');
    } catch (e) {
      console.error(`cancelEvent: failed to void ticket ${ticket.code}`, e);
    }
  }
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: eventPk(eventId), sk: 'METADATA' },
      UpdateExpression: 'SET #status = :cancelled REMOVE gsi1pk, gsi1sk',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':cancelled': 'CANCELLED' },
    })
  );
  return { ...event, status: 'CANCELLED' };
}

// POST /events/{id}/postpone — decision-2: new start time + a 14-day refund
// window. Tickets stay valid for the new date.
export async function postponeEvent(eventId: string, newStartsAt: string): Promise<EventItem | null> {
  const event = await getEventMeta(eventId);
  if (!event) return null;
  if (event.status !== 'PUBLISHED') {
    throw new OrgError('Only a published event can be postponed', 'not_published');
  }
  const refundWindowEndsAt = new Date(Date.now() + 14 * 24 * 3600_000).toISOString();
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: eventPk(eventId), sk: 'METADATA' },
      UpdateExpression:
        'SET #status = :postponed, startsAt = :starts, postponedAt = :at, refundWindowEndsAt = :rw, gsi1sk = :feedSk',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':postponed': 'POSTPONED',
        ':starts': newStartsAt,
        ':at': now(),
        ':rw': refundWindowEndsAt,
        ':feedSk': eventFeedSk(newStartsAt),
      },
    })
  );
  return { ...event, status: 'POSTPONED', startsAt: newStartsAt, postponedAt: now(), refundWindowEndsAt };
}

// Transfers pending on an event — used by cancelEvent to return tickets.
async function listEventTransfers(eventId: string): Promise<string[]> {
  // Ticket records hold transferId while TRANSFER_PENDING, so the pending
  // transfer ids ride along on the ticket feed.
  const tickets = await listEventTickets(eventId);
  return tickets
    .map((t) => (t as unknown as { transferId?: string }).transferId)
    .filter((id): id is string => Boolean(id));
}

// ---------- ledger, refunds, payouts (H — double-entry, append-only) ----------

const ledgerPk = (id: string) => `LEDGER#${id}`;
const acctPk = (account: string) => `ACCT#${account}`;
const refundPk = (id: string) => `REFUND#${id}`;
const payoutPk = (id: string) => `PAYOUT#${id}`;

export interface LedgerEntry {
  id: string;
  // Groups the paired entries of one logical transaction (sale, refund,
  // payout, chargeback, reserve release) so auditors can see both sides.
  txId: string;
  // 'org:{id}' | 'user:{id}' | 'platform:fees' | 'platform:reserve' | 'tax'
  account: string;
  amountMinor: number; // signed: +credit / -debit
  currency: string;
  kind:
    | 'sale'
    | 'fee'
    | 'royalty'
    | 'split'
    | 'refund'
    | 'chargeback'
    | 'payout'
    | 'reserve_hold'
    | 'reserve_release'
    // M2: SMS broadcast cost charged to the event's owner account.
    | 'broadcast_cost';
  orderId?: string;
  eventId?: string;
  refundId?: string;
  payoutId?: string;
  // reserve_hold entries name the org that gets the money on release.
  beneficiary?: string;
  memo?: string;
  createdAt: string;
}

export interface Refund {
  id: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  reason: string;
  stripeRefundId?: string;
  status: 'pending' | 'succeeded' | 'failed';
  createdAt: string;
}

export interface Payout {
  id: string;
  account: string; // 'org:{id}' | 'user:{id}'
  amountMinor: number;
  currency: string;
  bankRef?: string;
  status: 'scheduled' | 'in_transit' | 'paid' | 'failed';
  scheduledFor: string;
  createdAt: string;
  paidAt?: string;
}

export async function postLedgerEntries(
  entries: Omit<LedgerEntry, 'id' | 'createdAt'>[]
): Promise<LedgerEntry[]> {
  const createdAt = now();
  const rows = entries.map((e) => ({ ...e, id: randomUUID(), createdAt }));
  // Chunk under the 100-item transaction cap (each entry costs 2 items:
  // the ledger row plus a txId pointer for whole-transaction lookups).
  for (let i = 0; i < rows.length; i += 45) {
    const chunk = rows.slice(i, i + 45);
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: chunk.flatMap((entry) => [
          {
            Put: {
              TableName: T(),
              Item: {
                pk: ledgerPk(entry.id),
                sk: 'ENTRY',
                ...entry,
                gsi2pk: acctPk(entry.account),
                gsi2sk: createdSk(entry.createdAt, entry.id),
              },
            },
          },
          {
            Put: {
              TableName: T(),
              Item: { pk: `LEDGERTX#${entry.txId}`, sk: `E#${entry.id}`, entryId: entry.id },
            },
          },
        ]),
      })
    );
  }
  return rows;
}

// Derived balance: sum of every entry on the account (never stored).
export async function ledgerBalance(account: string): Promise<number> {
  let sum = 0;
  let cursor: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: T(),
        IndexName: 'gsi2',
        KeyConditionExpression: 'gsi2pk = :pk',
        ExpressionAttributeValues: { ':pk': acctPk(account) },
        ExclusiveStartKey: cursor,
      })
    );
    sum += (res.Items ?? []).reduce((s, i) => s + (i.amountMinor as number), 0);
    cursor = res.LastEvaluatedKey;
  } while (cursor);
  return sum;
}

export async function listLedgerEntries(account: string, limit = 100): Promise<LedgerEntry[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': acctPk(account) },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as LedgerEntry;
  });
}

// Account an order's primary-sale proceeds belong to.
function saleAccount(event: EventItem): string {
  return event.ownerOrgId ? `org:${event.ownerOrgId}` : `user:${event.creatorId}`;
}

// Post the ledger side of a fulfilled order. Called once per order —
// guarded by the fulfill transaction's exactly-once status flip.
export async function recordSaleLedger(order: Order): Promise<void> {
  const event = await getEventMeta(order.eventId);
  if (!event) return;
  const currency = order.currency ?? 'usd';
  const txId = `sale:${order.id}`;
  const entries: Omit<LedgerEntry, 'id' | 'createdAt'>[] = [];
  const base = {
    txId,
    currency,
    orderId: order.id,
    eventId: order.eventId,
  };

  if (order.kind === 'RESALE' && order.listingCode) {
    // Resale: seller nets price - seller fee; the organiser royalty is
    // carved out of that seller fee (TODO(decision-7)); the buyer fee is
    // platform revenue.
    const listing = await getListing(order.listingCode);
    const sellerFee = Math.round((order.subtotalCents * env.sellerFeePercent) / 100);
    const royalty = Math.min(
      sellerFee,
      Math.round((order.subtotalCents * (event.royaltyPct ?? env.royaltyPercent)) / 100)
    );
    if (listing) {
      entries.push({
        ...base,
        account: `user:${listing.sellerId}`,
        amountMinor: order.subtotalCents - sellerFee,
        kind: 'sale',
      });
    }
    if (royalty > 0) {
      entries.push({ ...base, account: saleAccount(event), amountMinor: royalty, kind: 'royalty' });
    }
    entries.push({
      ...base,
      account: 'platform:fees',
      amountMinor: order.feesCents + (sellerFee - royalty),
      kind: 'fee',
      memo: 'buyer fee + seller fee net of royalty',
    });
  } else {
    // Primary sale: organiser proceeds = subtotal (buyer fee is platform
    // revenue on top). decision-3: a reserve slice is held until event+14d.
    const account = saleAccount(event);
    const reserve = Math.round((order.subtotalCents * env.orgReservePct) / 100);
    const net = order.subtotalCents - reserve;
    if (reserve > 0) {
      entries.push({
        ...base,
        account: 'platform:reserve',
        amountMinor: reserve,
        kind: 'reserve_hold',
        beneficiary: account,
      });
    }
    const hosts = await listEventHosts(order.eventId);
    const splits = hosts.filter((h) => h.accepted);
    if (splits.length > 0) {
      // decision-11: accepted splits apply to this sale.
      let distributed = 0;
      for (const host of splits) {
        const share =
          host === splits[splits.length - 1]
            ? net - distributed // last host takes the rounding remainder
            : Math.round((net * host.splitBps) / 10000);
        distributed += share;
        if (share > 0) {
          entries.push({
            ...base,
            account: `org:${host.orgId}`,
            amountMinor: share,
            kind: host.role === 'owner' ? 'sale' : 'split',
          });
        }
      }
    } else if (net > 0) {
      entries.push({ ...base, account, amountMinor: net, kind: 'sale' });
    }
    if (order.feesCents > 0) {
      entries.push({ ...base, account: 'platform:fees', amountMinor: order.feesCents, kind: 'fee' });
    }
  }
  if ((order.taxCents ?? 0) > 0) {
    entries.push({ ...base, account: 'tax', amountMinor: order.taxCents!, kind: 'sale', memo: 'VAT' });
  }
  if (entries.length > 0) await postLedgerEntries(entries);
}

// Refund flips the sale entries' signs (double-entry: every account that was
// credited is debited back, so balances unwind exactly).
export async function recordRefundLedger(order: Order, refundId: string): Promise<void> {
  const sale = await listLedgerEntriesByTx(`sale:${order.id}`);
  if (sale.length === 0) return;
  const txId = `refund:${refundId}`;
  await postLedgerEntries(
    sale.map((e) => ({
      txId,
      account: e.account,
      amountMinor: -e.amountMinor,
      currency: e.currency,
      kind: 'refund' as const,
      orderId: order.id,
      eventId: order.eventId,
      refundId,
    }))
  );
}

async function listLedgerEntriesByTx(txId: string): Promise<LedgerEntry[]> {
  // Entries within a tx share txId; query per-account is wrong here — use a
  // narrow scan-free trick: entries also carry orderId. Accounts that
  // participated: platform:fees, platform:reserve, tax + any org/user. We
  // query the order-tagged entries through a small txId secondary lookup
  // stored as a pointer row instead.
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': `LEDGERTX#${txId}`, ':prefix': 'E#' },
    })
  );
  const out: LedgerEntry[] = [];
  for (const item of res.Items ?? []) {
    const got = await docClient.send(
      new GetCommand({ TableName: T(), Key: { pk: ledgerPk(item.entryId as string), sk: 'ENTRY' } })
    );
    if (got.Item) {
      const { pk, sk, gsi2pk, gsi2sk, ...rest } = got.Item as Record<string, unknown>;
      out.push(rest as unknown as LedgerEntry);
    }
  }
  return out;
}

// charge.dispute.created → chargeback: debit the seller-side accounts that
// were credited by the original sale (org or resale seller + royalty).
export async function recordChargebackLedger(
  order: Order,
  amountMinor: number,
  disputeId: string
): Promise<void> {
  const sale = await listLedgerEntriesByTx(`sale:${order.id}`);
  const sellerSide = sale.filter((e) => e.kind === 'sale' || e.kind === 'split' || e.kind === 'royalty');
  const credited = sellerSide.reduce((s, e) => s + e.amountMinor, 0);
  if (credited <= 0 || amountMinor <= 0) return;
  // Debit pro-rata across the credited accounts up to the disputed amount.
  const entries: Omit<LedgerEntry, 'id' | 'createdAt'>[] = [];
  let remaining = Math.min(amountMinor, credited);
  for (const e of sellerSide) {
    const debit = Math.min(remaining, e.amountMinor);
    if (debit <= 0) continue;
    entries.push({
      txId: `chargeback:${disputeId}`,
      account: e.account,
      amountMinor: -debit,
      currency: e.currency,
      kind: 'chargeback',
      orderId: order.id,
      eventId: order.eventId,
      memo: `dispute ${disputeId}`,
    });
    remaining -= debit;
  }
  if (entries.length > 0) await postLedgerEntries(entries);
}

export async function createRefund(input: {
  orderId: string;
  amountMinor: number;
  currency: string;
  reason: string;
  stripeRefundId?: string;
}): Promise<Refund> {
  const refund: Refund = {
    id: randomUUID(),
    orderId: input.orderId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    reason: input.reason,
    stripeRefundId: input.stripeRefundId,
    status: 'succeeded',
    createdAt: now(),
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: refundPk(refund.id), sk: 'METADATA', ...refund },
    })
  );
  return refund;
}

// Full-order refund: order → REFUNDED (exactly-once), tickets voided,
// ledger mirrored. The Stripe API call happens in the route.
export async function refundOrder(orderId: string, reason: string): Promise<'refunded' | 'not_paid' | 'not_found'> {
  const order = await getOrderMeta(orderId);
  if (!order) return 'not_found';
  if (order.status !== 'PAID') return 'not_paid';
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: orderPk(orderId), sk: 'METADATA' },
        UpdateExpression: 'SET #status = :refunded, refundedAt = :at, refundReason = :reason',
        ConditionExpression: '#status = :paid',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':refunded': 'REFUNDED',
          ':paid': 'PAID',
          ':at': now(),
          ':reason': reason,
        },
      })
    );
  } catch (e) {
    if (isConditionalCheck(e)) return 'not_paid';
    throw e;
  }
  const codes = order.ticketCodes ?? [];
  for (const code of codes) {
    await voidTicket(code, `refund:${reason}`).catch(() => undefined);
  }
  // RESALE: the seller's ticket transfer isn't undone locally — the voided
  // buyer ticket is enough for door integrity (decision-2 TODO).
  const refund = await createRefund({
    orderId,
    amountMinor: order.totalCents,
    currency: order.currency ?? 'usd',
    reason,
  });
  await recordRefundLedger(order, refund.id);
  return 'refunded';
}

// ---------- payouts ----------

export async function createPayout(input: {
  account: string;
  amountMinor: number;
  currency: string;
  scheduledFor?: string;
  bankRef?: string;
}): Promise<Payout> {
  const payout: Payout = {
    id: randomUUID(),
    account: input.account,
    amountMinor: input.amountMinor,
    currency: input.currency,
    bankRef: input.bankRef,
    status: 'scheduled',
    scheduledFor: input.scheduledFor ?? now(),
    createdAt: now(),
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: payoutPk(payout.id),
        sk: 'METADATA',
        ...payout,
        gsi2pk: `ACCT#${input.account}#PAYOUTS`,
        gsi2sk: createdSk(payout.createdAt, payout.id),
      },
    })
  );
  // Debit the account immediately so the balance reflects committed money.
  await postLedgerEntries([
    {
      txId: `payout:${payout.id}`,
      account: input.account,
      amountMinor: -input.amountMinor,
      currency: input.currency,
      kind: 'payout',
      payoutId: payout.id,
    },
  ]);
  return payout;
}

export async function listPayouts(account: string, limit = 50): Promise<Payout[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': `ACCT#${account}#PAYOUTS` },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = item;
    return rest as unknown as Payout;
  });
}

export async function updatePayoutStatus(
  id: string,
  status: Payout['status'],
  bankRef?: string
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: payoutPk(id), sk: 'METADATA' },
      UpdateExpression: 'SET #status = :s, paidAt = :at, bankRef = :ref',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':s': status, ':at': now(), ':ref': bankRef },
    })
  );
}

// decision-3: reserves release event_ends + ORG_RESERVE_DAYS. Called by the
// sweeper: finds reserve_hold entries for ended events and credits each
// beneficiary back.
export async function releaseReservesForEndedEvents(): Promise<number> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': acctPk('platform:reserve') },
    })
  );
  let released = 0;
  const releaseAfter = Date.now() - env.orgReserveDays * 24 * 3600_000;
  const holds = ((res.Items ?? []) as Record<string, unknown>[]) as (Record<string, unknown> &
    LedgerEntry)[];
  const pending = holds.filter((h) => h.kind === 'reserve_hold' && h.amountMinor > 0);
  for (const hold of pending) {
    if (!hold.eventId || !hold.beneficiary) continue;
    const event = await getEventMeta(hold.eventId);
    if (!event) continue;
    const endsMs = Date.parse(event.endsAt ?? event.startsAt);
    if (Number.isNaN(endsMs) || endsMs > releaseAfter) continue;
    await postLedgerEntries([
      {
        txId: `reserve_release:${hold.id}`,
        account: 'platform:reserve',
        amountMinor: -hold.amountMinor,
        currency: hold.currency,
        kind: 'reserve_release',
        orderId: hold.orderId,
        eventId: hold.eventId,
      },
      {
        txId: `reserve_release:${hold.id}`,
        account: hold.beneficiary,
        amountMinor: hold.amountMinor,
        currency: hold.currency,
        kind: 'reserve_release',
        orderId: hold.orderId,
        eventId: hold.eventId,
      },
    ]);
    // Mark the hold consumed so it isn't released twice (amount → 0 on the
    // original row keeps the audit trail of the gross hold).
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: ledgerPk(hold.id), sk: 'ENTRY' },
        UpdateExpression: 'SET amountMinor = :zero, releasedAt = :at',
        ConditionExpression: 'amountMinor = :orig',
        ExpressionAttributeValues: { ':zero': 0, ':orig': hold.amountMinor, ':at': now() },
      })
    ).catch(() => undefined);
    released++;
  }
  return released;
}

// ---------- door mode: devices, scan events, manifest (I, D1–D4) ----------

const scanSk = (scanId: string) => `SCAN#${scanId}`;
const devicePk = (id: string) => `DEVICE#${id}`;

export interface ScanEvent {
  scanId: string; // client-generated id for batch replay, server uuid for single scans
  eventId: string;
  ticketCode: string;
  deviceId?: string;
  actorId: string;
  result: string; // admitted | already_used | wrong_event | void | superseded | not_found | undo
  scannedAt: string; // server receipt time
  deviceScannedAt?: string; // offline device's clock
}

export interface Device {
  id: string;
  userId: string;
  orgId?: string;
  name?: string;
  lastSyncAt?: string;
  createdAt: string;
}

// Register/update a scanner device for the signed-in user.
export async function upsertDevice(input: {
  id?: string;
  userId: string;
  orgId?: string;
  name?: string;
}): Promise<Device> {
  const id = input.id ?? randomUUID();
  const device: Device = {
    id,
    userId: input.userId,
    orgId: input.orgId,
    name: input.name,
    lastSyncAt: now(),
    createdAt: now(),
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: devicePk(id), sk: 'METADATA', ...device },
    })
  );
  return device;
}

export async function touchDeviceSync(id: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: devicePk(id), sk: 'METADATA' },
      UpdateExpression: 'SET lastSyncAt = :at',
      ExpressionAttributeValues: { ':at': now() },
    })
  );
}

export async function recordScanEvent(scan: ScanEvent): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: eventPk(scan.eventId), sk: scanSk(scan.scanId), ...scan },
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  ).catch((e) => {
    // Same scan_id replayed → already recorded; that's the batch dedupe.
    if (!isConditionalCheck(e)) throw e;
  });
}

export async function getScanEvent(eventId: string, scanId: string): Promise<ScanEvent | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: eventPk(eventId), sk: scanSk(scanId) } })
  );
  if (!res.Item) return null;
  const { pk, sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as ScanEvent;
}

export async function listScanEvents(eventId: string, limit = 500): Promise<ScanEvent[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': eventPk(eventId), ':prefix': 'SCAN#' },
      Limit: limit,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => {
    const { pk, sk, ...rest } = item;
    return rest as unknown as ScanEvent;
  });
}

// Undo a check-in (decision window: env.doorUndoSeconds after admission).
export async function undoCheckIn(
  eventId: string,
  ticketCode: string,
  actorId: string,
  actorRole: string
): Promise<'undone' | 'not_checked_in' | 'window_closed' | 'forbidden' | 'not_found'> {
  const event = await getEventMeta(eventId);
  if (!event) return 'not_found';
  if (!(await canManageEvent(event, actorId, actorRole, ['admin', 'cohost', 'gate']))) {
    return 'forbidden';
  }
  const ticket = await getTicketByCode(ticketCode);
  if (!ticket || ticket.eventId !== eventId) return 'not_found';
  if (ticket.status !== 'USED' || !ticket.checkedInAt) return 'not_checked_in';
  if (Date.parse(ticket.checkedInAt) < Date.now() - env.doorUndoSeconds * 1000) {
    return 'window_closed';
  }
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: ticketPk(ticketCode), sk: 'METADATA' },
        UpdateExpression:
          'SET #status = :valid, checkInUndoneAt = :at, checkInUndoneBy = :by REMOVE checkedInAt, checkedInDeviceId, checkedInScannedAt, checkedInScanId',
        ConditionExpression: '#status = :used',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':valid': 'VALID',
          ':used': 'USED',
          ':at': now(),
          ':by': actorId,
        },
      })
    );
    return 'undone';
  } catch (e) {
    if (isConditionalCheck(e)) return 'not_checked_in';
    throw e;
  }
}

// Door manifest: every ticket's current credential, hashed for offline
// verification (the door never sees the raw secret).
export async function doorManifest(eventId: string) {
  const tickets = await listEventTickets(eventId);
  const credentials = [] as {
    ticket_id: string;
    version: number;
    hash: string;
    tier: string;
    holder: string;
    qty_group: number;
    status: string;
    used: boolean;
  }[];
  const holderCache = new Map<string, string>();
  for (const ticket of tickets) {
    const current = await getCurrentCredential(ticket.code);
    if (!current) continue; // tickets issued before credentials existed
    let holder = holderCache.get(ticket.userId);
    if (holder === undefined) {
      const user = await getUserById(ticket.userId);
      holder = user ? `${user.firstName} ${user.lastName}`.trim() : '';
      holderCache.set(ticket.userId, holder);
    }
    credentials.push({
      ticket_id: ticket.code,
      version: current.version,
      hash: createHash('sha256').update(current.secret).digest('hex'),
      tier: ticket.tierName,
      holder,
      qty_group: 1,
      status: ticket.status,
      used: ticket.status === 'USED',
    });
  }
  return { credentials, issued_at: now() };
}

// GET /me/door-events: events the caller can scan for — legacy creator-owned
// events plus events of orgs where they hold an active membership (gate
// staff restricted to their event scope).
export async function listDoorEvents(
  userId: string
): Promise<{ event: EventItem; org: Organisation | null; role: string }[]> {
  const out: { event: EventItem; org: Organisation | null; role: string }[] = [];
  const seen = new Set<string>();

  for (const event of await listCreatorEvents(userId)) {
    if (event.ownerOrgId) continue; // surfaced via membership instead
    out.push({ event, org: null, role: 'owner' });
    seen.add(event.id);
  }

  const memberships = await listUserMemberships(userId);
  for (const { membership, org } of memberships) {
    if (!['admin', 'cohost', 'gate'].includes(membership.role)) continue;
    const eventIds = await listOrgEventIds(org.id);
    for (const eventId of eventIds) {
      if (seen.has(eventId)) continue;
      if (membership.role === 'gate' && membership.eventScope?.length) {
        if (!membership.eventScope.includes(eventId)) continue;
      }
      const event = await getEventMeta(eventId);
      if (!event) continue;
      out.push({ event, org, role: membership.role });
      seen.add(eventId);
    }
    // Events where this org is an accepted co-host.
    // (Co-host orgs scan for the shared event too.)
    // EventHost rows live under the event partition — check via events the
    // org already hosts: skip unless linked; covered by listOrgEventIds only
    // when the org created a pointer. TODO(api-gap): co-host org event
    // pointers are written on accept in package follow-up.
  }
  return out;
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

// =====================================================================
// v2: sessions, OTP challenges, notifications, personal invites
// =====================================================================

// ---------- sessions (A7, "Sign-in methods") ----------
//   SESSION#<id> / METADATA   gsi2 USER#<uid>#SESSIONS
// Access tokens carry `sid`; the auth guard rejects revoked sessions.

const sessionPk = (id: string) => `SESSION#${id}`;

export interface Session {
  id: string;
  userId: string;
  device?: string;
  ip?: string;
  method: 'otp' | 'apple' | 'legacy';
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string;
}

function stripItem<X>(item: Record<string, unknown>): X {
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = item;
  return rest as X;
}

export async function createSession(input: {
  userId: string;
  device?: string;
  ip?: string;
  method: Session['method'];
}): Promise<Session> {
  const createdAt = now();
  const session: Session = {
    id: randomUUID(),
    userId: input.userId,
    device: input.device?.slice(0, 200),
    ip: input.ip,
    method: input.method,
    createdAt,
    lastSeenAt: createdAt,
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: sessionPk(session.id),
        sk: 'METADATA',
        ...session,
        gsi2pk: `USER#${input.userId}#SESSIONS`,
        gsi2sk: createdSk(createdAt, session.id),
      },
    })
  );
  return session;
}

export async function getSession(id: string): Promise<Session | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: sessionPk(id), sk: 'METADATA' } })
  );
  return res.Item ? stripItem<Session>(res.Item) : null;
}

export async function touchSession(id: string): Promise<void> {
  await docClient
    .send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: sessionPk(id), sk: 'METADATA' },
        UpdateExpression: 'SET lastSeenAt = :at',
        ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(revokedAt)',
        ExpressionAttributeValues: { ':at': now() },
      })
    )
    .catch(() => undefined);
}

export async function listUserSessions(userId: string): Promise<Session[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}#SESSIONS` },
      ScanIndexForward: false,
      Limit: 100,
    })
  );
  return (res.Items ?? [])
    .map((item) => stripItem<Session>(item))
    .filter((s) => !s.revokedAt);
}

export async function revokeSession(userId: string, id: string): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: sessionPk(id), sk: 'METADATA' },
        UpdateExpression: 'SET revokedAt = :at',
        ConditionExpression: 'userId = :uid AND attribute_not_exists(revokedAt)',
        ExpressionAttributeValues: { ':at': now(), ':uid': userId },
      })
    );
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
  await revokeSessionRefreshTokens(userId, id);
  return true;
}

// A7: revoke every session except `keepId` (contact change / sign out others).
export async function revokeUserSessions(userId: string, keepId?: string): Promise<number> {
  const sessions = await listUserSessions(userId);
  let n = 0;
  for (const s of sessions) {
    if (s.id === keepId) continue;
    if (await revokeSession(userId, s.id)) n++;
  }
  // Session-less (pre-v2) refresh tokens go too.
  await revokeSessionRefreshTokens(userId, undefined);
  return n;
}

// ---------- OTP challenges (A1) ----------
//   OTP#<id> / METADATA   gsi1 OTPEXP/<expiresAt> (cleanup cron)
//                         gsi2 OTPCONTACT#<contact>/<createdAt> (send rate limit)

const otpPk = (id: string) => `OTP#${id}`;

export interface OtpChallenge {
  id: string;
  contact: string;
  contactKind: 'email' | 'phone';
  channel: 'sms' | 'whatsapp' | 'email';
  codeHash: string;
  attempts: number;
  expiresAt: string;
  consumedAt?: string;
  ip?: string;
  deviceId?: string;
  // 'signin' (sign in = sign up) or 'change_contact' (A7, bound to userId).
  purpose: 'signin' | 'change_contact';
  userId?: string;
  createdAt: string;
}

export function otpCodeHash(challengeId: string, code: string): string {
  return createHmac('sha256', env.jwtSecret).update(`${challengeId}:${code}`).digest('hex');
}

export async function countRecentOtpSends(contact: string, sinceIso: string): Promise<number> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk >= :since',
      ExpressionAttributeValues: { ':pk': `OTPCONTACT#${contact}`, ':since': sinceIso },
      Select: 'COUNT',
    })
  );
  return res.Count ?? 0;
}

export async function oldestRecentOtpSend(contact: string, sinceIso: string): Promise<string | null> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk AND gsi2sk >= :since',
      ExpressionAttributeValues: { ':pk': `OTPCONTACT#${contact}`, ':since': sinceIso },
      Limit: 1,
    })
  );
  return (res.Items?.[0]?.createdAt as string | undefined) ?? null;
}

export async function createOtpChallenge(input: {
  contact: { kind: 'email' | 'phone'; value: string };
  channel: OtpChallenge['channel'];
  purpose: OtpChallenge['purpose'];
  userId?: string;
  ip?: string;
  deviceId?: string;
}): Promise<{ challenge: OtpChallenge; code: string }> {
  const id = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const createdAt = now();
  const challenge: OtpChallenge = {
    id,
    contact: input.contact.value,
    contactKind: input.contact.kind,
    channel: input.channel,
    codeHash: otpCodeHash(id, code),
    attempts: 0,
    expiresAt: new Date(Date.now() + env.otpTtlMinutes * 60_000).toISOString(),
    ip: input.ip,
    deviceId: input.deviceId,
    purpose: input.purpose,
    userId: input.userId,
    createdAt,
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: otpPk(id),
        sk: 'METADATA',
        ...challenge,
        gsi1pk: 'OTPEXP',
        gsi1sk: challenge.expiresAt,
        gsi2pk: `OTPCONTACT#${challenge.contact}`,
        gsi2sk: createdAt,
      },
    })
  );
  return { challenge, code };
}

export async function getOtpChallenge(id: string): Promise<OtpChallenge | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: otpPk(id), sk: 'METADATA' } })
  );
  return res.Item ? stripItem<OtpChallenge>(res.Item) : null;
}

// Wrong code: count the attempt. Returns attempts used after this one.
export async function recordOtpFailure(id: string): Promise<number> {
  try {
    const res = await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: otpPk(id), sk: 'METADATA' },
        UpdateExpression: 'ADD attempts :one',
        ConditionExpression: 'attempts < :max AND attribute_not_exists(consumedAt)',
        ExpressionAttributeValues: { ':one': 1, ':max': env.otpMaxAttempts },
        ReturnValues: 'ALL_NEW',
      })
    );
    return (res.Attributes?.attempts as number | undefined) ?? env.otpMaxAttempts;
  } catch (e) {
    if (isConditionalCheck(e)) return env.otpMaxAttempts;
    throw e;
  }
}

// Correct code: single-use consume (a replay or a burned code fails).
export async function consumeOtpChallenge(id: string): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: otpPk(id), sk: 'METADATA' },
        UpdateExpression: 'SET consumedAt = :at',
        ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(consumedAt) AND attempts < :max',
        ExpressionAttributeValues: { ':at': now(), ':max': env.otpMaxAttempts },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// otp.cleanup cron: delete challenges that expired before `beforeIso`. The
// caller keeps an hour of history so the per-contact send limit still sees it.
export async function cleanupOtpChallenges(beforeIso: string): Promise<number> {
  let deleted = 0;
  for (let page = 0; page < 20; page++) {
    const res = await docClient.send(
      new QueryCommand({
        TableName: T(),
        IndexName: 'gsi1',
        KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk < :before',
        ExpressionAttributeValues: { ':pk': 'OTPEXP', ':before': beforeIso },
        Limit: 100,
      })
    );
    const items = res.Items ?? [];
    for (const item of items) {
      await docClient.send(new DeleteCommand({ TableName: T(), Key: { pk: item.pk as string, sk: 'METADATA' } }));
      deleted++;
    }
    if (!res.LastEvaluatedKey || items.length === 0) break;
  }
  return deleted;
}

// ---------- notifications (stored inbox items) ----------
//   NOTIF#<userId> / <createdAt>#<id>

export interface StoredNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

export async function createNotification(
  userId: string,
  input: { type: string; title: string; body: string; link?: string }
): Promise<StoredNotification> {
  const createdAt = now();
  const n: StoredNotification = { id: randomUUID(), userId, ...input, createdAt };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: `NOTIF#${userId}`, sk: `${createdAt}#${n.id}`, ...n },
    })
  );
  return n;
}

export async function listUserNotifications(userId: string, limit = 50): Promise<StoredNotification[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `NOTIF#${userId}` },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return (res.Items ?? []).map((item) => stripItem<StoredNotification>(item));
}

// ---------- daily rate counters (decision-20) ----------
//   RATE#<scope> / DAY#<yyyy-mm-dd>   n

export async function bumpDailyCounter(scope: string, limit: number): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: `RATE#${scope}`, sk: `DAY#${day}` },
        UpdateExpression: 'ADD n :one',
        ConditionExpression: 'attribute_not_exists(n) OR n < :limit',
        ExpressionAttributeValues: { ':one': 1, ':limit': limit },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// ---------- personal invites (I1–I10) ----------
//   INVITE#<id>      / METADATA            invite (gsi2 USER#<host>#INVITES;
//                                          gsi1 INVITES#ACTIVE/<startsAt> while active)
//   INVITECODE#<code>/ ID                  code -> inviteId
//   INVITE#<id>      / RSVP#<userId>       InviteRsvp (gsi2 USER#<uid>#RSVPS)
//   INVITE#<id>      / UPDATE#<at>#<id>    InviteUpdate
//   INVITE#<id>      / REPORT#<userId>     abuse report (gsi1 INVITES#REPORTED)
//
// "Waiting on you": the spec has no delivered-invite record, so a signed-in
// viewer with no reply gets an InviteRsvp with status 'seen'. 'seen' rows
// never count as replies (not in counts, guests, faces or notifications);
// they feed /me/plans.waiting_on_you and /feed.invites_pending.

const invitePk = (id: string) => `INVITE#${id}`;
const inviteCodePk = (code: string) => `INVITECODE#${code}`;
const INVITES_ACTIVE_GSI_PK = 'INVITES#ACTIVE';

export type InviteRsvpStatus = 'going' | 'maybe' | 'no' | 'requested' | 'declined' | 'seen';

export interface Invite {
  id: string;
  hostUserId: string;
  code: string;
  title: string;
  startsAt?: string;
  tz?: string;
  placeText: string;
  area?: string;
  cover?: { tone?: string; image_url?: string };
  note?: string;
  approveGuests: boolean;
  allowPlusOnes: boolean;
  guestCap?: number | null;
  showGuestList: boolean;
  hideAddressUntilGoing: boolean;
  status: 'active' | 'cancelled' | 'moved';
  movedToEventId?: string;
  movedToOrgId?: string;
  // Going guests + their plus-ones (I4 cap counter, updated transactionally).
  goingSeats: number;
  reminderSentAt?: string;
  reviewFlaggedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InviteRsvp {
  inviteId: string;
  userId: string;
  status: InviteRsvpStatus;
  plusOnes: number;
  checkedInAt?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InviteUpdate {
  id: string;
  inviteId: string;
  body: string;
  sentAt: string;
  recipientCount: number;
  channels: string[];
}

export class InviteError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const rsvpSeats = (r: Pick<InviteRsvp, 'status' | 'plusOnes'> | null | undefined) =>
  r && r.status === 'going' ? 1 + (r.plusOnes ?? 0) : 0;

function newInviteCode(): string {
  return randomBytes(8).toString('base64url').replace(/[-_]/g, '').slice(0, 10) || randomUUID().slice(0, 10);
}

export async function createInvite(
  input: Omit<Invite, 'id' | 'code' | 'status' | 'goingSeats' | 'createdAt' | 'updatedAt'>
): Promise<Invite> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const createdAt = now();
    const invite: Invite = {
      ...input,
      id: randomUUID(),
      code: newInviteCode(),
      status: 'active',
      goingSeats: 0,
      createdAt,
      updatedAt: createdAt,
    };
    try {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: T(),
                Item: { pk: inviteCodePk(invite.code), sk: 'ID', inviteId: invite.id },
                ConditionExpression: 'attribute_not_exists(pk)',
              },
            },
            {
              Put: {
                TableName: T(),
                Item: {
                  pk: invitePk(invite.id),
                  sk: 'METADATA',
                  ...invite,
                  gsi2pk: `USER#${input.hostUserId}#INVITES`,
                  gsi2sk: createdSk(createdAt, invite.id),
                  ...(invite.startsAt ? { gsi1pk: INVITES_ACTIVE_GSI_PK, gsi1sk: invite.startsAt } : {}),
                },
              },
            },
          ],
        })
      );
      return invite;
    } catch (e) {
      if (!isConditionalCheck(e)) throw e; // code collision: retry with a new code
    }
  }
  throw new Error('createInvite: could not allocate a unique code');
}

export async function getInvite(id: string): Promise<Invite | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: invitePk(id), sk: 'METADATA' } })
  );
  return res.Item ? stripItem<Invite>(res.Item) : null;
}

export async function getInviteByCode(code: string): Promise<Invite | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: inviteCodePk(code), sk: 'ID' } })
  );
  const id = res.Item?.inviteId as string | undefined;
  return id ? getInvite(id) : null;
}

// Routes accept either the invite id or its share code.
export async function resolveInvite(idOrCode: string): Promise<Invite | null> {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(idOrCode)) {
    const byId = await getInvite(idOrCode);
    if (byId) return byId;
  }
  return getInviteByCode(idOrCode);
}

type InviteEditable = Pick<
  Invite,
  | 'title'
  | 'startsAt'
  | 'tz'
  | 'placeText'
  | 'area'
  | 'cover'
  | 'note'
  | 'approveGuests'
  | 'allowPlusOnes'
  | 'guestCap'
  | 'showGuestList'
  | 'hideAddressUntilGoing'
>;

export async function updateInviteFields(
  id: string,
  fields: { [K in keyof InviteEditable]?: InviteEditable[K] | null }
): Promise<Invite | null> {
  const names: Record<string, string> = { '#status': 'status' };
  const values: Record<string, unknown> = { ':active': 'active', ':now': now() };
  const sets: string[] = ['updatedAt = :now'];
  const removes: string[] = [];
  let i = 0;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    names[`#f${i}`] = key;
    if (value === null) {
      removes.push(`#f${i}`);
    } else {
      sets.push(`#f${i} = :v${i}`);
      values[`:v${i}`] = value;
    }
    i++;
  }
  if (fields.startsAt) {
    // A new date re-arms the day-before reminder.
    sets.push('gsi1pk = :gpk', 'gsi1sk = :gsk');
    values[':gpk'] = INVITES_ACTIVE_GSI_PK;
    values[':gsk'] = fields.startsAt;
    removes.push('reminderSentAt');
  }
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: invitePk(id), sk: 'METADATA' },
        UpdateExpression: `SET ${sets.join(', ')}${removes.length ? ` REMOVE ${removes.join(', ')}` : ''}`,
        ConditionExpression: '#status = :active',
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );
  } catch (e) {
    if (isConditionalCheck(e)) throw new InviteError('This invite can no longer be edited', 'not_active');
    throw e;
  }
  return getInvite(id);
}

// active -> cancelled | moved. Leaves the GSI1 reminder feed.
export async function setInviteStatus(
  id: string,
  to: 'cancelled' | 'moved',
  extra: { movedToEventId?: string; movedToOrgId?: string } = {}
): Promise<boolean> {
  const at = now();
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: invitePk(id), sk: 'METADATA' },
        UpdateExpression:
          `SET #status = :to, updatedAt = :at${to === 'cancelled' ? ', cancelledAt = :at' : ', movedToEventId = :eid, movedToOrgId = :oid'} REMOVE gsi1pk, gsi1sk`,
        ConditionExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':to': to,
          ':at': at,
          ':active': 'active',
          ...(to === 'moved' ? { ':eid': extra.movedToEventId, ':oid': extra.movedToOrgId } : {}),
        },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

export async function listInviteRsvps(inviteId: string): Promise<InviteRsvp[]> {
  const out: InviteRsvp[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: T(),
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
        ExpressionAttributeValues: { ':pk': invitePk(inviteId), ':p': 'RSVP#' },
        ExclusiveStartKey,
      })
    );
    out.push(...(res.Items ?? []).map((item) => stripItem<InviteRsvp>(item)));
    ExclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return out;
}

export async function getInviteRsvp(inviteId: string, userId: string): Promise<InviteRsvp | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: invitePk(inviteId), sk: `RSVP#${userId}` } })
  );
  return res.Item ? stripItem<InviteRsvp>(res.Item) : null;
}

export async function listUserRsvps(userId: string): Promise<InviteRsvp[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}#RSVPS` },
      Limit: 500,
    })
  );
  return (res.Items ?? []).map((item) => stripItem<InviteRsvp>(item));
}

export async function listHostedInvites(userId: string): Promise<Invite[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}#INVITES` },
      ScanIndexForward: false,
      Limit: 500,
    })
  );
  return (res.Items ?? []).map((item) => stripItem<Invite>(item));
}

export async function getInvites(ids: string[]): Promise<Invite[]> {
  if (ids.length === 0) return [];
  const items = await batchGet<Record<string, unknown>>(
    [...new Set(ids)].map((id) => ({ pk: invitePk(id), sk: 'METADATA' }))
  );
  return items.map((item) => stripItem<Invite>(item));
}

// Writes an RSVP and moves the invite's goingSeats counter in one
// transaction. The guest cap (I4) is enforced by the counter condition, and
// the RSVP row is guarded by its previous updatedAt (no lost updates).
export async function putInviteRsvp(
  invite: Invite,
  prev: InviteRsvp | null,
  next: { status: InviteRsvpStatus; plusOnes: number; decidedBy?: string; decidedAt?: string }
): Promise<InviteRsvp> {
  const at = now();
  const rsvp: InviteRsvp = {
    inviteId: invite.id,
    userId: prev?.userId ?? '',
    status: next.status,
    plusOnes: next.status === 'going' || next.status === 'requested' ? next.plusOnes : 0,
    checkedInAt: next.status === 'going' ? prev?.checkedInAt : undefined,
    decidedBy: next.decidedBy ?? prev?.decidedBy,
    decidedAt: next.decidedAt ?? prev?.decidedAt,
    createdAt: prev?.createdAt ?? at,
    updatedAt: at,
  };
  return writeRsvp(invite, prev, rsvp);
}

export async function createInviteRsvp(
  invite: Invite,
  userId: string,
  next: { status: InviteRsvpStatus; plusOnes: number }
): Promise<InviteRsvp> {
  const at = now();
  return writeRsvp(invite, null, {
    inviteId: invite.id,
    userId,
    status: next.status,
    plusOnes: next.status === 'going' || next.status === 'requested' ? next.plusOnes : 0,
    createdAt: at,
    updatedAt: at,
  });
}

async function writeRsvp(invite: Invite, prev: InviteRsvp | null, rsvp: InviteRsvp): Promise<InviteRsvp> {
  const delta = rsvpSeats(rsvp) - rsvpSeats(prev);
  const capCheck = delta > 0 && invite.guestCap != null;
  const values: Record<string, unknown> = { ':active': 'active', ':d': delta, ':at': rsvp.updatedAt };
  let condition = '#status = :active';
  if (capCheck) {
    condition += ' AND goingSeats <= :maxBefore';
    values[':maxBefore'] = (invite.guestCap as number) - delta;
  }
  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: T(),
              Item: {
                pk: invitePk(invite.id),
                sk: `RSVP#${rsvp.userId}`,
                ...rsvp,
                gsi2pk: `USER#${rsvp.userId}#RSVPS`,
                gsi2sk: `INVITE#${invite.id}`,
              },
              ...(prev
                ? {
                    ConditionExpression: 'updatedAt = :prev',
                    ExpressionAttributeValues: { ':prev': prev.updatedAt },
                  }
                : { ConditionExpression: 'attribute_not_exists(sk)' }),
            },
          },
          {
            Update: {
              TableName: T(),
              Key: { pk: invitePk(invite.id), sk: 'METADATA' },
              UpdateExpression: 'ADD goingSeats :d SET updatedAt = :at',
              ConditionExpression: condition,
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: values,
            },
          },
        ],
      })
    );
  } catch (e) {
    if (!isConditionalCheck(e)) throw e;
    const reasons = (e as { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? [];
    if (reasons[0]?.Code === 'ConditionalCheckFailed') {
      throw new InviteError('Your reply changed in the meantime, try again', 'conflict');
    }
    const fresh = await getInvite(invite.id);
    if (fresh && fresh.status !== 'active') {
      throw new InviteError('This invite is no longer active', fresh.status === 'moved' ? 'already_moved' : 'cancelled', 410);
    }
    throw new InviteError("It's full", 'full');
  }
  return rsvp;
}

// "Waiting on you" marker: only written when the viewer has no row yet.
export async function markInviteSeen(invite: Invite, userId: string): Promise<void> {
  const at = now();
  await docClient
    .send(
      new PutCommand({
        TableName: T(),
        Item: {
          pk: invitePk(invite.id),
          sk: `RSVP#${userId}`,
          inviteId: invite.id,
          userId,
          status: 'seen',
          plusOnes: 0,
          createdAt: at,
          updatedAt: at,
          gsi2pk: `USER#${userId}#RSVPS`,
          gsi2sk: `INVITE#${invite.id}`,
        },
        ConditionExpression: 'attribute_not_exists(sk)',
      })
    )
    .catch((e) => {
      if (!isConditionalCheck(e)) throw e;
    });
}

export async function setRsvpCheckIn(inviteId: string, userId: string, checkedIn: boolean): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: invitePk(inviteId), sk: `RSVP#${userId}` },
        UpdateExpression: checkedIn ? 'SET checkedInAt = :at, updatedAt = :at' : 'SET updatedAt = :at REMOVE checkedInAt',
        ConditionExpression: '#status = :going',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':at': now(), ':going': 'going' },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

export async function createInviteUpdate(
  inviteId: string,
  body: string,
  recipientCount: number,
  channels: string[]
): Promise<InviteUpdate> {
  const sentAt = now();
  const update: InviteUpdate = { id: randomUUID(), inviteId, body, sentAt, recipientCount, channels };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: invitePk(inviteId), sk: `UPDATE#${sentAt}#${update.id}`, ...update },
    })
  );
  return update;
}

export async function listInviteUpdates(inviteId: string): Promise<InviteUpdate[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': invitePk(inviteId), ':p': 'UPDATE#' },
      ScanIndexForward: false,
      Limit: 50,
    })
  );
  return (res.Items ?? []).map((item) => stripItem<InviteUpdate>(item));
}

// TODO(decision-20): report button on every invite page; reports land in a
// GSI1 queue (INVITES#REPORTED) for a Trust & Safety review tool.
export async function createInviteReport(inviteId: string, userId: string | undefined, reason: string): Promise<void> {
  const at = now();
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: invitePk(inviteId),
        sk: `REPORT#${userId ?? `anon-${randomUUID()}`}`,
        inviteId,
        userId,
        reason: reason.slice(0, 500),
        createdAt: at,
        gsi1pk: 'INVITES#REPORTED',
        gsi1sk: `${at}#${inviteId}`,
      },
    })
  );
}

// TODO(decision-20): invites above INVITE_REVIEW_GUESTS go to a review queue
// (INVITES#REVIEW). No reviewer tool exists yet; this only records it.
export async function flagInviteForReview(invite: Invite): Promise<void> {
  if (invite.reviewFlaggedAt) return;
  const at = now();
  await docClient
    .send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: invitePk(invite.id), sk: 'METADATA' },
        UpdateExpression: 'SET reviewFlaggedAt = :at',
        ConditionExpression: 'attribute_not_exists(reviewFlaggedAt)',
        ExpressionAttributeValues: { ':at': at },
      })
    )
    .then(() =>
      docClient.send(
        new PutCommand({
          TableName: T(),
          Item: {
            pk: `INVITEREVIEW#${invite.id}`,
            sk: 'FLAG',
            inviteId: invite.id,
            goingSeats: invite.goingSeats,
            createdAt: at,
            gsi1pk: 'INVITES#REVIEW',
            gsi1sk: `${at}#${invite.id}`,
          },
        })
      )
    )
    .catch((e) => {
      if (!isConditionalCheck(e)) throw e;
    });
}

// invite.reminder: active invites starting within [fromIso, toIso].
export async function listInvitesStartingBetween(fromIso: string, toIso: string): Promise<Invite[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk BETWEEN :from AND :to',
      ExpressionAttributeValues: { ':pk': INVITES_ACTIVE_GSI_PK, ':from': fromIso, ':to': toIso },
      Limit: 500,
    })
  );
  return (res.Items ?? []).map((item) => stripItem<Invite>(item));
}

export async function markInviteReminderSent(id: string): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: invitePk(id), sk: 'METADATA' },
        UpdateExpression: 'SET reminderSentAt = :at',
        ConditionExpression: 'attribute_not_exists(reminderSentAt) AND #status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':at': now(), ':active': 'active' },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// I7: going guests keep free spots as comp tickets on the draft event. Each
// guest gets a zero-value order fulfilled through the normal ticket path, so
// comps carry credentials and show up in the door manifest like any ticket.
export async function issueCompTickets(
  event: EventItem,
  tier: TicketTier,
  guests: { userId: string; qty: number }[],
  ref: string
): Promise<number> {
  let issued = 0;
  for (const guest of guests) {
    if (guest.qty <= 0) continue;
    if (!(await reserveTickets(event.id, tier.id, guest.qty))) break;
    const order = await createPendingOrder({
      userId: guest.userId,
      eventId: event.id,
      items: [{ tierId: tier.id, tierName: tier.name, quantity: guest.qty, unitPriceCents: 0 }],
      subtotalCents: 0,
      discountCents: 0,
      feesCents: 0,
      totalCents: 0,
      currency: event.currency,
      expiresAt: new Date(Date.now() + env.reservationTtlMinutes * 60_000).toISOString(),
    });
    await fulfillOrder(order.id, `comp_${ref}_${order.id.slice(0, 8)}`);
    await deleteExpireIndex(order.id);
    issued += guest.qty;
  }
  return issued;
}

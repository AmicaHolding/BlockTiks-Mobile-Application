// V3 data-layer additions (handoff/05 + handoff/06): OTP sign-in challenges,
// personal invites (host/RSVP/posts/polls/photos), wallet (cash + credits),
// group-pay shares, waiting room, and live-QR window payloads.
// All items use the same single-table key scheme as db.ts so they run on
// either engine (sqlite/D1 or dynamo).

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { createHash, createHmac, randomInt, randomUUID } from 'crypto';
import { docClient } from '../aws';
import { env } from '../env';

const T = () => env.tableName;
const now = () => new Date().toISOString();
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

function isConditionalCheck(e: unknown): boolean {
  const n = (e as { name?: string })?.name;
  return n === 'ConditionalCheckFailedException' || n === 'TransactionCanceledException';
}

// ===========================================================================
// A. One-time-code sign in (no passwords) — OtpChallenge
// ===========================================================================

export interface OtpChallenge {
  contact: string; // email (lowercased) or E.164 phone
  channel: 'email' | 'sms' | 'whatsapp';
  codeHash: string;
  attempts: number;
  expiresAt: string;
  consumedAt?: string;
  sendWindowStart: string;
  sendCount: number;
  createdAt: string;
}

const otpPk = (contact: string) => `OTP#${contact.toLowerCase()}`;

export function detectChannel(contact: string): 'email' | 'sms' | null {
  const c = contact.trim();
  if (/^\+[1-9]\d{6,14}$/.test(c)) return 'sms';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return 'email';
  return null;
}

// A1: 10-min code, max 5 attempts, max 5 sends per contact per hour.
export async function issueOtp(contact: string): Promise<{ code: string; expiresAt: string } | null> {
  const channel = detectChannel(contact);
  if (!channel) return null;
  const normalized = contact.trim().toLowerCase();
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: otpPk(normalized), sk: 'CHALLENGE' } })
  );
  const existing = res.Item as OtpChallenge | undefined;
  const hourAgo = Date.now() - 60 * 60 * 1000;
  if (
    existing &&
    existing.sendCount >= 5 &&
    new Date(existing.sendWindowStart).getTime() > hourAgo
  ) {
    return null; // send cap hit; caller returns the same generic response
  }
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const item: OtpChallenge = {
    contact: normalized,
    channel,
    codeHash: sha256(`${normalized}:${code}`),
    attempts: 0,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    sendWindowStart:
      existing && new Date(existing.sendWindowStart).getTime() > hourAgo
        ? existing.sendWindowStart
        : now(),
    sendCount:
      existing && new Date(existing.sendWindowStart).getTime() > hourAgo
        ? existing.sendCount + 1
        : 1,
    createdAt: now(),
  };
  await docClient.send(
    new PutCommand({ TableName: T(), Item: { pk: otpPk(normalized), sk: 'CHALLENGE', ...item } })
  );
  return { code, expiresAt: item.expiresAt };
}

export type OtpVerifyResult = 'ok' | 'wrong_code' | 'expired' | 'too_many' | 'none';

export async function verifyOtp(contact: string, code: string): Promise<OtpVerifyResult> {
  const normalized = contact.trim().toLowerCase();
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: otpPk(normalized), sk: 'CHALLENGE' } })
  );
  const ch = res.Item as OtpChallenge | undefined;
  if (!ch || ch.consumedAt) return 'none';
  if (new Date(ch.expiresAt).getTime() < Date.now()) return 'expired';
  if (ch.attempts >= 5) return 'too_many';
  if (sha256(`${normalized}:${code}`) !== ch.codeHash) {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: otpPk(normalized), sk: 'CHALLENGE' },
        UpdateExpression: 'ADD attempts :one',
        ExpressionAttributeValues: { ':one': 1 },
      })
    );
    return 'wrong_code';
  }
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: otpPk(normalized), sk: 'CHALLENGE' },
      UpdateExpression: 'SET consumedAt = :t',
      ExpressionAttributeValues: { ':t': now() },
    })
  );
  return 'ok';
}

// Phone-contact -> user lookup row (USER#PHONE#<e164> / ID), written whenever
// a user's phone is set. Email lookup already exists (USER#EMAIL# / ID).
export const phonePk = (phone: string) => `USER#PHONE#${phone}`;

export async function getUserIdByPhone(phone: string): Promise<string | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: phonePk(phone), sk: 'ID' } })
  );
  return (res.Item?.userId as string) ?? null;
}

export async function linkPhoneToUser(phone: string, userId: string): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: phonePk(phone), sk: 'ID', userId, createdAt: now() },
      ConditionExpression: 'attribute_not_exists(pk) OR userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    })
  );
}

// ===========================================================================
// B. Personal invites (handoff/06)
// ===========================================================================

export type RsvpStatus = 'going' | 'maybe' | 'no' | 'requested' | 'declined';
export type RsvpDeadline = 'none' | '1d' | '3d' | '1w';
export type RsvpStyle = 'words' | 'emoji' | 'custom';
export type InviteReminder = '1w' | '1d' | '2h';

export interface InvitePollOption {
  id: string;
  startsAt: string;
  votes?: number;
}

export interface Invite {
  id: string;
  code: string;
  hostUserId: string;
  hostName?: string;
  title: string;
  // Exactly one of: startsAt (fixed date) or poll options (date to be decided).
  startsAt?: string;
  venueTimezone?: string;
  pollOptions?: InvitePollOption[];
  pollLockedAt?: string;
  placeText: string;
  area?: string;
  coverColour?: string; // one of 5 presets when no image
  coverImageUrl?: string;
  description?: string;
  rsvpDeadline: RsvpDeadline;
  rsvpStyle: RsvpStyle;
  rsvpLabels: { going: string; maybe: string; no: string };
  reminders: InviteReminder[];
  guestCap: number; // 0 = unlimited (incl. plus-ones)
  approveGuests: boolean;
  allowPlusOnes: boolean;
  showGuestList: boolean;
  hideAddressUntilGoing: boolean;
  status: 'active' | 'cancelled' | 'moved';
  movedToEventId?: string;
  movedToOrgId?: string;
  createdAt: string;
}

export interface InviteRsvp {
  inviteCode: string;
  userId: string;
  name?: string;
  status: RsvpStatus;
  plusOnes: number;
  checkedInAt?: string;
  decidedBy?: string;
  decidedAt: string;
}

export interface InvitePost {
  id: string;
  inviteCode: string;
  authorId: string;
  authorName?: string;
  kind: 'blast' | 'comment';
  body: string;
  parentId?: string;
  likeCount: number;
  likedByMe?: boolean;
  createdAt: string;
  deletedAt?: string;
}

export interface InvitePhoto {
  id: string;
  inviteCode: string;
  uploaderId: string;
  url: string;
  createdAt: string;
  deletedAt?: string;
}

const invitePk = (code: string) => `INVITE#${code}`;
const hostInvitesGsi = (userId: string) => `USER#${userId}#HOSTING`;
const userRsvpsGsi = (userId: string) => `USER#${userId}#INVITES`;

const INVITE_CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
function inviteCode(): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += INVITE_CODE_ALPHABET[randomInt(0, INVITE_CODE_ALPHABET.length)];
  return s;
}

const INVITE_COVER_PRESETS = ['night', 'gold', 'rumman', 'sand', 'palm'];

export async function createInvite(input: {
  hostUserId: string;
  hostName?: string;
  title: string;
  startsAt?: string;
  venueTimezone?: string;
  pollOptions?: { startsAt: string }[];
  placeText: string;
  area?: string;
  coverColour?: string;
  coverImageUrl?: string;
  description?: string;
  rsvpDeadline?: RsvpDeadline;
  rsvpStyle?: RsvpStyle;
  rsvpLabels?: { going?: string; maybe?: string; no?: string };
  reminders?: InviteReminder[];
  guestCap?: number;
  approveGuests?: boolean;
  allowPlusOnes?: boolean;
  showGuestList?: boolean;
  hideAddressUntilGoing?: boolean;
}): Promise<Invite> {
  const code = inviteCode();
  const invite: Invite = {
    id: randomUUID(),
    code,
    hostUserId: input.hostUserId,
    hostName: input.hostName,
    title: input.title,
    startsAt: input.startsAt,
    venueTimezone: input.venueTimezone ?? 'Asia/Dubai',
    pollOptions: input.pollOptions?.map((o) => ({ id: randomUUID(), startsAt: o.startsAt, votes: 0 })),
    placeText: input.placeText,
    area: input.area,
    coverColour: input.coverImageUrl
      ? undefined
      : (INVITE_COVER_PRESETS.includes(input.coverColour ?? '') ? input.coverColour : 'night'),
    coverImageUrl: input.coverImageUrl,
    description: input.description,
    rsvpDeadline: input.rsvpDeadline ?? 'none',
    rsvpStyle: input.rsvpStyle ?? 'words',
    rsvpLabels: {
      going: input.rsvpLabels?.going?.slice(0, 16) || 'Going',
      maybe: input.rsvpLabels?.maybe?.slice(0, 16) || 'Maybe',
      no: input.rsvpLabels?.no?.slice(0, 16) || "Can't go",
    },
    reminders: input.reminders ?? ['1d', '2h'],
    guestCap: input.guestCap ?? 0,
    approveGuests: input.approveGuests ?? false,
    allowPlusOnes: input.allowPlusOnes ?? true,
    showGuestList: input.showGuestList ?? true,
    hideAddressUntilGoing: input.hideAddressUntilGoing ?? true,
    status: 'active',
    createdAt: now(),
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: invitePk(code),
        sk: 'METADATA',
        ...invite,
        gsi2pk: hostInvitesGsi(input.hostUserId),
        gsi2sk: `CREATED#${invite.createdAt}#${code}`,
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  );
  return invite;
}

export async function getInvite(code: string): Promise<Invite | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: invitePk(code), sk: 'METADATA' } })
  );
  if (!res.Item) return null;
  const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as Invite;
}

export async function updateInvite(code: string, fields: Partial<Invite>): Promise<Invite | null> {
  const allowed = [
    'title', 'startsAt', 'venueTimezone', 'placeText', 'area', 'coverColour', 'coverImageUrl',
    'description', 'rsvpDeadline', 'rsvpStyle', 'rsvpLabels', 'reminders', 'guestCap',
    'approveGuests', 'allowPlusOnes', 'showGuestList', 'hideAddressUntilGoing',
    'pollOptions', 'pollLockedAt', 'status', 'movedToEventId', 'movedToOrgId',
  ] as const;
  const sets: string[] = [];
  const removes: string[] = [];
  const values: Record<string, unknown> = {};
  for (const k of allowed) {
    if (!(k in fields)) continue;
    const v = fields[k as keyof Invite];
    if (v === undefined) removes.push(k);
    else { sets.push(`${k} = :${k}`); values[`:${k}`] = v; }
  }
  if (!sets.length && !removes.length) return getInvite(code);
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: invitePk(code), sk: 'METADATA' },
      UpdateExpression:
        (sets.length ? `SET ${sets.join(', ')}` : '') +
        (removes.length ? `${sets.length ? ' ' : ''}REMOVE ${removes.join(', ')}` : ''),
      ConditionExpression: 'attribute_exists(pk)',
      ...(Object.keys(values).length ? { ExpressionAttributeValues: values } : {}),
    })
  );
  return getInvite(code);
}

export async function listHostedInvites(userId: string): Promise<Invite[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk AND begins_with(gsi2sk, :p)',
      ExpressionAttributeValues: { ':pk': hostInvitesGsi(userId), ':p': 'CREATED#' },
      ScanIndexForward: false,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((i) => {
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = i;
    return rest as unknown as Invite;
  });
}

// ---- RSVPs ----

export async function getRsvp(code: string, userId: string): Promise<InviteRsvp | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: invitePk(code), sk: `RSVP#${userId}` } })
  );
  if (!res.Item) return null;
  const { pk, sk, gsi2pk, gsi2sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as InviteRsvp;
}

export async function listRsvps(code: string): Promise<InviteRsvp[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': invitePk(code), ':p': 'RSVP#' },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((i) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = i;
    return rest as unknown as InviteRsvp;
  });
}

export async function listUserRsvps(userId: string): Promise<InviteRsvp[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi2',
      KeyConditionExpression: 'gsi2pk = :pk',
      ExpressionAttributeValues: { ':pk': userRsvpsGsi(userId) },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((i) => {
    const { pk, sk, gsi2pk, gsi2sk, ...rest } = i;
    return rest as unknown as InviteRsvp;
  });
}

export class InviteError extends Error {
  constructor(message: string, public code: string) { super(message); }
}

// PE2/PE4/PE6 + capacity + approval. status 'going'|'maybe'|'no'.
export async function putRsvp(input: {
  code: string;
  userId: string;
  name?: string;
  status: 'going' | 'maybe' | 'no';
  plusOnes?: number;
  isHost?: boolean;
}): Promise<InviteRsvp> {
  const invite = await getInvite(input.code);
  if (!invite || invite.status !== 'active') throw new InviteError('Invite not found', 'not_found');
  if (!invite.pollOptions && !invite.startsAt) throw new InviteError('Invite has no date', 'no_date');

  const existing = await getRsvp(input.code, input.userId);
  // PE2: after the RSVP-by date only a change to "no" is allowed.
  const deadlineIso = rsvpDeadlineIso(invite);
  if (deadlineIso && new Date(deadlineIso).getTime() < Date.now() && input.status !== 'no') {
    throw new InviteError('RSVP is closed', 'rsvp_closed');
  }
  const plusOnes = invite.allowPlusOnes ? Math.min(Math.max(input.plusOnes ?? existing?.plusOnes ?? 0, 0), 2) : 0;
  if ((input.plusOnes ?? 0) > 0 && !invite.allowPlusOnes) throw new InviteError('Plus-ones off', 'no_plus_ones');

  const wantsGoing = input.status === 'going' || input.status === 'maybe';
  let status: RsvpStatus = input.status;
  if (wantsGoing && !existing && invite.approveGuests && !input.isHost) status = 'requested';
  if (existing?.status === 'declined' && !input.isHost) throw new InviteError('Request was declined', 'declined');

  // Capacity counts going + plus-ones; maybe doesn't take a spot per spec? It
  // does take a spot while pending approval only counts requests separately.
  if (status === 'going' && invite.guestCap > 0) {
    const rsvps = await listRsvps(input.code);
    const going = rsvps
      .filter((r) => r.status === 'going' && r.userId !== input.userId)
      .reduce((s, r) => s + 1 + r.plusOnes, 0);
    const existingSpots =
      existing?.status === 'going' ? 1 + existing.plusOnes : 0;
    if (going + 1 + plusOnes - existingSpots > invite.guestCap) {
      throw new InviteError('Guest list is full', 'full');
    }
  }

  const rsvp: InviteRsvp = {
    inviteCode: input.code,
    userId: input.userId,
    name: input.name ?? existing?.name,
    status,
    plusOnes: status === 'going' || status === 'maybe' ? plusOnes : 0,
    checkedInAt: existing?.checkedInAt,
    decidedAt: now(),
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: invitePk(input.code),
        sk: `RSVP#${input.userId}`,
        ...rsvp,
        gsi2pk: userRsvpsGsi(input.userId),
        gsi2sk: `STARTS#${invite.startsAt ?? 'TBD'}#${input.code}`,
      },
    })
  );
  return rsvp;
}

// Host approves/declines a 'requested' guest.
export async function decideRsvp(
  code: string,
  hostUserId: string,
  guestUserId: string,
  accept: boolean
): Promise<InviteRsvp> {
  const invite = await getInvite(code);
  if (!invite || invite.hostUserId !== hostUserId) throw new InviteError('Not the host', 'not_host');
  const rsvp = await getRsvp(code, guestUserId);
  if (!rsvp || rsvp.status !== 'requested') throw new InviteError('No pending request', 'no_request');
  const updated = { ...rsvp, status: (accept ? 'going' : 'declined') as RsvpStatus, decidedBy: hostUserId, decidedAt: now() };
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: invitePk(code), sk: `RSVP#${guestUserId}` },
      UpdateExpression: 'SET #status = :s, decidedBy = :h, decidedAt = :t',
      ConditionExpression: '#status = :req',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':s': updated.status, ':req': 'requested', ':h': hostUserId, ':t': updated.decidedAt },
    })
  );
  return updated;
}

// RSVP-by date = event start minus offset (venue end-of-day approximated as
// UTC end of day minus offset — spec PE3).
export function rsvpDeadlineIso(invite: Invite): string | null {
  if (invite.rsvpDeadline === 'none') return null;
  const base = invite.startsAt ? new Date(invite.startsAt) : null;
  if (!base) return null;
  const days = invite.rsvpDeadline === '1d' ? 1 : invite.rsvpDeadline === '3d' ? 3 : 7;
  return new Date(base.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

// ---- activity feed: blasts + comments + likes (PE5) ----

export async function createInvitePost(input: {
  code: string; authorId: string; authorName?: string; kind: 'blast' | 'comment';
  body: string; parentId?: string; isHost?: boolean;
}): Promise<InvitePost> {
  const body = input.body.slice(0, 300);
  if (input.kind === 'blast' && !input.isHost) throw new InviteError('Only the host can blast', 'not_host');
  if (input.parentId) {
    const parent = await docClient.send(
      new GetCommand({ TableName: T(), Key: { pk: invitePk(input.code), sk: `POST#${input.parentId}` } })
    );
    if (!parent.Item) throw new InviteError('Reply target not found', 'no_parent');
    if ((parent.Item as Record<string, unknown>).parentId) throw new InviteError('Replies are one level', 'depth');
  }
  const post: InvitePost = {
    id: randomUUID(),
    inviteCode: input.code,
    authorId: input.authorId,
    authorName: input.authorName,
    kind: input.kind,
    body,
    parentId: input.parentId,
    likeCount: 0,
    createdAt: now(),
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: invitePk(input.code), sk: `POST#${post.id}`, ...post },
    })
  );
  return post;
}

export async function listInvitePosts(code: string, viewerId?: string): Promise<InvitePost[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': invitePk(code), ':p': 'POST#' },
    })
  );
  const posts = ((res.Items ?? []) as Record<string, unknown>[])
    .map((i) => {
      const { pk, sk, ...rest } = i;
      return rest as unknown as InvitePost;
    })
    .filter((p) => !p.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (viewerId) {
    const likes = await listInviteLikes(code, viewerId);
    const liked = new Set(likes);
    for (const p of posts) p.likedByMe = liked.has(p.id);
  }
  return posts;
}

export async function deleteInvitePost(
  code: string, postId: string, actorId: string, isHost: boolean
): Promise<boolean> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: invitePk(code), sk: `POST#${postId}` } })
  );
  const post = res.Item as InvitePost | undefined;
  if (!post) return false;
  if (post.authorId !== actorId && !isHost) return false;
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: invitePk(code), sk: `POST#${postId}` },
      UpdateExpression: 'SET deletedAt = :t',
      ExpressionAttributeValues: { ':t': now() },
    })
  );
  return true;
}

export async function listInviteLikes(code: string, userId: string): Promise<string[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': invitePk(code), ':p': `LIKE#${userId}#` },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((i) => i.postId as string);
}

export async function toggleInvitePostLike(code: string, postId: string, userId: string): Promise<boolean> {
  const key = { pk: invitePk(code), sk: `LIKE#${userId}#${postId}` };
  const existing = await docClient.send(new GetCommand({ TableName: T(), Key: key }));
  if (existing.Item) {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          { Delete: { TableName: T(), Key: key } },
          {
            Update: {
              TableName: T(),
              Key: { pk: invitePk(code), sk: `POST#${postId}` },
              UpdateExpression: 'ADD likeCount :n',
              ExpressionAttributeValues: { ':n': -1 },
            },
          },
        ],
      })
    );
    return false;
  }
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: T(), Item: { ...key, postId, userId, createdAt: now() } } },
        {
          Update: {
            TableName: T(),
            Key: { pk: invitePk(code), sk: `POST#${postId}` },
            UpdateExpression: 'ADD likeCount :n',
            ExpressionAttributeValues: { ':n': 1 },
          },
        },
      ],
    })
  );
  return true;
}

// ---- date poll (PE4) ----

export async function voteDateOption(code: string, optionId: string, userId: string): Promise<void> {
  const invite = await getInvite(code);
  if (!invite?.pollOptions || invite.pollLockedAt) throw new InviteError('No open poll', 'no_poll');
  if (!invite.pollOptions.some((o) => o.id === optionId)) throw new InviteError('Unknown option', 'bad_option');
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: T(),
            Item: {
              pk: invitePk(code), sk: `VOTE#${optionId}#${userId}`,
              optionId, userId, createdAt: now(),
            },
            ConditionExpression: 'attribute_not_exists(pk)',
          },
        },
      ],
    })
  ).catch((e) => { if (!isConditionalCheck(e)) throw e; });
}

export async function unvoteDateOption(code: string, optionId: string, userId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: T(),
      Key: { pk: invitePk(code), sk: `VOTE#${optionId}#${userId}` },
    })
  );
}

export async function listDateVotes(code: string): Promise<Record<string, string[]>> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': invitePk(code), ':p': 'VOTE#' },
    })
  );
  const out: Record<string, string[]> = {};
  for (const i of (res.Items ?? []) as Record<string, unknown>[]) {
    (out[i.optionId as string] ??= []).push(i.userId as string);
  }
  return out;
}

// PE4: lock sets the date, closes voting, and (caller) posts a host blast.
export async function lockPollOption(code: string, hostUserId: string, optionId: string): Promise<Invite> {
  const invite = await getInvite(code);
  if (!invite || invite.hostUserId !== hostUserId) throw new InviteError('Not the host', 'not_host');
  const opt = invite.pollOptions?.find((o) => o.id === optionId);
  if (!opt) throw new InviteError('Unknown option', 'bad_option');
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: invitePk(code), sk: 'METADATA' },
      UpdateExpression: 'SET startsAt = :s, pollLockedAt = :t REMOVE pollOptions',
      ConditionExpression: 'attribute_not_exists(pollLockedAt)',
      ExpressionAttributeValues: { ':s': opt.startsAt, ':t': now() },
    })
  );
  return (await getInvite(code))!;
}

// ---- photo album (PE6) ----

export async function addInvitePhoto(input: {
  code: string; uploaderId: string; url: string;
}): Promise<InvitePhoto> {
  const existing = await listInvitePhotos(input.code);
  if (existing.length >= 200) throw new InviteError('Album is full', 'album_full');
  const photo: InvitePhoto = {
    id: randomUUID(), inviteCode: input.code, uploaderId: input.uploaderId,
    url: input.url, createdAt: now(),
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: invitePk(input.code), sk: `PHOTO#${photo.id}`, ...photo },
    })
  );
  return photo;
}

export async function listInvitePhotos(code: string): Promise<InvitePhoto[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': invitePk(code), ':p': 'PHOTO#' },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[])
    .map((i) => { const { pk, sk, ...rest } = i; return rest as unknown as InvitePhoto; })
    .filter((p) => !p.deletedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function deleteInvitePhoto(
  code: string, photoId: string, actorId: string, isHost: boolean
): Promise<boolean> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: invitePk(code), sk: `PHOTO#${photoId}` } })
  );
  const photo = res.Item as InvitePhoto | undefined;
  if (!photo || (photo.uploaderId !== actorId && !isHost)) return false;
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: invitePk(code), sk: `PHOTO#${photoId}` },
      UpdateExpression: 'SET deletedAt = :t',
      ExpressionAttributeValues: { ':t': now() },
    })
  );
  return true;
}

// ===========================================================================
// C. Wallet (W1-W5): Cash + Credits
// ===========================================================================

export interface WalletCredit {
  id: string;
  userId: string;
  amountMinor: number;   // original amount
  remainingMinor: number;
  source: 'fee_credit' | 'promo' | 'refund';
  orderId?: string;
  earnedAt: string;
  expiresAt: string;     // W4: 12 months after earned
}

export interface Wallet {
  cashMinor: number;        // withdrawable
  pendingMinor: number;     // resale proceeds until the event happens (W2)
  credits: WalletCredit[];  // active credits, oldest first
  creditsMinor: number;
}

const walletPk = (userId: string) => `WALLET#${userId}`;

export async function getWallet(userId: string): Promise<Wallet> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': walletPk(userId) },
    })
  );
  let cashMinor = 0, pendingMinor = 0;
  const credits: WalletCredit[] = [];
  const nowIso = now();
  for (const i of (res.Items ?? []) as Record<string, unknown>[]) {
    if (i.sk === 'CASH') cashMinor = (i.cashMinor as number) ?? 0;
    else if ((i.sk as string).startsWith('PENDING#')) pendingMinor += (i.pendingMinor as number) ?? 0;
    else if ((i.sk as string).startsWith('CREDIT#')) {
      const c = i as unknown as WalletCredit;
      if (c.remainingMinor > 0 && c.expiresAt > nowIso) credits.push(c);
    }
  }
  credits.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  return {
    cashMinor,
    pendingMinor,
    credits,
    creditsMinor: credits.reduce((s, c) => s + c.remainingMinor, 0),
  };
}

export async function postWalletCredit(input: {
  userId: string; amountMinor: number; source: WalletCredit['source']; orderId?: string;
}): Promise<WalletCredit> {
  const credit: WalletCredit = {
    id: randomUUID(),
    userId: input.userId,
    amountMinor: input.amountMinor,
    remainingMinor: input.amountMinor,
    source: input.source,
    orderId: input.orderId,
    earnedAt: now(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // W4: 12 months
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: walletPk(input.userId), sk: `CREDIT#${credit.earnedAt}#${credit.id}`, ...credit },
    })
  );
  return credit;
}

// W3: credits first, oldest-expiring first. Returns amount actually taken
// and the debited credit ids (for F6 reversals).
export async function spendWalletCredits(
  userId: string, amountMinor: number
): Promise<{ spentMinor: number; debits: { creditId: string; minor: number }[] }> {
  const wallet = await getWallet(userId);
  let need = Math.max(0, amountMinor);
  const debits: { creditId: string; minor: number }[] = [];
  const ops: { sql: string; params: unknown[] }[] = [];
  const transact: Record<string, unknown>[] = [];
  for (const c of wallet.credits) {
    if (need <= 0) break;
    const take = Math.min(need, c.remainingMinor);
    need -= take;
    debits.push({ creditId: c.id, minor: take });
    transact.push({
      Update: {
        TableName: T(),
        Key: { pk: walletPk(userId), sk: `CREDIT#${c.earnedAt}#${c.id}` },
        UpdateExpression: 'SET remainingMinor = :r',
        ConditionExpression: 'remainingMinor = :orig',
        ExpressionAttributeValues: { ':r': c.remainingMinor - take, ':orig': c.remainingMinor },
      },
    });
  }
  if (transact.length) {
    await docClient.send(new TransactWriteCommand({ TransactItems: transact as never }));
  }
  return { spentMinor: amountMinor - need, debits };
}

export async function refundWalletCreditDebit(
  userId: string, debits: { creditId: string; minor: number; earnedAt?: string }[]
): Promise<void> {
  for (const d of debits) {
    // find the credit row to restore remainingMinor
    const res = await docClient.send(
      new QueryCommand({
        TableName: T(),
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
        ExpressionAttributeValues: { ':pk': walletPk(userId), ':p': 'CREDIT#' },
      })
    );
    const row = ((res.Items ?? []) as Record<string, unknown>[]).find((i) => i.id === d.creditId);
    if (!row) continue;
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: walletPk(userId), sk: row.sk as string },
        UpdateExpression: 'ADD remainingMinor :m',
        ExpressionAttributeValues: { ':m': d.minor },
      })
    );
  }
}

// Cash balance helpers (W5: withdrawals take Cash only).
export async function addWalletCash(userId: string, amountMinor: number): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: walletPk(userId), sk: 'CASH' },
      UpdateExpression: 'ADD cashMinor :m',
      ExpressionAttributeValues: { ':m': amountMinor },
    })
  );
}

export async function takeWalletCash(userId: string, amountMinor: number): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: walletPk(userId), sk: 'CASH' },
        UpdateExpression: 'ADD cashMinor :m',
        ConditionExpression: 'cashMinor >= :need',
        ExpressionAttributeValues: { ':m': -amountMinor, ':need': amountMinor },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// W2: resale proceeds land in Pending until the event ends. Each order's
// proceeds get their own row (PENDING#<orderId>) so they can be released
// per-event; gsi1 lets the sweeper find pending rows by event.
export async function addWalletPending(input: {
  userId: string; orderId: string; eventId: string; amountMinor: number;
}): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: walletPk(input.userId),
        sk: `PENDING#${input.orderId}`,
        orderId: input.orderId,
        eventId: input.eventId,
        pendingMinor: input.amountMinor,
        createdAt: now(),
        gsi1pk: 'PENDING#EVENTS',
        gsi1sk: `EVENT#${input.eventId}#${now()}`,
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  );
}

export async function releaseWalletPending(userId: string, orderId: string): Promise<void> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: walletPk(userId), sk: `PENDING#${orderId}` } })
  );
  const row = res.Item as { pendingMinor?: number } | undefined;
  if (!row?.pendingMinor) return;
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        { Delete: { TableName: T(), Key: { pk: walletPk(userId), sk: `PENDING#${orderId}` } } },
        {
          Update: {
            TableName: T(),
            Key: { pk: walletPk(userId), sk: 'CASH' },
            UpdateExpression: 'ADD cashMinor :m',
            ExpressionAttributeValues: { ':m': row.pendingMinor },
          },
        },
      ],
    })
  );
}

// Sweeper step: release pending rows whose event has ended (W2 → Cash).
export async function releasePendingForEndedEvents(
  getEventEndsAt: (eventId: string) => Promise<string | undefined>
): Promise<number> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk',
      ExpressionAttributeValues: { ':pk': 'PENDING#EVENTS' },
    })
  );
  const byEvent = new Map<string, { userId: string; orderId: string }[]>();
  for (const i of (res.Items ?? []) as Record<string, unknown>[]) {
    const list = byEvent.get(i.eventId as string) ?? [];
    list.push({ userId: (i.pk as string).slice(7), orderId: i.orderId as string });
    byEvent.set(i.eventId as string, list);
  }
  let released = 0;
  for (const [eventId, rows] of byEvent) {
    const endsAt = await getEventEndsAt(eventId);
    if (!endsAt || Date.parse(endsAt) > Date.now()) continue;
    for (const r of rows) {
      await releaseWalletPending(r.userId, r.orderId).catch(() => undefined);
      released++;
    }
  }
  return released;
}

// Release every pending row for an ended event (W2 → Cash).
export async function releasePendingForEvent(eventId: string): Promise<number> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk AND begins_with(gsi1sk, :p)',
      ExpressionAttributeValues: { ':pk': 'PENDING#EVENTS', ':p': `EVENT#${eventId}#` },
    })
  );
  let released = 0;
  for (const i of (res.Items ?? []) as Record<string, unknown>[]) {
    const userId = (i.pk as string).slice(7); // WALLET#<userId>
    await releaseWalletPending(userId, i.orderId as string).catch(() => undefined);
    released++;
  }
  return released;
}

// W5: withdrawals — one free standard per calendar week (Mon 00:00 local);
// instant costs 1%, min AED 3 (300 fils).
export function withdrawalFeeMinor(amountMinor: number, instant: boolean): number {
  return instant ? Math.max(Math.round(amountMinor * 0.01), 300) : 0;
}

// ===========================================================================
// D. All-in pricing + fee credits (F1-F7)
// ===========================================================================

// F1: shown price = round(face × 1.07); the fee is inside the shown price.
export function allInPrice(faceCents: number): number {
  return Math.round(faceCents * 1.07);
}

// F2: fee inside an all-in due = due − due / 1.07.
export function feeInsidePrice(dueCents: number): number {
  return dueCents - Math.round(dueCents / 1.07);
}

// F3/F4: credit back = max(0, fee − processing − 2% × base). Processing cost
// comes from the payment provider's settlement data where available; until
// then we estimate card cost at env.processingRatePct + fixed fils.
// TODO(decision): wire actual Stripe balance-transaction fees on settlement.
export function feeCreditMinor(input: {
  dueMinor: number;          // all-in total paid
  processingMinor: number;   // actual or estimated processing cost
}): number {
  const fee = feeInsidePrice(input.dueMinor);
  const base = input.dueMinor - fee;
  return Math.max(0, fee - input.processingMinor - Math.round(base * 0.02));
}

export function estimateProcessingMinor(cardPaidMinor: number): number {
  // Stripe-like estimate: percent + fixed, from env (defaults 2.9% + 100 fils).
  const pct = Number(process.env.PROCESSING_RATE_PCT ?? '2.9') / 100;
  const fixed = parseInt(process.env.PROCESSING_FIXED_FILS ?? '100', 10);
  return Math.round(cardPaidMinor * pct) + fixed;
}

// ===========================================================================
// E. Live QR (Q1-Q5): rotating window signatures
// ===========================================================================

// Code on screen = HMAC(seed, ticketId | 15s window). The gate knows the
// verification key (seed hash) + ticket id and checks window ±1 offline.
export const QR_WINDOW_SECONDS = 15;

export function qrWindow(nowMs = Date.now()): number {
  return Math.floor(nowMs / (QR_WINDOW_SECONDS * 1000));
}

export function qrSignature(ticketCode: string, seed: string, window: number): string {
  return createHmac('sha256', seed).update(`${ticketCode}|${window}`).digest('hex').slice(0, 32);
}

// Gate-side check: accepts windows w-1, w, w+1 (clock drift, Q3).
export function qrSignatureValid(
  ticketCode: string, seed: string, sig: string, nowMs = Date.now()
): boolean {
  const w = qrWindow(nowMs);
  for (const off of [-1, 0, 1]) {
    if (qrSignature(ticketCode, seed, w + off) === sig) return true;
  }
  return false;
}

// ===========================================================================
// F. Group pay (G1-G5): order shares
// ===========================================================================

export interface OrderShare {
  orderId: string;
  shareId: string;        // ticket code the share pays for
  payerUserId?: string;   // invited payer (assigned when they open the link)
  contact?: string;       // invited contact
  amountMinor: number;
  status: 'pending' | 'paid' | 'released' | 'covered';
  paidAt?: string;
  expiresAt: string;      // G2: 30-minute hold
  createdAt: string;
}

const shareSk = (shareId: string) => `SHARE#${shareId}`;

export async function createOrderShares(input: {
  orderId: string;
  shares: { shareId: string; amountMinor: number; contact?: string }[];
  ttlMinutes?: number;
}): Promise<OrderShare[]> {
  const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? 30) * 60 * 1000).toISOString();
  const shares: OrderShare[] = input.shares.map((s) => ({
    orderId: input.orderId,
    shareId: s.shareId,
    contact: s.contact,
    amountMinor: s.amountMinor,
    status: 'pending',
    expiresAt,
    createdAt: now(),
  }));
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: shares.map((s) => ({
        Put: {
          TableName: T(),
          Item: { pk: `ORDER#${input.orderId}`, sk: shareSk(s.shareId), ...s },
          ConditionExpression: 'attribute_not_exists(pk)',
        },
      })),
    })
  );
  return shares;
}

export async function listOrderShares(orderId: string): Promise<OrderShare[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': `ORDER#${orderId}`, ':p': 'SHARE#' },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((i) => {
    const { pk, sk, ...rest } = i;
    return rest as unknown as OrderShare;
  });
}

export async function markSharePaid(orderId: string, shareId: string, payerUserId: string): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: `ORDER#${orderId}`, sk: shareSk(shareId) },
        UpdateExpression: 'SET #status = :paid, payerUserId = :u, paidAt = :t',
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':paid': 'paid', ':pending': 'pending', ':u': payerUserId, ':t': now() },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// ===========================================================================
// G. Waiting room (B4-B7)
// ===========================================================================

export interface WaitingRoomEntry {
  eventId: string;
  userId: string;
  deviceId?: string;
  joinedAt: string;
  position?: number;      // assigned when sales open (random), else queue order
  status: 'waiting' | 'queued' | 'admitted' | 'done' | 'removed';
}

const roomPk = (eventId: string) => `WAITING#${eventId}`;

export async function joinWaitingRoom(eventId: string, userId: string, deviceId?: string): Promise<WaitingRoomEntry> {
  const entry: WaitingRoomEntry = {
    eventId, userId, deviceId, joinedAt: now(), status: 'waiting',
  };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: roomPk(eventId), sk: `USER#${userId}`, ...entry },
      ConditionExpression: 'attribute_not_exists(pk)',
    })
  );
  return entry;
}

export async function getWaitingEntry(eventId: string, userId: string): Promise<WaitingRoomEntry | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: roomPk(eventId), sk: `USER#${userId}` } })
  );
  return (res.Item as WaitingRoomEntry | undefined) ?? null;
}

export async function listWaitingRoom(eventId: string): Promise<WaitingRoomEntry[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': roomPk(eventId), ':p': 'USER#' },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((i) => {
    const { pk, sk, ...rest } = i;
    return rest as unknown as WaitingRoomEntry;
  });
}

// B4: everyone in the room when sales open gets a random place; joiners after
// go to the back. Fisher-Yates over the member list, persisted via batch.
export async function assignWaitingPositions(eventId: string): Promise<number> {
  const entries = await listWaitingRoom(eventId);
  const waiting = entries.filter((e) => e.status === 'waiting');
  for (let i = waiting.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [waiting[i], waiting[j]] = [waiting[j], waiting[i]];
  }
  const transact = waiting.map((e, idx) => ({
    Update: {
      TableName: T(),
      Key: { pk: roomPk(eventId), sk: `USER#${e.userId}` },
      UpdateExpression: 'SET #status = :q, #pos = :p',
      ExpressionAttributeNames: { '#status': 'status', '#pos': 'position' },
      ExpressionAttributeValues: { ':q': 'queued', ':p': idx + 1 },
    },
  }));
  for (let i = 0; i < transact.length; i += 100) {
    await docClient.send(new TransactWriteCommand({ TransactItems: transact.slice(i, i + 100) as never }));
  }
  return waiting.length;
}

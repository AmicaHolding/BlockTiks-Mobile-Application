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
  // Item sort key as stored — fee credits use CREDIT#FEE#<orderId>, so
  // spend/refund paths must key off this rather than re-derive it.
  sk?: string;
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
  await recordWalletActivity({ userId: input.userId, kind: 'credit', label: 'Fee credit earned', amountMinor: input.amountMinor });
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
        Key: { pk: walletPk(userId), sk: c.sk ?? `CREDIT#${c.earnedAt}#${c.id}` },
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

// Wallet activity feed (web fWallet): append-only ACT# rows per movement.
export async function recordWalletActivity(input: {
  userId: string; kind: 'credit' | 'pending' | 'cash_in' | 'withdraw' | 'spend';
  label: string; amountMinor: number;
}): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: walletPk(input.userId),
        sk: `ACT#${now()}#${randomUUID()}`,
        kind: input.kind,
        label: input.label,
        amountMinor: input.amountMinor,
      },
    })
  ).catch(() => undefined); // activity is best-effort; never block money movement
}

export interface WalletActivityRow {
  kind: 'credit' | 'pending' | 'cash_in' | 'withdraw' | 'spend';
  label: string;
  amountMinor: number;
  at: string;
}

export async function listWalletActivity(userId: string, limit = 50): Promise<WalletActivityRow[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': walletPk(userId), ':p': 'ACT#' },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((i) => ({
    kind: i.kind as WalletActivityRow['kind'],
    label: (i.label as string) ?? '',
    amountMinor: (i.amountMinor as number) ?? 0,
    at: (i.sk as string).split('#')[1] ?? '',
  }));
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
  await recordWalletActivity({ userId: input.userId, kind: 'pending', label: 'Resale proceeds pending', amountMinor: input.amountMinor });
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
  await recordWalletActivity({ userId, kind: 'cash_in', label: 'Resale proceeds settled', amountMinor: row.pendingMinor });
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
// comes from the charge's balance_transaction.fee where settled (sweeper +
// orders fetch it with `expand: latest_charge.balance_transaction`); this
// estimate is the fallback when the charge hasn't settled or Stripe isn't
// configured locally.
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
  // Order line this share's seat comes from (assigned at creation so a
  // mixed-tier order releases the right tier's inventory).
  itemSk?: string;
  tierId?: string;
}

const shareSk = (shareId: string) => `SHARE#${shareId}`;

export async function createOrderShares(input: {
  orderId: string;
  shares: { shareId: string; amountMinor: number; contact?: string }[];
  ttlMinutes?: number;
}): Promise<OrderShare[]> {
  const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? 30) * 60 * 1000).toISOString();
  // Assign each share to the order line with the most unshared seats left
  // so release returns the right tier's inventory (mixed-tier orders).
  const items = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': `ORDER#${input.orderId}`, ':p': 'ITEM#' },
    })
  );
  const lines = ((items.Items ?? []) as Record<string, unknown>[])
    .filter((i) => typeof i.tierId === 'string' && (i.quantity as number) > 0);
  const existing = await listOrderShares(input.orderId);
  const capacity = new Map<string, number>();
  for (const l of lines) capacity.set(l.sk as string, l.quantity as number);
  for (const s of existing) {
    if (s.itemSk && s.status === 'pending') capacity.set(s.itemSk, (capacity.get(s.itemSk) ?? 0) - 1);
  }
  const shares: OrderShare[] = input.shares.map((s) => {
    const line = lines
      .filter((l) => (capacity.get(l.sk as string) ?? 0) > 0)
      .sort((a, b) => (capacity.get(b.sk as string) ?? 0) - (capacity.get(a.sk as string) ?? 0))[0];
    const itemSk = line?.sk as string | undefined;
    if (itemSk) capacity.set(itemSk, (capacity.get(itemSk) ?? 0) - 1);
    return {
      orderId: input.orderId,
      shareId: s.shareId,
      contact: s.contact,
      amountMinor: s.amountMinor,
      status: 'pending' as const,
      expiresAt,
      createdAt: now(),
      itemSk,
      tierId: line?.tierId as string | undefined,
    };
  });
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: shares.map((s) => ({
        Put: {
          TableName: T(),
          // gsi1 lets the sweeper find pending shares past their hold.
          Item: { pk: `ORDER#${input.orderId}`, sk: shareSk(s.shareId), ...s, gsi1pk: 'SHARES#PENDING', gsi1sk: s.expiresAt },
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
        // G2: can't pay a share after its 30-min hold expired.
        UpdateExpression: 'SET #status = :paid, payerUserId = :u, paidAt = :t REMOVE gsi1pk, gsi1sk',
        ConditionExpression: '#status = :pending AND expiresAt > :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':paid': 'paid', ':pending': 'pending', ':u': payerUserId, ':t': now(), ':now': now() },
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
  status: 'waiting' | 'queued' | 'admitted' | 'left' | 'expired' | 'not_selected' | 'done' | 'removed';
  leftAt?: string;        // B5: place kept 5 min after leaving
  admittedAt?: string;
  holdUntil?: string;     // B6: 10-min buy window; B8: 30-min draw window
  flagged?: boolean;      // B7: flagged entries are silently excluded
  // B2: device-attestation token (App Attest / Play Integrity). Stored
  // opaquely — verification needs the providers' server keys
  // TODO(provider-gap): assert the token before trusting `attested`.
  attestation?: string;
  attested?: boolean;
}

// WAITING#<eventId> / CONFIG — the room exists (joinable, and shown in
// clients) only once the organiser enables it; 'open' means fans may join.
export interface WaitingRoomConfig {
  mode: 'queue' | 'draw';
  open: boolean;
  updatedAt?: string;
  // Idempotency record for the org /next call (retries must not re-admit).
  lastNextKey?: string;
  lastNextResult?: { admitted: number; holdUntil?: string };
}

const roomPk = (eventId: string) => `WAITING#${eventId}`;

export async function joinWaitingRoom(eventId: string, userId: string, deviceId?: string, attestation?: string): Promise<WaitingRoomEntry> {
  // B4: the room takes joins only while open; B5: one place per device —
  // the same check rejoinWaitingRoom runs, applied to fresh joins too.
  const config = await getWaitingRoomConfig(eventId);
  if (!config?.open) throw new InviteError('The waiting room isn’t open for this event', 'not_open');
  if (deviceId) {
    const entries = await listWaitingRoom(eventId);
    const clash = entries.find(
      (e) => e.deviceId === deviceId && e.userId !== userId && (e.status === 'waiting' || e.status === 'queued')
    );
    if (clash) throw new InviteError('This device already has a place in line', 'device_in_use');
  }
  // B7: an account flagged by the organiser still "joins" — the entry is
  // born removed so the fan sees a normal join but never gets a place.
  const prof = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: `USER#${userId}`, sk: 'PROFILE' } })
  ).catch(() => ({ Item: undefined }));
  const flagged = Boolean((prof.Item as { riskFlaggedAt?: string } | undefined)?.riskFlaggedAt);
  const entry: WaitingRoomEntry = {
    eventId, userId, deviceId, joinedAt: now(), status: flagged ? 'removed' : 'waiting',
    ...(flagged ? { flagged: true } : {}),
    ...(attestation ? { attestation, attested: true } : {}),
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
  if (!res.Item) return null;
  const { pk, sk, ...rest } = res.Item as Record<string, unknown>;
  return rest as unknown as WaitingRoomEntry;
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
  const waiting = entries.filter((e) => e.status === 'waiting' && !e.flagged);
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

// ===========================================================================
// H. V3 settlement + money gaps (handoff/05)
// ===========================================================================

// F3/F4/F5: the per-order fee breakdown. processingMinor is the actual
// provider cost for the card-paid part (Stripe balance_transaction.fee);
// wallet cash adds ~0.3%, credits cost 0. `sahraKeepsMinor` = what Sahra
// nets inside the 7%.
export function orderFeeBreakdown(input: {
  dueMinor: number;
  cardPaidMinor?: number;      // defaults to dueMinor (no wallet split yet)
  walletCashMinor?: number;
  actualCardFeeMinor?: number; // provider settlement; falls back to estimate
}): { feeMinor: number; baseMinor: number; processingMinor: number; sahraKeepsMinor: number; creditMinor: number } {
  const fee = feeInsidePrice(input.dueMinor);
  const base = input.dueMinor - fee;
  const cardPaid = input.cardPaidMinor ?? input.dueMinor - (input.walletCashMinor ?? 0);
  const processing =
    (input.actualCardFeeMinor ?? estimateProcessingMinor(cardPaid)) +
    Math.round((input.walletCashMinor ?? 0) * 0.003); // F3: cash ~0.3%, credits 0
  const credit = Math.max(0, fee - processing - Math.round(base * 0.02));
  return {
    feeMinor: fee,
    baseMinor: base,
    processingMinor: processing,
    sahraKeepsMinor: fee - processing - credit,
    creditMinor: credit,
  };
}

// Idempotent fee-credit post: deterministic sk means the webhook and the
// sweeper fallback can both call this safely.
export async function postOrderFeeCredit(input: {
  userId: string; orderId: string; amountMinor: number;
}): Promise<boolean> {
  if (input.amountMinor <= 0) return false;
  const earnedAt = now();
  try {
    await docClient.send(
      new PutCommand({
        TableName: T(),
        Item: {
          pk: walletPk(input.userId),
          sk: `CREDIT#FEE#${input.orderId}`,
          id: `fee-${input.orderId}`,
          userId: input.userId,
          amountMinor: input.amountMinor,
          remainingMinor: input.amountMinor,
          source: 'fee_credit',
          orderId: input.orderId,
          earnedAt,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // W4
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      })
    );
    await recordWalletActivity({
      userId: input.userId,
      kind: 'credit',
      label: 'Fee credit earned',
      amountMinor: input.amountMinor,
    });
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false; // already posted
    throw e;
  }
}

// F6: refund reverses the credit this order earned. Zeros the credit's
// remaining balance and reports how much had already been spent (taken from
// the refund amount by the caller).
export async function reverseOrderFeeCredit(
  userId: string,
  orderId: string
): Promise<{ reversedMinor: number; spentMinor: number } | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: walletPk(userId), sk: `CREDIT#FEE#${orderId}` } })
  );
  const row = res.Item as { remainingMinor?: number; amountMinor?: number } | undefined;
  if (!row) return null;
  const reversed = row.remainingMinor ?? 0;
  const spent = (row.amountMinor ?? 0) - reversed;
  if (reversed > 0) {
    await recordWalletActivity({
      userId,
      kind: 'credit',
      label: 'Fee credit reversed on refund',
      amountMinor: -reversed,
    });
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: walletPk(userId), sk: `CREDIT#FEE#${orderId}` },
        UpdateExpression: 'SET remainingMinor = :z',
        ExpressionAttributeValues: { ':z': 0 },
      })
    );
  }
  return { reversedMinor: reversed, spentMinor: spent };
}

// W5: one free standard withdrawal per calendar week (Mon 00:00 UTC used as
// the local reset — venue tz for payouts isn't modelled yet).
function weekKey(at = new Date()): string {
  const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // back to Monday
  return `${d.getUTCFullYear()}-W${String(Math.ceil(d.getUTCDate() / 7))}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function withdrawalsThisWeek(userId: string): Promise<number> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: walletPk(userId), sk: `WD#${weekKey()}` } })
  );
  return (res.Item?.count as number) ?? 0;
}

export async function recordWithdrawal(userId: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: walletPk(userId), sk: `WD#${weekKey()}` },
      UpdateExpression: 'ADD #count :one',
      ExpressionAttributeNames: { '#count': 'count' },
      ExpressionAttributeValues: { ':one': 1 },
    })
  );
}

// G3: pending shares past their 30-minute hold get released (sweeper calls
// this). Shares carry gsi1 'SHARES#PENDING' / <expiresAt> so the sweep
// doesn't scan every order.
export async function listExpiredShares(nowIso: string): Promise<OrderShare[]> {
  const res = await docClient.send(
    new QueryCommand({
      TableName: T(),
      IndexName: 'gsi1',
      KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk < :now',
      ExpressionAttributeValues: { ':pk': 'SHARES#PENDING', ':now': nowIso },
    })
  );
  return ((res.Items ?? []) as Record<string, unknown>[]).map((i) => {
    const { pk, sk, gsi1pk, gsi1sk, gsi2pk, gsi2sk, ...rest } = i;
    return rest as unknown as OrderShare;
  });
}

async function setShareStatus(orderId: string, shareId: string, to: OrderShare['status'], from: OrderShare['status'] = 'pending'): Promise<boolean> {
  const dropIndex = to !== 'pending' ? ' REMOVE gsi1pk, gsi1sk' : '';
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: `ORDER#${orderId}`, sk: shareSk(shareId) },
        UpdateExpression: `SET #status = :to${dropIndex}`,
        ConditionExpression: '#status = :from',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':to': to, ':from': from },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

export const releaseShare = (orderId: string, shareId: string) => setShareStatus(orderId, shareId, 'released');
export const coverShare = (orderId: string, shareId: string) => setShareStatus(orderId, shareId, 'covered');

// G3: a released (or expired) share frees one held seat back to inventory and
// nobody is charged for it — the share flips status, the order line loses one
// unit, the tier gets its seat back, and the order records the release count.
// Per-share PaymentIntents stay TODO(api-gap); the order's pending Stripe
// amount is unchanged, matching the existing stub-charge convention.
export async function releaseShareSeat(
  orderId: string,
  shareId: string
): Promise<boolean> {
  const shares = await listOrderShares(orderId);
  const share = shares.find((s) => s.shareId === shareId);
  if (!share || share.status !== 'pending') return false;
  const meta = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: `ORDER#${orderId}`, sk: 'METADATA' } })
  );
  const order = meta.Item as { eventId?: string; status?: string } | undefined;
  // Inventory only moves while the order's holds are live. Once the order
  // resolved (paid/fulfilled → tickets issued; failed/expired/cancelled →
  // releaseOrder already returned every hold) flipping the share is a pure
  // money decision — touching inventory here would double-return or oversell.
  const holdsLive = order?.status === 'PENDING';
  const items = await docClient.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :p)',
      ExpressionAttributeValues: { ':pk': `ORDER#${orderId}`, ':p': 'ITEM#' },
    })
  );
  const allLines = ((items.Items ?? []) as Record<string, unknown>[])
    .filter((i) => typeof i.tierId === 'string' && (i.quantity as number) > 0);
  // The share's own line wins; shares predating tier assignment fall back to
  // the largest line.
  const line = allLines.find((l) => share.itemSk && l.sk === share.itemSk) ??
    allLines.sort((a, b) => (b.quantity as number) - (a.quantity as number))[0];
  const dropIndex = ' REMOVE gsi1pk, gsi1sk';
  const transact: Record<string, unknown>[] = [
    {
      Update: {
        TableName: T(),
        Key: { pk: `ORDER#${orderId}`, sk: shareSk(shareId) },
        UpdateExpression: `SET #status = :to${dropIndex}`,
        ConditionExpression: '#status = :from',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':to': 'released', ':from': 'pending' },
      },
    },
  ];
  if (holdsLive && order?.eventId && line) {
    transact.push(
      {
        Update: {
          TableName: T(),
          Key: { pk: `ORDER#${orderId}`, sk: line.sk as string },
          UpdateExpression: 'SET quantity = quantity - :one',
          ConditionExpression: 'quantity >= :one',
          ExpressionAttributeValues: { ':one': 1 },
        },
      },
      {
        Update: {
          TableName: T(),
          Key: { pk: `EVENT#${order.eventId}`, sk: `TIER#${line.tierId}` },
          UpdateExpression: 'ADD available :one',
          ExpressionAttributeValues: { ':one': 1 },
        },
      },
      {
        Update: {
          TableName: T(),
          Key: { pk: `ORDER#${orderId}`, sk: 'METADATA' },
          UpdateExpression: 'ADD releasedSeats :one SET releasedShareMinor = if_not_exists(releasedShareMinor, :z) + :amt',
          ExpressionAttributeValues: { ':one': 1, ':z': 0, ':amt': share.amountMinor },
        },
      }
    );
  } else {
    // Order already resolved — record the release without touching seats.
    transact.push({
      Update: {
        TableName: T(),
        Key: { pk: `ORDER#${orderId}`, sk: 'METADATA' },
        UpdateExpression: 'SET releasedShareMinor = if_not_exists(releasedShareMinor, :z) + :amt',
        ExpressionAttributeValues: { ':z': 0, ':amt': share.amountMinor },
      },
    });
  }
  try {
    await docClient.send(new TransactWriteCommand({ TransactItems: transact as never }));
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// ---- waiting-room completion (B5-B8) ----

// Room config lives on WAITING#<eventId> / CONFIG; 'queue' (B4-B6) is the
// default mode, 'draw' the B8 registration-draw fallback. `open` gates joins
// (B4) — set true when the organiser enables the room or switches to a draw.
export async function getWaitingRoomConfig(eventId: string): Promise<WaitingRoomConfig | null> {
  const res = await docClient.send(
    new GetCommand({ TableName: T(), Key: { pk: roomPk(eventId), sk: 'CONFIG' } })
  );
  return (res.Item as WaitingRoomConfig | undefined) ?? null;
}

export async function setWaitingRoomConfig(eventId: string, fields: Partial<WaitingRoomConfig>): Promise<void> {
  const existing = await getWaitingRoomConfig(eventId);
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: roomPk(eventId),
        sk: 'CONFIG',
        mode: 'queue',
        open: true,
        ...(existing ?? {}),
        ...fields,
        updatedAt: now(),
      },
    })
  );
}

export async function setWaitingRoomMode(eventId: string, mode: 'queue' | 'draw'): Promise<void> {
  await setWaitingRoomConfig(eventId, { mode, open: true });
}

export async function getWaitingRoomMode(eventId: string): Promise<'queue' | 'draw'> {
  return (await getWaitingRoomConfig(eventId))?.mode ?? 'queue';
}

// B5: leaving keeps the place for 5 minutes.
export const WAITING_REJOIN_SECONDS = 300;
// B6: your turn holds tickets 10 minutes; B8: draw winners get 30.
export const WAITING_HOLD_MINUTES = 10;
export const WAITING_DRAW_MINUTES = 30;

export async function leaveWaitingRoom(eventId: string, userId: string): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: roomPk(eventId), sk: `USER#${userId}` },
        UpdateExpression: 'SET #status = :l, leftAt = :t',
        ConditionExpression: '#status = :w OR #status = :q',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':l': 'left', ':w': 'waiting', ':q': 'queued', ':t': now() },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// Rejoin: a 'left' entry inside 5 min gets its place back; an 'expired' or
// stale-'left' entry joins at the back (highest position + 1).
export async function rejoinWaitingRoom(eventId: string, userId: string, deviceId?: string): Promise<WaitingRoomEntry> {
  const existing = await getWaitingEntry(eventId, userId);
  const entries = await listWaitingRoom(eventId);
  const maxPos = entries.reduce((m, e) => Math.max(m, e.position ?? 0), 0);
  const at = now();
  // B2-lite: one account+device per place — a second account on the same
  // device doesn't get a second spot.
  if (deviceId) {
    const clash = entries.find((e) => e.deviceId === deviceId && e.userId !== userId && (e.status === 'waiting' || e.status === 'queued'));
    if (clash) throw new InviteError('This device already has a place in line', 'device_in_use');
  }
  if (existing?.status === 'left' && existing.leftAt && Date.now() - Date.parse(existing.leftAt) < WAITING_REJOIN_SECONDS * 1000) {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: roomPk(eventId), sk: `USER#${userId}` },
        UpdateExpression: 'SET #status = :q REMOVE leftAt',
        ConditionExpression: '#status = :l',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':q': 'queued', ':l': 'left' },
      })
    );
    return (await getWaitingEntry(eventId, userId))!;
  }
  const back: WaitingRoomEntry = { eventId, userId, deviceId, joinedAt: at, status: 'queued', position: maxPos + 1 };
  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: roomPk(eventId), sk: `USER#${userId}`, ...back },
      ConditionExpression: 'attribute_not_exists(pk) OR #status IN (:l, :e, :n)',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':l': 'left', ':e': 'expired', ':n': 'not_selected' },
    })
  );
  return back;
}

// Admits the front `count` queued entries (B6): position order, lowest first.
export async function admitWaitingRoom(eventId: string, count: number): Promise<WaitingRoomEntry[]> {
  const entries = (await listWaitingRoom(eventId)).filter((e) => e.status === 'queued');
  entries.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const picked = entries.slice(0, count);
  const holdUntil = new Date(Date.now() + WAITING_HOLD_MINUTES * 60 * 1000).toISOString();
  for (const e of picked) {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: roomPk(eventId), sk: `USER#${e.userId}` },
        UpdateExpression: 'SET #status = :a, admittedAt = :t, holdUntil = :h',
        ConditionExpression: '#status = :q',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':a': 'admitted', ':q': 'queued', ':t': now(), ':h': holdUntil },
      })
    ).catch((err) => { if (!isConditionalCheck(err)) throw err; });
  }
  return picked.map((e) => ({ ...e, status: 'admitted' as const, holdUntil }));
}

// B6: an expired hold sends you to the back (position = max+1).
export async function expireWaitingHold(eventId: string, userId: string): Promise<boolean> {
  const entry = await getWaitingEntry(eventId, userId);
  if (!entry || entry.status !== 'admitted') return false;
  const ext = entry as WaitingRoomEntry & { holdUntil?: string };
  if (!ext.holdUntil || Date.parse(ext.holdUntil) > Date.now()) return false;
  const entries = await listWaitingRoom(eventId);
  const maxPos = entries.reduce((m, e) => Math.max(m, e.position ?? 0), 0);
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: roomPk(eventId), sk: `USER#${userId}` },
      UpdateExpression: 'SET #status = :q, #pos = :p, joinedAt = :t REMOVE holdUntil, admittedAt',
      ConditionExpression: '#status = :a',
      ExpressionAttributeNames: { '#status': 'status', '#pos': 'position' },
      ExpressionAttributeValues: { ':q': 'queued', ':p': maxPos + 1, ':a': 'admitted', ':t': now() },
    })
  );
  return true;
}

// B7: flagged accounts are removed from the line.
export async function removeWaitingEntry(eventId: string, userId: string): Promise<boolean> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: roomPk(eventId), sk: `USER#${userId}` },
        UpdateExpression: 'SET #status = :r',
        ConditionExpression: '#status <> :r',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':r': 'removed' },
      })
    );
    return true;
  } catch (e) {
    if (isConditionalCheck(e)) return false;
    throw e;
  }
}

// B8: registration draw — pick `winners` at random from everyone entered;
// each gets 30 minutes to buy. Others are marked not_selected.
export async function runWaitingRoomDraw(eventId: string, winners: number): Promise<WaitingRoomEntry[]> {
  const entries = await listWaitingRoom(eventId);
  const pool = entries.filter(
    (e) => (e.status === 'waiting' || e.status === 'queued' || e.status === 'left') && !e.flagged
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, Math.max(1, winners));
  const rest = pool.slice(picked.length);
  const holdUntil = new Date(Date.now() + WAITING_DRAW_MINUTES * 60 * 1000).toISOString();
  const at = now();
  for (const e of picked) {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: roomPk(eventId), sk: `USER#${e.userId}` },
        UpdateExpression: 'SET #status = :a, admittedAt = :t, holdUntil = :h',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':a': 'admitted', ':t': at, ':h': holdUntil },
      })
    );
  }
  for (const e of rest) {
    await docClient.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: roomPk(eventId), sk: `USER#${e.userId}` },
        UpdateExpression: 'SET #status = :n',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':n': 'not_selected' },
      })
    ).catch(() => undefined);
  }
  await setWaitingRoomMode(eventId, 'draw');
  return picked.map((e) => ({ ...e, status: 'admitted' as const, holdUntil }));
}

// B7: flag an account during a release — the entry is removed and the flag
// follows the account (future joins anywhere are silently excluded).
export async function flagWaitingEntry(eventId: string, userId: string): Promise<boolean> {
  const at = now();
  const res = await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: roomPk(eventId), sk: `USER#${userId}` },
      UpdateExpression: 'SET #status = :r, flagged = :f',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':r': 'removed', ':f': true },
      ConditionExpression: 'attribute_exists(pk)',
      ReturnValues: 'ALL_NEW',
    })
  ).catch(() => ({ Attributes: undefined }));
  if (!res.Attributes) return false;
  await docClient.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: `USER#${userId}`, sk: 'PROFILE' },
      UpdateExpression: 'SET riskFlaggedAt = :t',
      ExpressionAttributeValues: { ':t': at },
    })
  ).catch(() => undefined);
  return true;
}

// V3 routes (handoff/05 + 06): OTP sign-in, personal invites, wallet,
// group pay, waiting room, live QR.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createHash, randomUUID } from 'crypto';
import {
  createUser,
  getUserByEmail,
  getUserById,
  getTicketByCode,
  ensureTicketCredential,
  issueRefreshToken,
  registerReferralCode,
  updateUser,
  listUserMemberships,
  type User,
} from '../db';
import {
  detectChannel,
  issueOtp,
  verifyOtp,
  getUserIdByPhone,
  linkPhoneToUser,
  createInvite,
  getInvite,
  updateInvite,
  listHostedInvites,
  listUserRsvps,
  listRsvps,
  getRsvp,
  putRsvp,
  decideRsvp,
  createInvitePost,
  listInvitePosts,
  deleteInvitePost,
  toggleInvitePostLike,
  voteDateOption,
  unvoteDateOption,
  listDateVotes,
  lockPollOption,
  addInvitePhoto,
  listInvitePhotos,
  deleteInvitePhoto,
  getWallet,
  postWalletCredit,
  takeWalletCash,
  withdrawalFeeMinor,
  qrWindow,
  qrSignature,
  QR_WINDOW_SECONDS,
  createOrderShares,
  listOrderShares,
  markSharePaid,
  coverShare,
  releaseShare,
  joinWaitingRoom,
  rejoinWaitingRoom,
  leaveWaitingRoom,
  getWaitingEntry,
  assignWaitingPositions,
  admitWaitingRoom,
  expireWaitingHold,
  removeWaitingEntry,
  runWaitingRoomDraw,
  getWaitingRoomMode,
  getWaitingRoomConfig,
  setWaitingRoomConfig,
  releaseShareSeat,
  withdrawalsThisWeek,
  recordWithdrawal,
  InviteError,
  rsvpDeadlineIso,
  type Invite,
} from '../db/v3';
import { getOrder, getEventMeta, canManageEvent } from '../db';
import { env } from '../env';
import { sendOtpEmail } from '../email';
import { publicUser } from './auth';

function signAccessToken(app: FastifyInstance, user: User): string {
  return app.jwt.sign({ sub: user.id, email: user.email ?? '', role: user.role }, { expiresIn: env.jwtExpiresIn });
}

async function optionalUserId(request: FastifyRequest): Promise<string | null> {
  try {
    await request.jwtVerify();
    return request.user.sub;
  } catch {
    return null;
  }
}

function inviteOut(invite: Invite, opts: { revealAddress: boolean; viewerGoing?: boolean }) {
  const hideAddr = invite.hideAddressUntilGoing && !opts.revealAddress && !opts.viewerGoing;
  return {
    ...invite,
    placeText: hideAddr ? undefined : invite.placeText,
    addressHidden: hideAddr,
    rsvpDeadlineIso: rsvpDeadlineIso(invite),
    // PE9: no calendar link until a date exists.
    hasDate: Boolean(invite.startsAt),
  };
}

export async function v3Routes(app: FastifyInstance) {
  // V3-only surfaces live here. OTP sign-in and personal invites are
  // implemented in routes/auth.ts + routes/invites.ts (v2 spec-base).

  // ============================ WALLET ============================
  app.get('/wallet', { preHandler: app.authenticate }, async (request) => {
    const wallet = await getWallet(request.user.sub);
    return { wallet };
  });

  // W5: withdrawals take Cash only. One free standard withdrawal per
  // calendar week; instant costs 1% (min 300 fils).
  app.post(
    '/wallet/withdraw',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['amountMinor'],
          properties: {
            amountMinor: { type: 'number', minimum: 300 },
            instant: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { amountMinor, instant } = request.body as { amountMinor: number; instant?: boolean };
      // W5: one free standard withdrawal per calendar week; further standard
      // withdrawals in the same week cost the instant rate.
      const usedFree = !instant && (await withdrawalsThisWeek(request.user.sub)) > 0;
      const fee = withdrawalFeeMinor(amountMinor, (instant ?? false) || usedFree);
      const taken = await takeWalletCash(request.user.sub, amountMinor);
      if (!taken) return reply.status(400).send({ code: 'insufficient', message: 'Not enough withdrawable cash' });
      // The payout record integrates with the existing withdrawals ledger.
      const { createWithdrawal } = await import('../db');
      const withdrawal = await createWithdrawal({
        userId: request.user.sub,
        amountCents: amountMinor - fee,
        currency: 'aed',
      }).catch(() => null);
      await recordWithdrawal(request.user.sub).catch(() => undefined);
      return { ok: true, withdrawal, feeMinor: fee, etaDays: instant ? 0 : 3, weeklyFreeUsed: usedFree };
    }
  );

  // ============================ LIVE QR (Q1-Q3) ============================
  // Rotating code for the ticket screen: sahra2.<code>.<window>.<sig>
  app.get('/tickets/:code/qr', { preHandler: app.authenticate }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const ticket = await getTicketByCode(code);
    if (!ticket || ticket.userId !== request.user.sub) {
      return reply.status(404).send({ code: 'not_found', message: 'Ticket not found' });
    }
    // Q1: the QR unlocks 24h before doors.
    const doorsAt = ticket.eventStartsAt;
    const unlocksAt = doorsAt ? new Date(new Date(doorsAt).getTime() - 24 * 60 * 60 * 1000) : null;
    if (unlocksAt && unlocksAt.getTime() > Date.now()) {
      return reply.status(403).send({ code: 'locked', message: 'QR unlocks 24h before doors', unlocksAt });
    }
    const cred = await ensureTicketCredential(code);
    const w = qrWindow();
    return {
      payload: `sahra2.${code}.${w}.${qrSignature(code, cred.secret, w)}`,
      window: w,
      refreshInSeconds: QR_WINDOW_SECONDS - (Math.floor(Date.now() / 1000) % QR_WINDOW_SECONDS),
      version: cred.version,
    };
  });

  // ============================ GROUP PAY (G1-G3) ============================
  app.post('/orders/:id/shares', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await getOrder(id);
    if (!order || order.userId !== request.user.sub) {
      return reply.status(404).send({ code: 'not_found', message: 'Order not found' });
    }
    const { shares } = request.body as { shares: { shareId: string; amountMinor: number; contact?: string }[] };
    if (!Array.isArray(shares) || shares.length < 1) {
      return reply.status(400).send({ code: 'bad_shares', message: 'Need at least one share' });
    }
    const created = await createOrderShares({ orderId: id, shares });
    return reply.status(201).send({ shares: created });
  });

  app.get('/orders/:id/shares', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const order = await getOrder(id);
    if (!order || order.userId !== request.user.sub) {
      return reply.status(404).send({ code: 'not_found', message: 'Order not found' });
    }
    return { shares: await listOrderShares(id) };
  });

  // Payer redeems a share (stub charge — TODO(api-gap): per-share PaymentIntent).
  app.post('/orders/:id/shares/:shareId/pay', { preHandler: app.authenticate }, async (request, reply) => {
    const { id, shareId } = request.params as { id: string; shareId: string };
    const ok = await markSharePaid(id, shareId, request.user.sub);
    if (!ok) return reply.status(409).send({ code: 'not_pending', message: 'Share already paid, released or expired' });
    // G4: each payer earns fee credit on their own payment — posted at order
    // settlement alongside the buyer's credit.
    return { ok: true };
  });

  // G3: the buyer covers a friend's unpaid share (charges the buyer — stub
  // charge, TODO(api-gap)) or releases the seat instead.
  app.post('/orders/:id/shares/:shareId/cover', { preHandler: app.authenticate }, async (request, reply) => {
    const { id, shareId } = request.params as { id: string; shareId: string };
    const order = await getOrder(id);
    if (!order || order.userId !== request.user.sub) {
      return reply.status(404).send({ code: 'not_found', message: 'Order not found' });
    }
    const ok = await coverShare(id, shareId);
    if (!ok) return reply.status(409).send({ code: 'not_pending', message: 'Share is no longer pending' });
    return { ok: true };
  });

  app.post('/orders/:id/shares/:shareId/release', { preHandler: app.authenticate }, async (request, reply) => {
    const { id, shareId } = request.params as { id: string; shareId: string };
    const order = await getOrder(id);
    if (!order || order.userId !== request.user.sub) {
      return reply.status(404).send({ code: 'not_found', message: 'Order not found' });
    }
    // G3: nobody is charged for released seats — the seat goes back to
    // inventory and the order drops a unit.
    const ok = await releaseShareSeat(id, shareId);
    if (!ok) return reply.status(409).send({ code: 'not_pending', message: 'Share is no longer pending' });
    return { ok: true };
  });

  // ============================ WAITING ROOM (B4-B8) ============================
  app.post('/events/:id/waiting-room', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { deviceId } = (request.body ?? {}) as { deviceId?: string };
    try {
      // B6: a stale admitted/expired/left entry rejoins at the back — but
      // only while the room is open (B4).
      const existing = await getWaitingEntry(id, request.user.sub);
      if (existing && (existing.status === 'expired' || existing.status === 'left' || existing.status === 'not_selected')) {
        const config = await getWaitingRoomConfig(id);
        if (!config?.open) {
          return reply.status(409).send({ code: 'not_open', message: 'The waiting room isn’t open for this event' });
        }
        const entry = await rejoinWaitingRoom(id, request.user.sub, deviceId);
        return reply.status(201).send({ entry, rejoined: true });
      }
      if (existing) return { entry: existing, alreadyJoined: true };
      const entry = await joinWaitingRoom(id, request.user.sub, deviceId);
      return reply.status(201).send({ entry });
    } catch (e) {
      if (e instanceof InviteError) {
        return reply.status(409).send({ code: e.code, message: e.message });
      }
      const entry = await getWaitingEntry(id, request.user.sub);
      return { entry, alreadyJoined: true };
    }
  });

  // Public: room open-ness is browsable state (B4); the fan's own entry only
  // appears when signed in.
  app.get('/events/:id/waiting-room', async (request) => {
    const { id } = request.params as { id: string };
    const userId = await optionalUserId(request);
    let entry = null;
    if (userId) {
      // B6: lazily expire an admitted hold so clients see the true state.
      await expireWaitingHold(id, userId).catch(() => false);
      entry = await getWaitingEntry(id, userId);
    }
    const config = await getWaitingRoomConfig(id);
    // Clients render the card only when the room is open or the fan already
    // has an entry — a never-enabled room stays invisible.
    return { entry, mode: config?.mode ?? 'queue', open: Boolean(config?.open) || entry != null };
  });

  // B5: leaving keeps your place for 5 minutes (rejoin via POST above).
  app.post('/events/:id/waiting-room/leave', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ok = await leaveWaitingRoom(id, request.user.sub);
    return ok ? { ok: true } : reply.status(409).send({ code: 'not_in_line', message: 'No place in line to leave' });
  });

  // Org-side helpers: every mutating waiting-room endpoint requires the
  // caller to manage the event (B7 decisions sit with the organiser).
  const requireEventManager = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const event = await getEventMeta(id);
    if (!event) {
      reply.status(404).send({ code: 'not_found', message: 'Event not found' });
      return null;
    }
    if (!(await canManageEvent(event, request.user.sub, request.user.role))) {
      reply.status(403).send({ code: 'forbidden', message: 'Only the organiser can run the waiting room' });
      return null;
    }
    return event;
  };

  // Org-side: enable the room — fans can join from here (B4: opens ~30 min
  // before sales). Idempotent.
  app.post('/events/:id/waiting-room/enable', { preHandler: app.authenticate }, async (request, reply) => {
    if (!(await requireEventManager(request, reply))) return;
    const { id } = request.params as { id: string };
    await setWaitingRoomConfig(id, { open: true, mode: 'queue' });
    return { ok: true, open: true };
  });

  // Org-side: open sales → everyone waiting gets a random place (B4).
  app.post('/events/:id/waiting-room/open', { preHandler: app.authenticate }, async (request, reply) => {
    if (!(await requireEventManager(request, reply))) return;
    const { id } = request.params as { id: string };
    const count = await assignWaitingPositions(id);
    return { ok: true, assigned: count };
  });

  // Org-side: admit the next N in line — each gets a 10-min hold (B6).
  // Idempotent on Idempotency-Key: a retried call replays its stored result
  // instead of admitting another batch.
  app.post('/events/:id/waiting-room/next', { preHandler: app.authenticate }, async (request, reply) => {
    if (!(await requireEventManager(request, reply))) return;
    const { id } = request.params as { id: string };
    const { count } = (request.body ?? {}) as { count?: number };
    const idemKey = request.headers['idempotency-key'] as string | undefined;
    const config = await getWaitingRoomConfig(id);
    if (idemKey && config?.lastNextKey === idemKey && config.lastNextResult) {
      return { ok: true, ...config.lastNextResult, replayed: true };
    }
    const admitted = await admitWaitingRoom(id, count ?? 1);
    const result = { admitted: admitted.length, holdUntil: admitted[0]?.holdUntil };
    if (idemKey) await setWaitingRoomConfig(id, { lastNextKey: idemKey, lastNextResult: result });
    return { ok: true, ...result };
  });

  // Org-side: B7 — remove a flagged account from the line.
  app.delete('/events/:id/waiting-room/:userId', { preHandler: app.authenticate }, async (request, reply) => {
    if (!(await requireEventManager(request, reply))) return;
    const { id, userId } = request.params as { id: string; userId: string };
    const ok = await removeWaitingEntry(id, userId);
    return ok ? { ok: true } : reply.status(409).send({ code: 'not_found', message: 'Entry not found' });
  });

  // Org-side: B8 — switch the release to a registration draw: random winners
  // from everyone entered get 30 minutes to buy.
  app.post('/events/:id/waiting-room/draw', { preHandler: app.authenticate }, async (request, reply) => {
    if (!(await requireEventManager(request, reply))) return;
    const { id } = request.params as { id: string };
    const { winners } = (request.body ?? {}) as { winners?: number };
    const picked = await runWaitingRoomDraw(id, winners ?? 100);
    return { ok: true, mode: 'draw', winners: picked.length, holdUntil: picked[0]?.holdUntil };
  });
}

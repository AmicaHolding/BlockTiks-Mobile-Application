// V3 routes (handoff/05 + 06): OTP sign-in, personal invites, wallet,
// group pay, waiting room, live QR.
import type { FastifyInstance, FastifyRequest } from 'fastify';
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
  joinWaitingRoom,
  getWaitingEntry,
  assignWaitingPositions,
  InviteError,
  rsvpDeadlineIso,
  type Invite,
} from '../db/v3';
import { getOrder } from '../db';
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
      const fee = withdrawalFeeMinor(amountMinor, instant ?? false);
      const taken = await takeWalletCash(request.user.sub, amountMinor);
      if (!taken) return reply.status(400).send({ code: 'insufficient', message: 'Not enough withdrawable cash' });
      // The payout record integrates with the existing withdrawals ledger.
      const { createWithdrawal } = await import('../db');
      const withdrawal = await createWithdrawal({
        userId: request.user.sub,
        amountCents: amountMinor - fee,
        currency: 'aed',
      }).catch(() => null);
      return { ok: true, withdrawal, feeMinor: fee, etaDays: instant ? 0 : 3 };
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
    if (!ok) return reply.status(409).send({ code: 'not_pending', message: 'Share already paid or released' });
    // G4: each payer earns fee credit on their own payment — posted at order
    // settlement alongside the buyer's credit.
    return { ok: true };
  });

  // ============================ WAITING ROOM (B4-B6) ============================
  app.post('/events/:id/waiting-room', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { deviceId } = (request.body ?? {}) as { deviceId?: string };
    try {
      const entry = await joinWaitingRoom(id, request.user.sub, deviceId);
      return reply.status(201).send({ entry });
    } catch {
      const entry = await getWaitingEntry(id, request.user.sub);
      return { entry, alreadyJoined: true };
    }
  });

  app.get('/events/:id/waiting-room', { preHandler: app.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const entry = await getWaitingEntry(id, request.user.sub);
    return { entry };
  });

  // Org-side: open sales → everyone waiting gets a random place (B4).
  app.post('/events/:id/waiting-room/open', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO(decision-8): restrict to the event's org admins via canManageEvent.
    const count = await assignWaitingPositions(id);
    return { ok: true, assigned: count };
  });
}

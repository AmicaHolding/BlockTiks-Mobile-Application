import { timingSafeEqual } from 'crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppleTokenError, verifyAppleIdentityToken } from '../apple';
import {
  accountDeletionBlockers,
  consumeOtpChallenge,
  countRecentOtpSends,
  createOtpChallenge,
  createSession,
  createUser,
  deleteUser,
  EmailExistsError,
  getOtpChallenge,
  getRefreshToken,
  getSession,
  getUserByAppleSub,
  getUserByContact,
  getUserByEmail,
  getUserById,
  grantPromoToUser,
  issueRefreshToken,
  linkAppleSub,
  listUserMemberships,
  listUserOrders,
  listUserSessions,
  listUserTickets,
  oldestRecentOtpSend,
  otpCodeHash,
  recordOtpFailure,
  registerReferralCode,
  revokeRefreshToken,
  revokeSession,
  revokeUserSessions,
  updateUser,
  updateUserContact,
  type OtpChallenge,
  type User,
} from '../db';
import { sendEmail } from '../email';
import { env } from '../env';
import { specError } from '../errors';
import { sendSms } from '../notify';

export function publicUser(u: User) {
  const name = u.name ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  return {
    id: u.id,
    // v2 shape (01-data-model)
    name: name || null,
    email: u.email ?? null,
    phone: u.phone ?? null,
    email_verified_at: u.emailVerifiedAt ?? null,
    phone_verified_at: u.phoneVerifiedAt ?? null,
    has_apple: Boolean(u.appleSub),
    intent: u.intent ?? [],
    city: u.city ?? null,
    interests: u.interests ?? [],
    locale: u.locale ?? 'en',
    numerals: u.numerals ?? 'latn',
    dob: u.dateOfBirth ?? null,
    last_mode: u.lastMode ?? null,
    // v1 fields kept for existing clients
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.avatarUrl,
    firstNameAr: u.firstNameAr,
    dateOfBirth: u.dateOfBirth,
    emailVerified: Boolean(u.emailVerifiedAt ?? u.emailVerified),
    notificationPrefs: u.notificationPrefs,
    referralCode: u.referralCode,
    referredByCode: u.referredByCode,
    referralCount: u.referralCount ?? 0,
    role: u.role.toLowerCase(),
  };
}

// ---------- contact + OTP helpers ----------

export type Contact = { kind: 'email' | 'phone'; value: string };

// A1: email (lowercased) or E.164 phone. Spaces, dashes and parentheses in a
// phone are ignored; a leading + and country code are required.
export function parseContact(raw: unknown): Contact | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.includes('@')) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(trimmed) && trimmed.length <= 254
      ? { kind: 'email', value: trimmed.toLowerCase() }
      : null;
  }
  const phone = trimmed.replace(/[\s\-().]/g, '');
  return /^\+[1-9]\d{6,14}$/.test(phone) ? { kind: 'phone', value: phone } : null;
}

// TODO(decision-17): SMS vs WhatsApp per country. Default: SMS everywhere,
// unless the number matches OTP_WHATSAPP_PREFIXES.
function channelFor(contact: Contact): OtpChallenge['channel'] {
  if (contact.kind === 'email') return 'email';
  return env.otpWhatsappPrefixes.some((p) => contact.value.startsWith(p)) ? 'whatsapp' : 'sms';
}

async function deliverCode(contact: Contact, channel: OtpChallenge['channel'], code: string) {
  const text = `Your Sahra code is ${code}. It expires in ${env.otpTtlMinutes} minutes.`;
  if (env.otpDevMode) console.log(`[otp:dev] ${contact.value} code=${code} (or OTP_DEV_CODE=${env.otpDevCode})`);
  if (channel === 'email') {
    await sendEmail({ to: contact.value, subject: `${code} is your Sahra code`, text });
  } else {
    await sendSms(contact.value, text, channel);
  }
}

// A1 send limit: max N sends per contact per rolling hour.
async function startChallenge(
  reply: FastifyReply,
  request: FastifyRequest,
  contact: Contact,
  purpose: OtpChallenge['purpose'],
  userId?: string,
  deviceId?: string
) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  if ((await countRecentOtpSends(contact.value, since)) >= env.otpMaxSendsPerHour) {
    const oldest = await oldestRecentOtpSend(contact.value, since);
    const retryAfter = oldest ? Math.max(1, Math.ceil((Date.parse(oldest) + 3600_000 - Date.now()) / 1000)) : 3600;
    specError(reply, 429, 'rate_limited', 'Too many codes sent. Try again later.', 'contact', {
      retry_after: retryAfter,
    });
    return null;
  }
  const channel = channelFor(contact);
  const { challenge, code } = await createOtpChallenge({
    contact,
    channel,
    purpose,
    userId,
    ip: request.ip,
    deviceId,
  });
  await deliverCode(contact, channel, code).catch((e) => request.log.warn(e, 'otp delivery failed'));
  return {
    challenge_id: challenge.id,
    channel,
    resend_after: env.otpResendAfterSeconds,
    expires_at: challenge.expiresAt,
    // Local dev only: the code is also accepted as OTP_DEV_CODE.
    ...(env.otpDevMode ? { dev_code: code } : {}),
  };
}

type CheckResult = { ok: true } | { ok: false; status: number; code: string; message: string; extra?: Record<string, unknown> };

function codeMatches(challenge: OtpChallenge, code: string): boolean {
  if (env.otpDevMode && code === env.otpDevCode) return true;
  const a = Buffer.from(otpCodeHash(challenge.id, code), 'hex');
  const b = Buffer.from(challenge.codeHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

async function checkChallenge(challenge: OtpChallenge | null, code: string): Promise<CheckResult> {
  if (!challenge) return { ok: false, status: 400, code: 'code_invalid', message: 'That code is not right' };
  if (challenge.attempts >= env.otpMaxAttempts) {
    return { ok: false, status: 429, code: 'too_many_attempts', message: 'Too many tries. Ask for a new code.' };
  }
  if (challenge.consumedAt || Date.parse(challenge.expiresAt) <= Date.now()) {
    return { ok: false, status: 400, code: 'code_expired', message: 'That code has expired. Ask for a new one.' };
  }
  if (!/^\d{6}$/.test(code) || !codeMatches(challenge, code)) {
    const attempts = await recordOtpFailure(challenge.id);
    if (attempts >= env.otpMaxAttempts) {
      return { ok: false, status: 429, code: 'too_many_attempts', message: 'Too many tries. Ask for a new code.' };
    }
    return {
      ok: false,
      status: 400,
      code: 'code_invalid',
      message: 'That code is not right',
      extra: { attempts_left: env.otpMaxAttempts - attempts },
    };
  }
  if (!(await consumeOtpChallenge(challenge.id))) {
    return { ok: false, status: 400, code: 'code_expired', message: 'That code was already used. Ask for a new one.' };
  }
  return { ok: true };
}

// ---------- session + landing ----------

function signAccessToken(app: FastifyInstance, user: User, sid: string): string {
  return app.jwt.sign(
    { sub: user.id, email: user.email ?? '', role: user.role, sid },
    { expiresIn: env.jwtExpiresIn }
  );
}

type Landing = { mode: 'personal' | 'org'; screen: 'home' | 'door_events' | 'door_scan'; org_id?: string; role?: string };

// A4: no tickets/orders AND >= 1 membership -> that org's door mode (gate
// -> Scan, else Events); otherwise personal Home. [R] After the first
// session, last_mode wins (stored on the first sign-in and by PUT /me/mode).
async function computeLanding(user: User, memberships: Awaited<ReturnType<typeof listUserMemberships>>): Promise<Landing> {
  const doorLanding = (m: (typeof memberships)[number]): Landing => ({
    mode: 'org',
    org_id: m.org.id,
    role: m.membership.role,
    screen: m.membership.role === 'gate' ? 'door_scan' : 'door_events',
  });
  if (user.lastMode) {
    if (user.lastMode !== 'personal') {
      const last = memberships.find(({ org }) => org.id === user.lastMode);
      if (last) return doorLanding(last);
    }
    return { mode: 'personal', screen: 'home' };
  }
  if (memberships.length > 0) {
    const [tickets, orders] = await Promise.all([
      listUserTickets(user.id, { limit: 1 }),
      listUserOrders(user.id, { limit: 1 }),
    ]);
    if (tickets.items.length === 0 && orders.items.length === 0) return doorLanding(memberships[0]);
  }
  return { mode: 'personal', screen: 'home' };
}

function deviceLabel(request: FastifyRequest, bodyDevice?: string): string | undefined {
  return bodyDevice || (request.headers['user-agent'] as string | undefined);
}

async function signedInResponse(
  app: FastifyInstance,
  request: FastifyRequest,
  user: User,
  isNew: boolean,
  method: 'otp' | 'apple',
  device?: string
) {
  const session = await createSession({ userId: user.id, device: deviceLabel(request, device), ip: request.ip, method });
  const token = signAccessToken(app, user, session.id);
  const refreshToken = await issueRefreshToken(user.id, session.id);
  const memberships = await listUserMemberships(user.id);
  const landing = await computeLanding(user, memberships);
  if (!user.lastMode) {
    await updateUser(user.id, { lastMode: landing.org_id ?? 'personal' }).catch(() => undefined);
  }
  return {
    token,
    refreshToken,
    refresh_token: refreshToken,
    session_id: session.id,
    user: publicUser(user),
    is_new: isNew,
    memberships: memberships.map(({ membership, org }) => ({
      org_id: org.id,
      org_name: org.name,
      role: membership.role,
      event_scope: membership.eventScope ?? [],
      verification_status: org.verificationStatus,
    })),
    landing,
  };
}

async function newAccount(input: Parameters<typeof createUser>[0]): Promise<User> {
  const user = await createUser(input);
  if (user.referralCode) await registerReferralCode(user.id, user.referralCode).catch(() => undefined);
  return user;
}

// ---------- PATCH /me ----------

const INTENTS = ['going_out', 'hosting_friends', 'running_events'] as const;

type PatchBody = {
  name?: string;
  firstName?: string;
  lastName?: string;
  firstNameAr?: string;
  avatarUrl?: string;
  city?: string;
  interests?: string[];
  intent?: string[];
  locale?: 'en' | 'ar';
  numerals?: 'latn' | 'arab';
  dob?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  challenge_id?: string;
  code?: string;
  notificationPrefs?: NonNullable<User['notificationPrefs']>;
  pushNotification?: boolean;
};

const patchSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', maxLength: 120 },
      firstName: { type: 'string', maxLength: 60 },
      lastName: { type: 'string', maxLength: 60 },
      firstNameAr: { type: 'string', maxLength: 60 },
      avatarUrl: { type: 'string' },
      city: { type: 'string', maxLength: 80 },
      interests: { type: 'array', items: { type: 'string' }, maxItems: 20 },
      intent: { type: 'array', items: { type: 'string', enum: [...INTENTS] }, maxItems: 3 },
      locale: { type: 'string', enum: ['en', 'ar'] },
      numerals: { type: 'string', enum: ['latn', 'arab'] },
      dob: { type: 'string' },
      dateOfBirth: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      challenge_id: { type: 'string' },
      code: { type: 'string' },
      notificationPrefs: {
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
      pushNotification: { type: 'boolean' },
    },
  },
};

export async function authRoutes(app: FastifyInstance) {
  // ---------- POST /auth/otp/start {contact} ----------
  app.post(
    '/auth/otp/start',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['contact'],
          properties: { contact: { type: 'string' }, device_id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { contact: string; device_id?: string };
      const contact = parseContact(body.contact);
      if (!contact) {
        return specError(reply, 400, 'contact_invalid', 'Enter an email or a phone number with country code', 'contact');
      }
      const result = await startChallenge(reply, request, contact, 'signin', undefined, body.device_id);
      return result ?? reply;
    }
  );

  // ---------- POST /auth/otp/verify {challenge_id, code} ----------
  // Same call signs in or creates the account (A1).
  app.post(
    '/auth/otp/verify',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['challenge_id', 'code'],
          properties: {
            challenge_id: { type: 'string' },
            code: { type: 'string' },
            device: { type: 'string' },
            referralCode: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { challenge_id: string; code: string; device?: string };
      const challenge = await getOtpChallenge(body.challenge_id);
      const check = await checkChallenge(challenge?.purpose === 'signin' ? challenge : null, body.code.trim());
      if (!check.ok) return specError(reply, check.status, check.code, check.message, 'code', check.extra);

      const contact: Contact = { kind: challenge!.contactKind, value: challenge!.contact };
      const verifiedAt = new Date().toISOString();
      let user = await getUserByContact(contact);
      let isNew = false;
      if (!user) {
        try {
          user = await newAccount({
            ...(contact.kind === 'email'
              ? { email: contact.value, emailVerifiedAt: verifiedAt }
              : { phone: contact.value, phoneVerifiedAt: verifiedAt }),
          });
          isNew = true;
        } catch (e) {
          if (!(e instanceof EmailExistsError)) throw e;
          user = await getUserByContact(contact); // lost a race with a parallel verify
        }
      } else if (contact.kind === 'email' ? !user.emailVerifiedAt : !user.phoneVerifiedAt) {
        user =
          (await updateUser(user.id, contact.kind === 'email'
            ? { emailVerifiedAt: verifiedAt, emailVerified: true }
            : { phoneVerifiedAt: verifiedAt })) ?? user;
      }
      if (!user || user.deletedAt) return specError(reply, 400, 'code_invalid', 'That code is not right', 'code');
      return signedInResponse(app, request, user, isNew, 'otp', body.device);
    }
  );

  // ---------- POST /auth/apple {identity_token} ----------
  app.post(
    '/auth/apple',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['identity_token'],
          properties: {
            identity_token: { type: 'string', minLength: 10 },
            // Apple only sends the name to the client, on first authorization.
            name: { type: 'string', maxLength: 120 },
            device: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { identity_token: string; name?: string; device?: string };
      let identity;
      try {
        identity = await verifyAppleIdentityToken(body.identity_token);
      } catch (e) {
        if (e instanceof AppleTokenError) {
          request.log.info({ reason: e.message }, 'apple token rejected');
          return specError(reply, 401, 'apple_invalid', 'Sign in with Apple failed. Try again.');
        }
        throw e;
      }
      let user = await getUserByAppleSub(identity.sub);
      let isNew = false;
      if (!user && identity.email && identity.emailVerified) {
        user = await getUserByEmail(identity.email);
        if (user && !user.appleSub) await linkAppleSub(user.id, identity.sub);
      }
      if (!user) {
        if (!identity.email) return specError(reply, 401, 'apple_invalid', 'Apple did not share an email address');
        user = await newAccount({
          email: identity.email,
          emailVerifiedAt: identity.emailVerified ? new Date().toISOString() : undefined,
          appleSub: identity.sub,
          name: body.name,
        });
        isNew = true;
      }
      if (user.deletedAt) return specError(reply, 401, 'apple_invalid', 'Sign in with Apple failed. Try again.');
      return signedInResponse(app, request, user, isNew, 'apple', body.device);
    }
  );

  // v1 password endpoints are gone (decision-17 decided: no passwords).
  const gone = async (_request: FastifyRequest, reply: FastifyReply) =>
    specError(reply, 410, 'password_auth_removed', 'Passwords are gone. Use POST /auth/otp/start.');
  for (const path of [
    '/auth/signup',
    '/auth/login',
    '/auth/signin',
    '/auth/change-password',
    '/auth/forgot-password',
    '/auth/verify-reset-code',
    '/auth/reset-password',
    '/auth/reset/start',
    '/auth/reset/verify',
  ]) {
    app.post(path, gone);
  }

  // POST /auth/refresh — rotate a session's refresh token.
  app.post(
    '/auth/refresh',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          properties: { refreshToken: { type: 'string', minLength: 10 }, refresh_token: { type: 'string', minLength: 10 } },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { refreshToken?: string; refresh_token?: string };
      const presented = body.refreshToken ?? body.refresh_token;
      const record = presented ? await getRefreshToken(presented) : null;
      if (!presented || !record) return reply.status(401).send({ message: 'Invalid or expired refresh token' });
      const user = await getUserById(record.userId);
      if (!user || user.deletedAt) return reply.status(401).send({ message: 'Invalid or expired refresh token' });
      let sid = record.sessionId;
      if (sid) {
        const session = await getSession(sid);
        if (!session || session.revokedAt) return reply.status(401).send({ message: 'Invalid or expired refresh token' });
      } else {
        // Pre-session token: upgrade into a session.
        sid = (await createSession({ userId: user.id, device: deviceLabel(request), ip: request.ip, method: 'legacy' })).id;
      }
      await revokeRefreshToken(presented);
      const token = signAccessToken(app, user, sid);
      const nextRefreshToken = await issueRefreshToken(user.id, sid);
      return { token, refreshToken: nextRefreshToken, refresh_token: nextRefreshToken, user: publicUser(user) };
    }
  );

  const getMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await getUserById(request.user.sub);
    if (!user || user.deletedAt) return reply.status(404).send({ message: 'User not found' });
    return { user: publicUser(user) };
  };
  app.get('/auth/me', { preHandler: app.authenticate }, getMe);
  app.get('/me', { preHandler: app.authenticate }, getMe);

  // ---------- PATCH /me (and legacy PATCH /auth/me) ----------
  const patchMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body ?? {}) as PatchBody;
    let user = await getUserById(request.user.sub);
    if (!user || user.deletedAt) return reply.status(404).send({ message: 'User not found' });

    // A2: name is the only required field.
    let name: string | undefined;
    if (body.name !== undefined) name = body.name.trim();
    else if (body.firstName !== undefined || body.lastName !== undefined) {
      name = `${body.firstName ?? user.firstName ?? ''} ${body.lastName ?? user.lastName ?? ''}`.trim();
    }
    if (name !== undefined && !name) return specError(reply, 400, 'name_required', 'Add your name', 'name');
    if (name === undefined && !(user.name || user.firstName)) {
      return specError(reply, 400, 'name_required', 'Add your name', 'name');
    }
    if (body.interests && body.interests.length === 0) {
      return specError(reply, 400, 'interests_required', 'Pick at least one interest', 'interests');
    }
    const nameParts = name !== undefined ? name.split(/\s+/) : undefined;

    user =
      (await updateUser(user.id, {
        name,
        firstName: nameParts ? nameParts[0] : undefined,
        lastName: nameParts ? nameParts.slice(1).join(' ') : undefined,
        firstNameAr: body.firstNameAr,
        avatarUrl: body.avatarUrl,
        city: body.city,
        interests: body.interests,
        intent: body.intent as User['intent'],
        locale: body.locale,
        numerals: body.numerals,
        dateOfBirth: body.dob ?? body.dateOfBirth,
        notificationPrefs:
          body.notificationPrefs ??
          (body.pushNotification !== undefined ? { ...user.notificationPrefs, push: body.pushNotification } : undefined),
      })) ?? user;

    // A3: onboarding complete (city + >= 1 interest) -> WELCOME10.
    if (user.city && (user.interests?.length ?? 0) >= 1) {
      await grantPromoToUser(user.id, 'WELCOME10').catch(() => undefined);
    }

    // A7: changing email/phone needs a code to the NEW contact, then signs
    // out every other session.
    const wanted = (['email', 'phone'] as const).find((k) => {
      const v = body[k];
      return v !== undefined && v.trim() !== '' && parseContact(v)?.value !== user![k];
    });
    if (wanted) {
      const contact = parseContact(body[wanted]);
      if (!contact || contact.kind !== wanted) {
        return specError(reply, 400, 'contact_invalid', wanted === 'email' ? 'Enter a valid email' : 'Enter a phone number with country code', wanted);
      }
      const owner = await getUserByContact(contact);
      if (owner && owner.id !== user.id) {
        return specError(reply, 409, 'contact_taken', 'Another account already uses this', wanted);
      }
      if (!body.challenge_id || !body.code) {
        const started = await startChallenge(reply, request, contact, 'change_contact', user.id);
        if (!started) return reply;
        return reply.status(202).send({ code: 'otp_required', message: 'Enter the code we sent', field: wanted, ...started, user: publicUser(user) });
      }
      const challenge = await getOtpChallenge(body.challenge_id);
      const bound =
        challenge?.purpose === 'change_contact' && challenge.userId === user.id && challenge.contact === contact.value
          ? challenge
          : null;
      const check = await checkChallenge(bound, body.code.trim());
      if (!check.ok) return specError(reply, check.status, check.code, check.message, 'code', check.extra);
      try {
        user = (await updateUserContact(user.id, contact)) ?? user;
      } catch (e) {
        if (e instanceof EmailExistsError) return specError(reply, 409, 'contact_taken', 'Another account already uses this', wanted);
        throw e;
      }
      const signedOut = await revokeUserSessions(user.id, request.user.sid);
      return { user: publicUser(user), signed_out_sessions: signedOut };
    }
    return { user: publicUser(user) };
  };
  app.patch('/me', { preHandler: app.authenticate, schema: patchSchema }, patchMe);
  app.patch('/auth/me', { preHandler: app.authenticate, schema: patchSchema }, patchMe);

  // ---------- sessions ("Sign-in methods") ----------
  app.get('/me/sessions', { preHandler: app.authenticate }, async (request) => {
    const [user, sessions] = await Promise.all([getUserById(request.user.sub), listUserSessions(request.user.sub)]);
    return {
      methods: {
        email: user?.email ?? null,
        phone: user?.phone ?? null,
        apple: Boolean(user?.appleSub),
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        device: s.device ?? null,
        method: s.method,
        created_at: s.createdAt,
        last_seen_at: s.lastSeenAt,
        current: s.id === request.user.sid,
      })),
    };
  });

  app.delete('/me/sessions/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!(await revokeSession(request.user.sub, id))) {
      return specError(reply, 404, 'not_found', 'Session not found');
    }
    return reply.status(204).send();
  });

  // ---------- DELETE /me — A6 ----------
  const blockMessages: Record<string, string> = {
    has_tickets: 'You still have tickets for upcoming events',
    has_listings: 'Cancel your active resale listings first',
    has_price_watches: 'Cancel your active price watches first',
    has_balance: 'Withdraw your remaining earnings balance first',
    sole_admin: 'Hand over admin of your organisation first',
  };
  const deleteMe = (legacy: boolean) => async (request: FastifyRequest, reply: FastifyReply) => {
    const blocks = await accountDeletionBlockers(request.user.sub);
    if (blocks.length > 0) {
      return specError(reply, 409, blocks[0], blockMessages[blocks[0]], undefined, { blocks });
    }
    const deleted = await deleteUser(request.user.sub);
    if (!deleted) return reply.status(404).send({ message: 'User not found' });
    return legacy ? { ok: true } : reply.status(204).send();
  };
  app.delete('/me', { preHandler: app.authenticate }, deleteMe(false));
  app.delete('/auth/me', { preHandler: app.authenticate }, deleteMe(true));

  // POST /auth/logout — end this session (or just the given refresh token).
  app.post(
    '/auth/logout',
    {
      preHandler: app.authenticate,
      schema: { body: { type: ['object', 'null'], properties: { refreshToken: { type: 'string' } } } },
    },
    async (request) => {
      const { refreshToken } = (request.body ?? {}) as { refreshToken?: string };
      if (request.user.sid) await revokeSession(request.user.sub, request.user.sid).catch(() => undefined);
      else if (refreshToken) await revokeRefreshToken(refreshToken).catch(() => undefined);
      return { ok: true };
    }
  );
}

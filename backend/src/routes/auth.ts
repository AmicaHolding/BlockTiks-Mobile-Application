import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
    accountDeletionBlockers,
    applyReferralCode,
    consumeEmailVerificationToken,
    consumePasswordReset,
    createEmailVerificationToken,
    createPasswordReset,
    createUser,
    deleteUser,
    EmailExistsError,
    getRefreshTokenUserId,
    getUserByEmail,
    getUserById,
    grantPromoToUser,
    issueRefreshToken,
    listUserMemberships,
    registerReferralCode,
    revokeAllRefreshTokens,
    revokeOtherRefreshTokens,
    revokeRefreshToken,
    updateUser,
    updateUserPassword,
    verifyPasswordReset,
    type User
} from '../db';
import { sendPasswordResetEmail, sendVerificationEmail } from '../email';
import { env } from '../env';
import { hashPassword, verifyPassword } from '../passwords';

export function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    firstNameAr: u.firstNameAr,
    city: u.city,
    interests: u.interests,
    dateOfBirth: u.dateOfBirth,
    emailVerified: u.emailVerified,
    notificationPrefs: u.notificationPrefs,
    referralCode: u.referralCode,
    referredByCode: u.referredByCode,
    referralCount: u.referralCount ?? 0,
    role: u.role.toLowerCase(),
  };
}

function signAccessToken(app: FastifyInstance, user: User): string {
  return app.jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    { expiresIn: env.jwtExpiresIn }
  );
}

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/signup',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['firstName', 'email', 'password'],
          properties: {
            firstName: { type: 'string', minLength: 1 },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['user', 'creator'] },
            // A2: spec intent — host continues to Create organisation.
            intent: { type: 'string', enum: ['fan', 'host'] },
            referralCode: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { firstName, lastName, email, phone, password, role, intent, referralCode } = request.body as {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        password: string;
        role?: string;
        intent?: 'fan' | 'host';
        referralCode?: string;
      };

      try {
        const isHost = intent === 'host' || role === 'creator';
        const user = await createUser({
          email,
          passwordHash: hashPassword(password),
          firstName,
          lastName: lastName ?? '',
          phone,
          role: isHost ? 'CREATOR' : 'FAN',
        });
        if (user.referralCode) await registerReferralCode(user.id, user.referralCode);
        if (referralCode?.trim()) {
          await applyReferralCode(user.id, referralCode.trim()).catch(() => false);
        }
        // Best-effort welcome/verification email; never blocks signup.
        const verificationToken = await createEmailVerificationToken(user.id, user.email).catch(() => null);
        if (verificationToken) {
          const link = `${env.publicWebUrl}/verify-email?token=${verificationToken}`;
          await sendVerificationEmail(user.email, link).catch((e) => app.log.warn(e, 'verification email failed'));
        }

        const token = signAccessToken(app, user);
        const refreshToken = await issueRefreshToken(user.id);

        return reply.status(201).send({
          token,
          refreshToken,
          user: publicUser({ ...user, referralCount: user.referralCount ?? 0 }),
          // A2 spec routing hint (additive — legacy clients ignore it).
          next: isHost ? 'create_org' : 'personalize',
        });
      } catch (e) {
        if (e instanceof EmailExistsError) {
          return reply.status(409).send({ message: 'Email already registered' });
        }
        throw e;
      }
    }
  );

  const loginHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as { email: string; password: string };
    const user = await getUserByEmail(email);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return reply.status(401).send({ code: 'bad_credentials', message: 'Invalid email or password' });
    }

    const token = signAccessToken(app, user);
    const refreshToken = await issueRefreshToken(user.id);

    // A4: memberships + landing hint drive the profile switcher after
    // sign-in. lastMode='personal' or an org id (stale org ids fall back
    // to personal when the membership is gone).
    const memberships = await listUserMemberships(user.id);
    let landing: { mode: string; org_id?: string; role?: string } = { mode: 'personal' };
    if (user.lastMode && user.lastMode !== 'personal') {
      const last = memberships.find(({ org }) => org.id === user.lastMode);
      if (last) {
        landing = { mode: 'org', org_id: last.org.id, role: last.membership.role };
      }
    }

    return {
      token,
      refreshToken,
      user: publicUser(user),
      memberships: memberships.map(({ membership, org }) => ({
        org_id: org.id,
        org_name: org.name,
        role: membership.role,
        event_scope: membership.eventScope ?? [],
        verification_status: org.verificationStatus,
      })),
      landing,
    };
  };

  const loginOpts = {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      body: {
        type: 'object' as const,
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' as const, format: 'email' },
          password: { type: 'string' as const },
        },
      },
    },
  };
  app.post('/auth/login', loginOpts, loginHandler);
  // Spec path (02-api); /auth/login remains for existing clients.
  app.post('/auth/signin', loginOpts, loginHandler);

  // POST /auth/refresh, exchange a refresh token for a new access token.
  // Refresh tokens rotate: the presented token is revoked and a new one issued.
  app.post(
    '/auth/refresh',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string', minLength: 10 } },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };
      const userId = await getRefreshTokenUserId(refreshToken);
      if (!userId) return reply.status(401).send({ message: 'Invalid or expired refresh token' });
      const user = await getUserById(userId);
      if (!user || user.deletedAt) return reply.status(401).send({ message: 'Invalid or expired refresh token' });
      await revokeRefreshToken(refreshToken);
      const token = signAccessToken(app, user);
      const nextRefreshToken = await issueRefreshToken(user.id);
      return { token, refreshToken: nextRefreshToken, user: publicUser(user) };
    }
  );

  app.get('/auth/me', { preHandler: app.authenticate }, async (request) => {
    const user = await getUserById(request.user.sub);
    if (!user) return { message: 'User not found' };
    return { user: publicUser(user) };
  });

  app.patch(
    '/auth/me',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            firstNameAr: { type: 'string' },
            phone: { type: 'string' },
            avatarUrl: { type: 'string' },
            city: { type: 'string' },
            interests: { type: 'array', items: { type: 'string' }, maxItems: 10 },
            dateOfBirth: { type: 'string' },
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
            // NOTE: emailVerified is intentionally NOT user-writable, it is
            // reserved for a future server-side verification flow.
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        firstName?: string;
        lastName?: string;
        firstNameAr?: string;
        phone?: string;
        avatarUrl?: string;
        city?: string;
        interests?: string[];
        dateOfBirth?: string;
        notificationPrefs?: {
          push?: boolean;
          email?: boolean;
          sms?: boolean;
          selling?: boolean;
          remind?: boolean;
          weekly?: boolean;
        };
        pushNotification?: boolean;
      };
      // A3: onboarding needs >= 3 interests. An empty/absent array stays
      // allowed (clearing the field isn't an onboarding submission).
      if (body.interests && body.interests.length > 0 && body.interests.length < 3) {
        return reply
          .status(400)
          .send({ code: 'interests_min_3', message: 'Pick at least 3 interests', field: 'interests' });
      }
      // pushNotification is the legacy mobile toggle; notificationPrefs is the
      // persisted shape used by the account settings screens.
      const user = await updateUser(request.user.sub, {
        firstName: body.firstName,
        lastName: body.lastName,
        firstNameAr: body.firstNameAr,
        phone: body.phone,
        avatarUrl: body.avatarUrl,
        city: body.city,
        interests: body.interests,
        dateOfBirth: body.dateOfBirth,
        notificationPrefs: body.notificationPrefs ??
          (body.pushNotification !== undefined ? { push: body.pushNotification } : undefined),
      });
      if (!user) return reply.status(404).send({ message: 'User not found' });
      // A3: onboarding complete (city + >=3 interests) → grant WELCOME10.
      if (user.city && (user.interests?.length ?? 0) >= 3) {
        await grantPromoToUser(user.id, 'WELCOME10').catch(() => undefined);
      }
      return { user: publicUser(user) };
    }
  );

  app.post(
    '/auth/change-password',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
            // A7: pass the current session's refresh token to stay signed in
            // while every other session is revoked.
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { currentPassword, newPassword, refreshToken } = request.body as {
        currentPassword: string;
        newPassword: string;
        refreshToken?: string;
      };
      const user = await getUserById(request.user.sub);
      if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
        return reply.status(401).send({ code: 'wrong_password', message: 'Current password is incorrect' });
      }
      // A1: the new password must contain a number (8+ chars via schema).
      if (!/\d/.test(newPassword)) {
        return reply
          .status(400)
          .send({ code: 'weak_password', message: 'New password must contain a number', field: 'newPassword' });
      }
      await updateUserPassword(user.id, hashPassword(newPassword));
      await revokeOtherRefreshTokens(user.id, refreshToken).catch(() => undefined);
      return { ok: true };
    }
  );

  app.post(
    '/auth/forgot-password',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string', format: 'email' } },
        },
      },
    },
    async (request) => {
      const { email } = request.body as { email: string };
      const user = await getUserByEmail(email);
      const reset = user && !user.deletedAt ? await createPasswordReset(email) : null;
      if (reset) {
        await sendPasswordResetEmail(email, reset.code).catch((e) => app.log.warn(e, 'reset email failed'));
      }
      return {
        ok: true,
        // Email delivery requires SES_FROM_EMAIL; expose the code only in local dev.
        ...(env.nodeEnv === 'development' && reset ? { devCode: reset.code, expiresAt: reset.expiresAt } : {}),
      };
    }
  );

  app.post(
    '/auth/verify-reset-code',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'code'],
          properties: { email: { type: 'string', format: 'email' }, code: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const { email, code } = request.body as { email: string; code: string };
      const ok = await verifyPasswordReset(email, code);
      if (!ok) return reply.status(400).send({ message: 'Invalid or expired code' });
      return { ok: true };
    }
  );

  app.post(
    '/auth/reset-password',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'code', 'newPassword'],
          properties: {
            email: { type: 'string', format: 'email' },
            code: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, code, newPassword } = request.body as {
        email: string;
        code: string;
        newPassword: string;
      };
      if (!(await consumePasswordReset(email, code))) {
        return reply.status(400).send({ message: 'Invalid or expired code' });
      }
      const user = await getUserByEmail(email);
      if (!user) return reply.status(404).send({ message: 'User not found' });
      await updateUserPassword(user.id, hashPassword(newPassword));
      await revokeAllRefreshTokens(user.id).catch(() => undefined);
      return { ok: true };
    }
  );

  // POST /auth/verify-email/request, (re)send a verification link.
  app.post('/auth/verify-email/request', { preHandler: app.authenticate }, async (request, reply) => {
    const user = await getUserById(request.user.sub);
    if (!user || user.deletedAt) return reply.status(404).send({ message: 'User not found' });
    if (user.emailVerified) return { ok: true, alreadyVerified: true };
    const token = await createEmailVerificationToken(user.id, user.email);
    const link = `${env.publicWebUrl}/verify-email?token=${token}`;
    await sendVerificationEmail(user.email, link).catch((e) => app.log.warn(e, 'verification email failed'));
    return { ok: true };
  });

  // POST /auth/verify-email/confirm, consume a verification token.
  app.post(
    '/auth/verify-email/confirm',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['token'],
          properties: { token: { type: 'string', minLength: 10 } },
        },
      },
    },
    async (request, reply) => {
      const { token } = request.body as { token: string };
      const payload = await consumeEmailVerificationToken(token);
      if (!payload) return reply.status(400).send({ message: 'Invalid or expired verification link' });
      const user = await updateUser(payload.userId, { emailVerified: true });
      if (!user) return reply.status(404).send({ message: 'User not found' });
      return { ok: true, user: publicUser(user) };
    }
  );

  // DELETE /auth/me — A6: deletion is blocked while the account still has
  // commitments. `code` is additive; legacy clients read `message`.
  app.delete('/auth/me', { preHandler: app.authenticate }, async (request, reply) => {
    const blocks = await accountDeletionBlockers(request.user.sub);
    if (blocks.length > 0) {
      const code = blocks[0];
      const messages: Record<string, string> = {
        has_tickets: 'You still have tickets for upcoming events',
        has_listings: 'Cancel your active resale listings first',
        has_price_watches: 'Cancel your active price watches first',
        has_balance: 'Withdraw your remaining earnings balance first',
        sole_admin: 'Hand over admin of your organisation first',
      };
      return reply.status(409).send({ code, message: messages[code], blocks });
    }
    const deleted = await deleteUser(request.user.sub);
    if (!deleted) return reply.status(404).send({ message: 'User not found' });
    return { ok: true };
  });

  // POST /auth/logout, revoke the presented refresh token (or all of them).
  app.post(
    '/auth/logout',
    {
      preHandler: app.authenticate,
      schema: {
        body: {
          type: 'object',
          properties: { refreshToken: { type: 'string' } },
        },
      },
    },
    async (request) => {
      const { refreshToken } = (request.body ?? {}) as { refreshToken?: string };
      if (refreshToken) await revokeRefreshToken(refreshToken).catch(() => undefined);
      else await revokeAllRefreshTokens(request.user.sub).catch(() => undefined);
      return { ok: true };
    }
  );
}

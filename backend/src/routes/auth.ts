import type { FastifyInstance } from 'fastify';
import {
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
    issueRefreshToken,
    registerReferralCode,
    revokeAllRefreshTokens,
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
            referralCode: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { firstName, lastName, email, phone, password, role, referralCode } = request.body as {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        password: string;
        role?: string;
        referralCode?: string;
      };

      try {
        const user = await createUser({
          email,
          passwordHash: hashPassword(password),
          firstName,
          lastName: lastName ?? '',
          phone,
          role: role === 'creator' ? 'CREATOR' : 'FAN',
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
        });
      } catch (e) {
        if (e instanceof EmailExistsError) {
          return reply.status(409).send({ message: 'Email already registered' });
        }
        throw e;
      }
    }
  );

  app.post(
    '/auth/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as { email: string; password: string };
      const user = await getUserByEmail(email);

      if (!user || !verifyPassword(password, user.passwordHash)) {
        return reply.status(401).send({ message: 'Invalid email or password' });
      }

      const token = signAccessToken(app, user);
      const refreshToken = await issueRefreshToken(user.id);

      return {
        token,
        refreshToken,
        user: publicUser(user),
      };
    }
  );

  // POST /auth/refresh — exchange a refresh token for a new access token.
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
              },
            },
            pushNotification: { type: 'boolean' },
            // NOTE: emailVerified is intentionally NOT user-writable — it is
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
        notificationPrefs?: { push?: boolean; email?: boolean; sms?: boolean };
        pushNotification?: boolean;
      };
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
          },
        },
      },
    },
    async (request, reply) => {
      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };
      const user = await getUserById(request.user.sub);
      if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
        return reply.status(401).send({ message: 'Current password is incorrect' });
      }
      await updateUserPassword(user.id, hashPassword(newPassword));
      await revokeAllRefreshTokens(user.id).catch(() => undefined);
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

  // POST /auth/verify-email/request — (re)send a verification link.
  app.post('/auth/verify-email/request', { preHandler: app.authenticate }, async (request, reply) => {
    const user = await getUserById(request.user.sub);
    if (!user || user.deletedAt) return reply.status(404).send({ message: 'User not found' });
    if (user.emailVerified) return { ok: true, alreadyVerified: true };
    const token = await createEmailVerificationToken(user.id, user.email);
    const link = `${env.publicWebUrl}/verify-email?token=${token}`;
    await sendVerificationEmail(user.email, link).catch((e) => app.log.warn(e, 'verification email failed'));
    return { ok: true };
  });

  // POST /auth/verify-email/confirm — consume a verification token.
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

  app.delete('/auth/me', { preHandler: app.authenticate }, async (request, reply) => {
    const deleted = await deleteUser(request.user.sub);
    if (!deleted) return reply.status(404).send({ message: 'User not found' });
    return { ok: true };
  });

  // POST /auth/logout — revoke the presented refresh token (or all of them).
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

import type { FastifyInstance } from 'fastify';
import {
    consumePasswordReset,
    createPasswordReset,
    createUser,
    deleteUser,
    EmailExistsError,
    getUserByEmail,
    getUserById,
    updateUser,
    updateUserPassword,
    verifyPasswordReset,
    type User
} from '../db';
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
    role: u.role.toLowerCase(),
  };
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
          },
        },
      },
    },
    async (request, reply) => {
      const { firstName, lastName, email, phone, password, role } = request.body as {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        password: string;
        role?: string;
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

        const token = app.jwt.sign(
          { sub: user.id, email: user.email, role: user.role },
          { expiresIn: env.jwtExpiresIn }
        );

        return reply.status(201).send({
          token,
          refreshToken: token, // MVP: single long-lived token; add real refresh flow later
          user: publicUser(user),
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

      const token = app.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: env.jwtExpiresIn }
      );

      return {
        token,
        refreshToken: token,
        user: publicUser(user),
      };
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
      return {
        ok: true,
        // Email delivery is not wired yet; expose the code only in local dev.
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
      return { ok: true };
    }
  );

  app.delete('/auth/me', { preHandler: app.authenticate }, async (request, reply) => {
    const deleted = await deleteUser(request.user.sub);
    if (!deleted) return reply.status(404).send({ message: 'User not found' });
    return { ok: true };
  });

  app.post('/auth/logout', { preHandler: app.authenticate }, async () => ({ ok: true }));
}

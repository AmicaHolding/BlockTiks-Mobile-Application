import type { FastifyInstance } from 'fastify';
import {
    createUser,
    EmailExistsError,
    getUserByEmail,
    getUserById,
    updateUser,
    updateUserPassword,
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
    role: u.role.toLowerCase(),
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/auth/signup',
    {
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
            phone: { type: 'string' },
            avatarUrl: { type: 'string' },
            pushNotification: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        firstName?: string;
        lastName?: string;
        phone?: string;
        avatarUrl?: string;
        pushNotification?: boolean;
      };
      // pushNotification isn't persisted server-side yet; accept and ignore it
      // so the app's notification toggle doesn't error.
      const user = await updateUser(request.user.sub, {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        avatarUrl: body.avatarUrl,
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

  app.post('/auth/logout', { preHandler: app.authenticate }, async () => ({ ok: true }));
}

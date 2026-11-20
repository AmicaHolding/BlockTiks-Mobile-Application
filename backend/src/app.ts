import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { env } from './env';
import { authPlugin } from './plugins/auth';
import { accountRoutes } from './routes/account';
import { authRoutes } from './routes/auth';
import { discoveryRoutes } from './routes/discovery';
import { doorRoutes } from './routes/door';
import { eventRoutes } from './routes/events';
import { healthRoutes } from './routes/health';
import { inviteRoutes } from './routes/invites';
import { holdRoutes } from './routes/holds';
import { listingRoutes } from './routes/listings';
import { meRoutes } from './routes/me';
import { moneyRoutes } from './routes/money';
import { offerRoutes } from './routes/offers';
import { orderRoutes } from './routes/orders';
import { orgRoutes } from './routes/orgs';
import { promoRoutes } from './routes/promos';
import { ticketRoutes } from './routes/tickets';
import { transferRoutes } from './routes/transfers';
import { v3Routes } from './routes/v3';

// Builds the Fastify app without listening, shared by the local dev server
// (src/index.ts) and the Lambda handler (src/lambda.ts).
// app.register() calls are intentionally not awaited: avvio loads plugins in
// registration order, and listen()/ready() resolves them all.
export function buildApp() {
  const app = Fastify({ logger: true });

  // Keep the raw body for Stripe webhook signature verification.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (request, body, done) => {
      (request as unknown as { rawBody: Buffer }).rawBody = body as Buffer;
      // Body-less POST/DELETE with a JSON content-type is common from clients.
      if ((body as Buffer).length === 0) return done(null, undefined);
      try {
        done(null, JSON.parse((body as Buffer).toString('utf8')));
      } catch {
        done(Object.assign(new Error('Malformed JSON body'), { statusCode: 400 }), undefined);
      }
    }
  );

  void app.register(helmet);
  void app.register(rateLimit, {
    global: true,
    // Generous global ceiling; sensitive auth routes tighten it below.
    max: 300,
    timeWindow: '1 minute',
  });
  void app.register(cors, {
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
  });
  void app.register(jwt, { secret: env.jwtSecret });
  void app.register(authPlugin);

  void app.register(healthRoutes);
  void app.register(authRoutes);
  void app.register(accountRoutes);
  void app.register(promoRoutes);
  void app.register(eventRoutes);
  void app.register(orderRoutes);
  void app.register(holdRoutes);
  void app.register(offerRoutes);
  void app.register(ticketRoutes);
  void app.register(doorRoutes);
  void app.register(listingRoutes);
  void app.register(meRoutes);
  void app.register(discoveryRoutes);
  void app.register(transferRoutes);
  void app.register(orgRoutes);
  void app.register(moneyRoutes);
  void app.register(inviteRoutes);
  void app.register(v3Routes);

  app.setErrorHandler((error: { statusCode?: number; message?: string }, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      // Never leak internals (stack traces, AWS/Stripe errors) to clients.
      app.log.error(error);
      return reply.status(statusCode).send({ message: 'Internal server error' });
    }
    reply.status(statusCode).send({ message: error.message ?? 'Request failed' });
  });

  return app;
}

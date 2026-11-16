import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { env } from './env';
import { authPlugin } from './plugins/auth';
import { accountRoutes } from './routes/account';
import { authRoutes } from './routes/auth';
import { doorRoutes } from './routes/door';
import { eventRoutes } from './routes/events';
import { healthRoutes } from './routes/health';
import { listingRoutes } from './routes/listings';
import { orderRoutes } from './routes/orders';
import { promoRoutes } from './routes/promos';
import { ticketRoutes } from './routes/tickets';

// Builds the Fastify app without listening — shared by the local dev server
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
      try {
        done(null, JSON.parse((body as Buffer).toString('utf8')));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

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
  void app.register(ticketRoutes);
  void app.register(doorRoutes);
  void app.register(listingRoutes);

  app.setErrorHandler((error: { statusCode?: number; message?: string }, _request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) app.log.error(error);
    reply.status(statusCode).send({ message: error.message ?? 'Internal server error' });
  });

  return app;
}

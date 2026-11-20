import { buildApp } from './app';
import { env } from './env';

const app = buildApp();

app.listen({ port: env.port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

// Local dev runs the expiry sweeper inline (Workers use the Cron Trigger):
// every minute, so seeded holds/orders/shares really expire in the demo.
if (env.nodeEnv !== 'production') {
  void import('./sweeper').then(({ handler }) => {
    const tick = () => handler().catch((e) => app.log.warn(e, 'sweeper tick failed'));
    setInterval(tick, 60_000).unref();
    setTimeout(tick, 5_000).unref();
  });
}

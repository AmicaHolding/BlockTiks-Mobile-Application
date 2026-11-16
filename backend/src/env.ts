function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// In production, secrets and origins must be explicit — never fall back to
// dev defaults. Local development keeps the fallbacks below.
const isProduction = process.env.NODE_ENV === 'production';

function secret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) {
    throw new Error(`Missing required env var: ${name} (no dev fallback in production)`);
  }
  return devFallback;
}

// Load .env if present (Node 20.6+), before anything reads process.env.
try {
  process.loadEnvFile();
} catch {
  // no .env file — rely on real env vars / fallbacks below
}

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: isProduction
    ? required('CORS_ORIGIN')
    : process.env.CORS_ORIGIN ?? '*',
  awsRegion: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
  tableName: required('TABLE_NAME', 'blocktiks'),
  dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT ?? '',
  jwtSecret: secret('JWT_SECRET', 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  // Production boot guard: payments must be fully configured before launch.
  ...(isProduction
    ? (() => {
        if (!process.env.STRIPE_SECRET_KEY) {
          throw new Error('Missing required env var: STRIPE_SECRET_KEY (production)');
        }
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
          throw new Error('Missing required env var: STRIPE_WEBHOOK_SECRET (production)');
        }
        return {};
      })()
    : {}),
  platformFeePercent: parseInt(process.env.PLATFORM_FEE_PERCENT ?? '12', 10),
  // Transactional email (SES). Empty = log-only dev mode.
  sesFromEmail: process.env.SES_FROM_EMAIL ?? '',
  sesRegion: process.env.SES_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
  // Public base URL of the buyer web app (verification links, payout onboarding returns).
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? 'http://localhost:5174',
  // Referral bonus paid to the referrer per successful referral (cents). 0 = tracking only.
  referralBonusCents: parseInt(process.env.REFERRAL_BONUS_CENTS ?? '0', 10),
  // How long a PENDING order holds ticket inventory before the sweeper
  // releases it (covers abandoned Stripe checkout sheets).
  reservationTtlMinutes: parseInt(process.env.RESERVATION_TTL_MINUTES ?? '15', 10),
};

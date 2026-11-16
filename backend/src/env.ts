function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
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
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  awsRegion: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
  tableName: required('TABLE_NAME', 'blocktiks'),
  dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT ?? '',
  jwtSecret: required('JWT_SECRET', 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  platformFeePercent: parseInt(process.env.PLATFORM_FEE_PERCENT ?? '12', 10),
  // How long a PENDING order holds ticket inventory before the sweeper
  // releases it (covers abandoned Stripe checkout sheets).
  reservationTtlMinutes: parseInt(process.env.RESERVATION_TTL_MINUTES ?? '15', 10),
};

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// In production, secrets and origins must be explicit, never fall back to
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
  // no .env file, rely on real env vars / fallbacks below
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
  // Storage engine: 'sqlite' (default; local better-sqlite3 file, same API as
  // Cloudflare D1) or 'dynamo' (legacy DynamoDB path, kept for the AWS/SAM
  // deployment). The Worker always uses the D1 binding regardless.
  dbEngine: (process.env.DB_ENGINE ?? 'sqlite') as 'sqlite' | 'dynamo',
  dbPath: process.env.DB_PATH ?? 'data/dev.db',
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
  // Buyer fee percent of subtotal (P1: spec says 5). Only used when
  // allInPricing is off.
  platformFeePercent: parseInt(process.env.PLATFORM_FEE_PERCENT ?? '5', 10),
  // v3 trust-and-money: prices are all-in, the 7% buyer fee is inside the
  // shown price and its unused part comes back as Credits (05, F1-F4).
  allInPricing: (process.env.ALL_IN_PRICING ?? '1') === '1',
  buyerFeePct: parseFloat(process.env.BUYER_FEE_PCT ?? '7'),
  // Resale economics (R2/R3/R4, decisions 7-8). resaleCapPct is a multiplier
  // on face value in percent (110 = face x 1.10). The organiser royalty is
  // taken out of the seller fee, so the seller nets 95% (TODO(decision-7)).
  resaleCapPct: parseInt(process.env.RESALE_CAP_PCT ?? '110', 10),
  sellerFeePercent: parseInt(process.env.SELLER_FEE_PERCENT ?? '5', 10),
  royaltyPercent: parseInt(process.env.ROYALTY_PERCENT ?? '5', 10),
  // Checkout holds (decision-16 default: 10-minute hold).
  holdTtlMinutes: parseInt(process.env.HOLD_TTL_MINUTES ?? '10', 10),
  // Unclaimed transfers return to the sender (decision-14 default: 48h,
  // or doors-open if sooner — doors-open is applied at creation time).
  transferTtlHours: parseInt(process.env.TRANSFER_TTL_HOURS ?? '48', 10),
  // Org payout reserve (decision-3 default: 10% held until event end + 14d).
  orgReservePct: parseInt(process.env.ORG_RESERVE_PCT ?? '10', 10),
  orgReserveDays: parseInt(process.env.ORG_RESERVE_DAYS ?? '14', 10),
  // SMS broadcast cost per recipient in fils (M2: AED 0.12).
  smsCostFils: parseInt(process.env.SMS_COST_FILS ?? '12', 10),
  // Door undo window (seconds) — TODO(decision): undo allowed briefly
  // after admission so mis-scans can be corrected at the door.
  doorUndoSeconds: parseInt(process.env.DOOR_UNDO_SECONDS ?? '300', 10),
  // T2: member invites lapse after 7 days (decision-12 default).
  inviteTtlDays: parseInt(process.env.INVITE_TTL_DAYS ?? '7', 10),
  // Dev convenience: auto-approve org verification on submit. Off in prod,
  // where the verification.decided path is operator-driven (O3).
  orgVerifyAutoApprove:
    (process.env.ORG_VERIFY_AUTO_APPROVE ?? (isProduction ? '0' : '1')) === '1',
  // PriceWatch auto-charge on match (W2). Requires saved-method billing;
  // locally the charge step is a marked stub (TODO(api-gap)).
  priceWatchAutoCharge: process.env.PRICE_WATCH_AUTO_CHARGE === '1',
  // VAT percent by event country (ISO 3166 alpha-2), P6 / decision-13.
  // Orders in unmapped countries record taxMinor = 0.
  taxRates: (() => {
    try {
      return JSON.parse(process.env.TAX_RATES ?? '{"AE":5,"SA":15}') as Record<string, number>;
    } catch {
      return {} as Record<string, number>;
    }
  })(),
  // Transactional email (Resend). Empty = log-only dev mode.
  emailFrom: process.env.EMAIL_FROM ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  // Public base URL of the buyer web app (verification links, payout onboarding returns).
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? 'http://localhost:5174',
  // Referral bonus paid to the referrer per successful referral (cents). 0 = tracking only.
  referralBonusCents: parseInt(process.env.REFERRAL_BONUS_CENTS ?? '0', 10),
  // ---------- v2: OTP sign-in (A1) ----------
  // Dev mode = non-production only: the code is logged and OTP_DEV_CODE
  // (default 000000) is accepted so seeded accounts can sign in. The local
  // Node entrypoint (index.ts) is inherently dev; production runs the Worker.
  otpDevMode: (process.env.NODE_ENV ?? 'development') !== 'production',
  otpDevCode: process.env.OTP_DEV_CODE ?? '000000',
  otpTtlMinutes: parseInt(process.env.OTP_TTL_MINUTES ?? '10', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),
  otpMaxSendsPerHour: parseInt(process.env.OTP_MAX_SENDS_PER_HOUR ?? '5', 10),
  otpResendAfterSeconds: parseInt(process.env.OTP_RESEND_AFTER_SECONDS ?? '30', 10),
  // TODO(decision-17): SMS vs WhatsApp per country is undecided. Phone
  // numbers starting with one of these prefixes get channel=whatsapp.
  otpWhatsappPrefixes: (process.env.OTP_WHATSAPP_PREFIXES ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  // Sign in with Apple: accepted `aud` values (bundle id / services id).
  appleClientIds: (process.env.APPLE_CLIENT_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  // ---------- v2: personal invites (decision-20 defaults) ----------
  // TODO(decision-20): abuse limits are a recommended default, not policy.
  invitesPerDay: parseInt(process.env.INVITES_PER_DAY ?? '5', 10),
  inviteUpdatesPerDay: parseInt(process.env.INVITE_UPDATES_PER_DAY ?? '3', 10),
  inviteReviewGuests: parseInt(process.env.INVITE_REVIEW_GUESTS ?? '150', 10),
  inviteMaxPlusOnes: 2,
  // How long a PENDING order holds ticket inventory before the sweeper
  // releases it (covers abandoned Stripe checkout sheets).
  reservationTtlMinutes: parseInt(process.env.RESERVATION_TTL_MINUTES ?? '15', 10),
};

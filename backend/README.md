# BlockTiks Backend (MVP)

Node 22 + TypeScript + Fastify + **DynamoDB (single-table)** + Stripe test mode.
Deploys as **AWS Lambda behind API Gateway HTTP API** via SAM.
No blockchain, regular database, Stripe PaymentIntents, JWT auth.

## Local dev

Fastest path · DynamoDB Local in Docker, no AWS account:

```bash
cd backend
npm install
npm run db:up        # DynamoDB Local on :8000 (docker compose)
npm run db:seed      # creates the table + demo data (skips if already seeded; if a seed run was interrupted, use `npm run db:reset`)
npm run dev:local    # http://localhost:4000 against DynamoDB Local
```

Or from the repo root: `./dev.sh --local --seed`.

No Docker? Use the DynamoDB Local jar (`java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -inMemory -port 8000`)
and the same `db:create` / `db:seed` / `dev:local` scripts.

**Signing in locally (no passwords):** `POST /auth/otp/start {"contact":"fan@test.com"}` returns a
`challenge_id`; verify it with `POST /auth/otp/verify {"challenge_id","code":"000000"}`. Against DynamoDB
Local (or `NODE_ENV=development`) the real code is logged and `OTP_DEV_CODE` (default `000000`) is also
accepted. SMS/WhatsApp delivery is a logging stub (`TODO(decision-17)`); email goes through SES when
`SES_FROM_EMAIL` is set.

| Script | What it does |
|--------|--------------|
| `db:up` / `db:down` | Start / stop DynamoDB Local (`db:down -- -v` also deletes its data) |
| `db:create` | Create the `blocktiks` table if missing |
| `db:seed` | Seed demo users, events, tickets, listing, offer, promo, referral |
| `db:reset` | Delete every item, then seed |
| `db:seed:remote` | Seed a real AWS table (`TABLE_NAME`, `AWS_REGION`, your AWS creds) |

The seed (`scripts/seed.ts`) writes through `src/db.ts`, so seeded rows have exactly the
shape the API writes. It refuses to touch a remote table unless `SEED_ALLOW_REMOTE=1`, and
a remote reset also needs `RESET_CONFIRM=<table name>`. Never seed prod.

Against a real AWS table instead (needs `aws configure`): `cp .env.example .env`, create the
table once with `npx tsx scripts/create-table.ts`, then `npm run dev`.

## Stripe test flow

```bash
npm run stripe:listen       # prints a whsec_... webhook secret → STRIPE_WEBHOOK_SECRET
```

Then `npm run dev` in another shell. Card `4242 4242 4242 4242` works in test mode.

## Deploy to AWS (SAM)

Each stage (`dev`, `staging`, `prod`) is its own CloudFormation stack with its own table
(see `samconfig.toml`). Secrets live in gitignored `.env.deploy.<stage>` files:

```bash
cp .env.deploy.example .env.deploy.staging   # fill JWT_SECRET, STRIPE_SECRET_KEY, ...
scripts/deploy.sh staging                    # sam build + deploy, prints ApiUrl + table
TABLE_NAME=<table> AWS_REGION=<region> npm run db:seed:remote   # demo data for testers
```

The Lambda runs with `NODE_ENV=production` and refuses to boot without a webhook
secret, so the first dev/staging deploy uses a placeholder; set the real one (below)
and redeploy. `prod` requires the webhook secret and explicit `ALLOWED_ORIGINS`.

`template.yaml` creates: DynamoDB table (on-demand, 2 GSIs), Lambda (nodejs22.x/arm64,
esbuild bundle via Makefile), API Gateway HTTP API with CORS, and least-privilege
DynamoDB IAM. Output `ApiUrl` is your backend base URL.

Then in Stripe Dashboard → Developers → Webhooks, add
`https://<api-id>.execute-api.<region>.amazonaws.com/<stage>/webhooks/stripe`
(listen for `payment_intent.succeeded` + `payment_intent.payment_failed`) and put
the signing secret into `STRIPE_WEBHOOK_SECRET` in `.env.deploy.<stage>`, then redeploy.

## API surface

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` |, | Liveness + DynamoDB/Stripe status |
| POST | `/auth/otp/start` |, | `{contact}` (email or E.164) → `{challenge_id, channel, resend_after}` |
| POST | `/auth/otp/verify` |, | `{challenge_id, code}` → `{token, refresh_token, user, is_new, memberships, landing}` (signs in or creates) |
| POST | `/auth/apple` |, | `{identity_token, name?}` → same shape as verify |
| POST | `/auth/refresh` |, | Rotate a session's refresh token |
| GET/PATCH/DELETE | `/me` (`/auth/me` alias) | Bearer | Read / edit profile (email/phone change needs a code, A7) / delete (A6) |
| GET/DELETE | `/me/sessions`, `/me/sessions/:id` | Bearer | Signed-in devices |
| GET | `/me/plans` | Bearer | `{waiting_on_you, upcoming, waiting, past}` (I10) |
| GET | `/home?city=&date=&category=` |, | Web front door: featured, 21 days, categories, lineup |
| POST | `/invites` | Bearer | Personal invite → `{invite, link}` |
| GET | `/invites/:code` |, | Public invite page (works signed out) |
| POST | `/invites/:id/rsvp`, `/updates`, `/cancel`, `/move` (`/convert`), `/report` | Bearer | RSVP, message guests, cancel, sell tickets instead, report |
| GET/POST/DELETE | `/invites/:id/guests`, `/rsvps/:user/decision`, `/rsvps/:user/check-in` | Bearer (host) | Host view |
| GET | `/events` |, | Published events (`?category=`, `?q=`, `?limit=`) |
| GET | `/events/mine` | Bearer | Caller's events (any status) |
| GET | `/events/:id` |, | Event detail incl. tiers (`priceCents` + `price`, `remaining`) |
| POST | `/events` | Bearer | Create event + tiers (status DRAFT) |
| POST | `/events/:id/publish` | Bearer | Publish draft |
| POST | `/orders/intent` | Bearer | Create pending order + PaymentIntent → `clientSecret` |
| GET | `/orders` | Bearer | My orders |
| GET | `/orders/:id` | Bearer | Order detail incl. issued tickets |
| GET | `/tickets` | Bearer | My tickets (wallet) |
| POST | `/webhooks/stripe` | signature | Fulfillment: marks PAID, issues tickets |

Money is integer cents (`priceCents`, `totalCents`); event payloads also include a
`price` dollar convenience field. The frontend currently uses dollars, convert at
the boundary (`Math.round(price * 100)`).

## Data model (DynamoDB single-table)

Table `blocktiks`: `pk` (HASH) / `sk` (RANGE), GSI1 = feed index, GSI2 = per-user index.

| pk | sk | Item | GSI keys |
|----|----|------|----------|
| `USER#<id>` | `PROFILE` | user (email, passwordHash scrypt, role, …) |, |
| `USER#EMAIL#<email>` | `ID` | email → userId lookup |, |
| `EVENT#<id>` | `METADATA` | event | gsi1 feed keys only when PUBLISHED; gsi2 `CREATOR#<id>` always |
| `EVENT#<id>` | `TIER#<tierId>` | ticket tier (priceCents, quantity, sold, available) |, |
| `ORDER#<id>` | `METADATA` | order (status, totals, ticketCodes, kind) | gsi2 `USER#<id>#ORDERS` |
| `ORDER#<id>` | `ITEM#<tierId\|sectionId\|ticketCode>` | order line item |, |
| `PI#<paymentIntentId>` | `ORDER` | Stripe PI → orderId (webhook) |, |
| `TICKET#<code>` | `METADATA` | ticket (denormalized event/tier for wallet) | gsi2 `USER#<id>#TICKETS`; gsi1 `EVENTTIX#<eventId>` |
| `EVENT#<id>` | `SECTION#<sectionId>` | venue section inventory (priceCents, capacity, sold, available) |, |
| `LISTING#<ticketCode>` | `METADATA` | resale listing (priceCents, status ACTIVE/CHECKOUT/SOLD/CANCELLED) | gsi1 `LISTINGS#ACTIVE` / `EVENT#<id>`; gsi2 `USER#<id>#LISTINGS` |
| `OFFER#<id>` | `METADATA` | set-your-price offer (maxPriceCents, quantity, matchedCount) | gsi1 `OFFERS#ACTIVE` / `EVENT#<id>#<tierKey>`; gsi2 `USER#<id>#OFFERS` |
| `BROADCAST#<id>` | `METADATA` | creator broadcast to event guests | gsi2 `CREATOR#<id>` / `BROADCASTS` |
| `PROMO#<CODE>` | `METADATA` | promo code (creatorId, scope, discount, usedCount) | gsi1 `PROMOS#ALL` |
| `USER#PHONE#<e164>` / `USER#APPLE#<sub>` | `ID` | phone / Apple subject → userId lookup |, |
| `OTP#<id>` | `METADATA` | OtpChallenge (HMAC code hash, attempts, expiresAt, consumedAt) | gsi1 `OTPEXP`/expiresAt (cleanup); gsi2 `OTPCONTACT#<contact>`/createdAt (send limit) |
| `SESSION#<id>` | `METADATA` | Session (device, method, lastSeenAt, revokedAt) | gsi2 `USER#<id>#SESSIONS` |
| `INVITE#<id>` | `METADATA` | personal invite (goingSeats counter) | gsi2 `USER#<host>#INVITES`; gsi1 `INVITES#ACTIVE`/startsAt while active |
| `INVITE#<id>` | `RSVP#<userId>` / `UPDATE#…` / `REPORT#…` | InviteRsvp (incl. `seen` marker) / InviteUpdate / abuse report | gsi2 `USER#<id>#RSVPS` (rsvps) |
| `INVITECODE#<code>` | `ID` | share code → inviteId |, |
| `NOTIF#<userId>` | `<createdAt>#<id>` | stored notification |, |
| `RATE#<scope>` | `DAY#<date>` | daily counters (invites/day, messages/invite/day) |, |
| `EXPIRE#<orderId>` | `INDEX` | pending-order expiry marker | gsi1 `EXPIRE` / `expiresAt` (sweeper) |

GSI1 is the global feed index (`EVENTS#PUBLISHED` sorted by start time,
`EXPIRE`, `EVENTTIX#<id>`, `LISTINGS#ACTIVE`, `OFFERS#ACTIVE`, `PROMOS#ALL`).
GSI2 is always per-user or per-creator (`USER#<id>#ORDERS|TICKETS|LISTINGS|OFFERS`,
`CREATOR#<id>`).

## Inventory & oversell protection

Ticket tiers carry two counters: `sold` (fulfilled) and `available`
(`quantity - sold - reserved`). The purchase flow:

1. `POST /orders/intent` atomically decrements `available` via
   `UpdateItem … ADD available -qty` with `ConditionExpression available >= qty`.
   Two buyers racing for the last ticket can't both win, the loser gets 409.
2. Stripe `payment_intent.succeeded` → `fulfillOrder` bumps `sold` and issues
   tickets in one transaction (the hold becomes a sale; `available` is unchanged).
3. `payment_intent.payment_failed` / `canceled` → `releaseOrder` credits
   `available` back and marks the order FAILED, exactly once, guarded by a
   `status = PENDING` condition in the same transaction.
4. Abandoned checkouts (user closes the payment sheet): the order gets
   `expiresAt = now + RESERVATION_TTL_MINUTES` (default 15) and an `EXPIRE#`
   index item. A second Lambda (`SweeperFunction`, EventBridge `rate(5 minutes)`)
   finds expired PENDING orders via GSI1, **checks the Stripe PI status first**,    `succeeded` → fulfills (covers late/lost webhooks), `processing` → skips,
   otherwise → releases the hold and marks the order EXPIRED.

This closes both halves of the race: overselling at fulfillment, and inventory
hoarding by checkouts that never pay.

Scales by partition: hot reads are per-event/per-user; the only global query is the
published-events feed (GSI1, sorted by start time). If the feed outgrows a single
partition later, shard `gsi1pk` (e.g. `EVENTS#PUBLISHED#<category>`) or move to a
feed-table pattern, no schema migration needed, just new key prefixes.

## Production readiness

Security posture (audited 2026-11):

- **Secrets**: with `NODE_ENV=production` the app refuses to boot without
  `JWT_SECRET`, `CORS_ORIGIN`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`
  (no dev fallbacks). Generate with `openssl rand -hex 32`.
- **Transport hardening**: `@fastify/helmet` security headers; global rate limit
  (300 req/min) with tighter limits on auth endpoints (login/signup 10/min,
  password-reset 5-10/min). Rate limits are per-Lambda-instance, for strict
  global limits front the API with API Gateway usage plans or WAF rules.
- **Error handling**: 5xx responses are sanitized (`Internal server error`);
  internals are only logged.
- **AuthZ**: event create/publish/venue-layout require CREATOR or ADMIN;
  promo PATCH verifies ownership *before* writing (IDOR fixed); `PATCH
  /auth/me` can no longer self-set `emailVerified`; tier sale windows
  (`saleStartsAt`/`saleEndsAt`) are enforced at order time; account deletion
  cancels active resale listings and standing offers.
- **Payments**: server-side pricing only, Stripe webhook signature verification
  on the raw body, idempotent fulfillment (`status = PENDING` condition),
  sweeper reconciles against Stripe before releasing expired holds.

Data we collect (DynamoDB `blocktiks`): account profile (email, scrypt password
hash, name, optional phone/avatar/city/interests/dateOfBirth/notification
prefs), Stripe customer id, orders + line items + totals, issued tickets
(denormalized event/tier/section names), resale listings, set-your-price
offers, promo codes, broadcasts, password-reset hashes (sha256, 10-min expiry).
Account deletion scrubs profile PII (name/phone/avatar/city/interests/DOB/prefs/
Stripe id) and removes the email index, but **retains orders/tickets** for
financial records; tickets are not personally identifiable beyond userId.
`RESET#` items have no DynamoDB TTL, they expire logically via `expiresAt`
and are overwritten on the next request; enable a TTL attribute on `expiresAt`
if table-level cleanup is wanted (note: TTL is table-wide, so audit all items
first).

Known gaps before a real launch (deliberate, surfaced in UI as unavailable):

- **USD only** · Stripe PaymentIntents hardcode `currency: 'usd'`; AED/multi-
  currency needs a currency field on events/tiers and Stripe multi-currency.
- **No payouts** · `POST /account/withdraw` returns 501; earnings are computed
  from paid resale orders but no Stripe Connect transfers exist yet.
- **No referrals tracking, no email delivery**, password resets return a dev
  code only outside production; broadcasts/notifications are stored, not pushed.
- **No email verification flow** · `emailVerified` is stored but never set by
  the server.
- **Section-level seats**, venue sections track capacity, not individual seats.
- **JWT is a single long-lived token** (`refreshToken` = access token); add a
  real refresh flow and shorter expiry for production.
- **No pagination** on `/events` and wallet listings (hard `Limit`); fine at
  MVP scale, add cursor pagination before large catalogs.

Deploy checklist:

1. `sam build && sam deploy` with `AllowedOrigins` set to the real web origins
   (mobile app calls need no CORS, but buyer-web/studio do).
2. Stripe Dashboard → webhook endpoint for `/webhooks/stripe`
   (`payment_intent.succeeded`, `payment_intent.payment_failed`,
   `payment_intent.canceled`) → set `StripeWebhookSecret`; switch
   `StripeSecretKey` to `sk_live_...`.
3. Verify `/health` reports `stripe: configured` and DynamoDB `ok`.
4. Smoke-test: signup → create/publish event → buy with a real card → ticket
   appears in wallet → resale list → check-in scan.

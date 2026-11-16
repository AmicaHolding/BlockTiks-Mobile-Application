# BlockTiks Backend (MVP)

Node 22 + TypeScript + Fastify + **DynamoDB (single-table)** + Stripe test mode.
Deploys as **AWS Lambda behind API Gateway HTTP API** via SAM.
No blockchain — regular database, Stripe PaymentIntents, JWT auth.

## Local dev

You need AWS credentials (`aws login` / `aws configure`) and the table.

```bash
cd backend
cp .env.example .env        # fill in JWT_SECRET, STRIPE_SECRET_KEY, etc.
npm install

# Create the DynamoDB table (once) — same shape as template.yaml:
aws dynamodb create-table \
  --table-name blocktiks \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
    AttributeName=gsi1pk,AttributeType=S AttributeName=gsi1sk,AttributeType=S \
    AttributeName=gsi2pk,AttributeType=S AttributeName=gsi2sk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
  --global-secondary-indexes \
    "[{\"IndexName\":\"gsi1\",\"KeySchema\":[{\"AttributeName\":\"gsi1pk\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"gsi1sk\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}},{\"IndexName\":\"gsi2\",\"KeySchema\":[{\"AttributeName\":\"gsi2pk\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"gsi2sk\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}]" \
  --billing-mode PAY_PER_REQUEST

npm run dev                 # http://localhost:4000 (uses your AWS creds/region)
```

Or point `DYNAMODB_ENDPOINT` at DynamoDB Local instead of real AWS.

## Stripe test flow

```bash
npm run stripe:listen       # prints a whsec_... webhook secret → STRIPE_WEBHOOK_SECRET
```

Then `npm run dev` in another shell. Card `4242 4242 4242 4242` works in test mode.

## Deploy to AWS (SAM)

```bash
sam build
sam deploy --guided \
  --parameter-overrides \
    JwtSecret="$(openssl rand -hex 32)" \
    StripeSecretKey="sk_test_..." \
    StripeWebhookSecret="whsec_..." \
    AllowedOrigins="*"
```

`template.yaml` creates: DynamoDB table (on-demand, 2 GSIs), Lambda (nodejs22.x/arm64,
esbuild bundle via Makefile), API Gateway HTTP API with CORS, and least-privilege
DynamoDB IAM. Output `ApiUrl` is your backend base URL.

Then in Stripe Dashboard → Developers → Webhooks, add
`https://<api-id>.execute-api.<region>.amazonaws.com/<stage>/webhooks/stripe`
(listen for `payment_intent.succeeded` + `payment_intent.payment_failed`) and put
the signing secret into `StripeWebhookSecret`.

## API surface

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | — | Liveness + DynamoDB/Stripe status |
| POST | `/auth/signup` | — | Create account → `{ token, refreshToken, user }` |
| POST | `/auth/login` | — | Login → same shape |
| GET | `/auth/me` | Bearer | Current user |
| GET | `/events` | — | Published events (`?category=`, `?q=`, `?limit=`) |
| GET | `/events/mine` | Bearer | Caller's events (any status) |
| GET | `/events/:id` | — | Event detail incl. tiers (`priceCents` + `price`, `remaining`) |
| POST | `/events` | Bearer | Create event + tiers (status DRAFT) |
| POST | `/events/:id/publish` | Bearer | Publish draft |
| POST | `/orders/intent` | Bearer | Create pending order + PaymentIntent → `clientSecret` |
| GET | `/orders` | Bearer | My orders |
| GET | `/orders/:id` | Bearer | Order detail incl. issued tickets |
| GET | `/tickets` | Bearer | My tickets (wallet) |
| POST | `/webhooks/stripe` | signature | Fulfillment: marks PAID, issues tickets |

Money is integer cents (`priceCents`, `totalCents`); event payloads also include a
`price` dollar convenience field. The frontend currently uses dollars — convert at
the boundary (`Math.round(price * 100)`).

## Data model (DynamoDB single-table)

Table `blocktiks`: `pk` (HASH) / `sk` (RANGE), GSI1 = feed index, GSI2 = per-user index.

| pk | sk | Item | GSI keys |
|----|----|------|----------|
| `USER#<id>` | `PROFILE` | user (email, passwordHash scrypt, role, …) | — |
| `USER#EMAIL#<email>` | `ID` | email → userId lookup | — |
| `EVENT#<id>` | `METADATA` | event | gsi1 feed keys only when PUBLISHED; gsi2 `CREATOR#<id>` always |
| `EVENT#<id>` | `TIER#<tierId>` | ticket tier (priceCents, quantity, sold, available) | — |
| `ORDER#<id>` | `METADATA` | order (status, totals, ticketCodes) | gsi2 `USER#<id>#ORDERS` |
| `ORDER#<id>` | `ITEM#<tierId>` | order line item | — |
| `PI#<paymentIntentId>` | `ORDER` | Stripe PI → orderId (webhook) | — |
| `TICKET#<code>` | `METADATA` | ticket (denormalized event/tier for wallet) | gsi2 `USER#<id>#TICKETS` |
| `PROMO#<CODE>` | `METADATA` | promo code | — |
| `EXPIRE#<orderId>` | `INDEX` | pending-order expiry marker | gsi1 `EXPIRE` / `expiresAt` (sweeper) |

## Inventory & oversell protection

Ticket tiers carry two counters: `sold` (fulfilled) and `available`
(`quantity - sold - reserved`). The purchase flow:

1. `POST /orders/intent` atomically decrements `available` via
   `UpdateItem … ADD available -qty` with `ConditionExpression available >= qty`.
   Two buyers racing for the last ticket can't both win — the loser gets 409.
2. Stripe `payment_intent.succeeded` → `fulfillOrder` bumps `sold` and issues
   tickets in one transaction (the hold becomes a sale; `available` is unchanged).
3. `payment_intent.payment_failed` / `canceled` → `releaseOrder` credits
   `available` back and marks the order FAILED — exactly once, guarded by a
   `status = PENDING` condition in the same transaction.
4. Abandoned checkouts (user closes the payment sheet): the order gets
   `expiresAt = now + RESERVATION_TTL_MINUTES` (default 15) and an `EXPIRE#`
   index item. A second Lambda (`SweeperFunction`, EventBridge `rate(5 minutes)`)
   finds expired PENDING orders via GSI1, **checks the Stripe PI status first** —
   `succeeded` → fulfills (covers late/lost webhooks), `processing` → skips,
   otherwise → releases the hold and marks the order EXPIRED.

This closes both halves of the race: overselling at fulfillment, and inventory
hoarding by checkouts that never pay.

Scales by partition: hot reads are per-event/per-user; the only global query is the
published-events feed (GSI1, sorted by start time). If the feed outgrows a single
partition later, shard `gsi1pk` (e.g. `EVENTS#PUBLISHED#<category>`) or move to a
feed-table pattern — no schema migration needed, just new key prefixes.

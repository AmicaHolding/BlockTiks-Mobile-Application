# BlockTiks / Sahra

Flutter mobile app, Fastify + DynamoDB backend, and Studio/buyer web apps.

## Environments

| Stage | Backend | Data | Used for |
|-------|---------|------|----------|
| `local` | `./dev.sh --local` on `localhost:4000` | DynamoDB Local in Docker + seed script | Day-to-day development, offline, no AWS account |
| `staging` | SAM stack `blocktiks-staging` | Its own DynamoDB table, seeded demo data, Stripe test mode | Testers, TestFlight / internal builds |
| `prod` | SAM stack `blocktiks-prod` | Real data only, never seeded | Store builds |

Every stage runs the same backend code against DynamoDB, so what works locally works on AWS.

## Run everything locally (no AWS needed)

Needs Docker and Node 22.

```bash
./dev.sh --local --seed      # DynamoDB Local + backend + demo data + flutter run
./dev.sh --local --no-app    # backend only (for Studio / buyer web)
```

Demo accounts (password `password123`): `creator@test.com`, `layla@test.com` (creators),
`fan@test.com`, `noor@test.com` (fans). The seed creates 5 events (one draft, one with
seated sections), paid orders and tickets, a resale listing, a set-your-price offer, the
`WELCOME10` promo and a referral. Event dates are relative to today, so they never go stale.

Reset to a clean dataset at any time:

```bash
cd backend && npm run db:reset
```

Data survives restarts (Docker volume). `npm run db:down -- -v` deletes it entirely.

Without `--local`, `./dev.sh` uses your AWS credentials and the real `blocktiks` table in
your configured region.

## Point the app at a stage

```bash
flutter run --dart-define-from-file=config/env/local.json     # localhost / 10.0.2.2
flutter run --dart-define-from-file=config/env/staging.json
flutter build ipa --dart-define-from-file=config/env/prod.json
```

Fill `API_BASE_URL` in `config/env/staging.json` / `prod.json` with the `ApiUrl` printed by
the deploy. Optional `STRIPE_PUBLISHABLE_KEY` in the same file overrides the test key.
For a physical device on local, use your machine's LAN IP:
`--dart-define=API_BASE_URL=http://192.168.1.10:4000`.

Web apps: `npm run dev` (local), `npm run dev:staging` / `npm run build:staging` (reads
`.env.staging`, see `.env.staging.example`), `npm run build` (reads `.env.production`).

## Deploy a stage

See [backend/README.md](backend/README.md#deploy-to-aws-sam):

```bash
cd backend && scripts/deploy.sh staging
```

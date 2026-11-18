# Sahra / BlockTiks

A Middle East ticketing platform: fans discover and buy tickets, resale is
built in, and organisers run door mode from the same app. This repo contains
all four surfaces plus the design source of truth.

| Surface | Path | Stack | Local URL |
|---------|------|-------|-----------|
| Mobile app (fan + door mode) | `lib/` | Flutter, GetX | iOS/Android simulator |
| Fan web | `buyer-web/` | React, Vite, Tailwind | `http://localhost:5174` |
| Studio (organiser) | `studio/` | React, Vite, Tailwind | `http://localhost:5173` |
| Backend API | `backend/` | Fastify 5, TypeScript, DynamoDB | `http://localhost:4000` |
| Design source of truth | `designs/` | prototypes + handoff spec | - |

## Quick start

Prerequisites: Docker Desktop, Node 22, Flutter SDK, Xcode (for iOS sim).

```bash
# 1. Backend + DynamoDB Local + demo data (one command)
./dev.sh --local --seed        # then also starts flutter run
./dev.sh --local --no-app      # backend only (for the web apps)

# 2. Fan web
cd buyer-web && npm install && npm run dev      # http://localhost:5174

# 3. Studio
cd studio && npm install && npm run dev         # http://localhost:5173
```

Health check: `curl http://localhost:4000/health` should report
`"db":"ok","dbLocal":true,"stripe":"configured"`.

See [SETUP.md](SETUP.md) for the full step-by-step guide (env vars, physical
devices, Stripe webhooks, deploying to AWS).

## Demo accounts

All seeded users use password `password123`:

| Email | Role |
|-------|------|
| `fan@test.com` | fan (has tickets, a resale listing) |
| `noor@test.com` | fan |
| `creator@test.com` | creator / org admin |
| `layla@test.com` | creator |

The seed creates 8 published events across Dubai, Abu Dhabi and Riyadh
(including a seated venue and a 21+ event), paid orders, a resale listing, a
set-your-price offer, the `WELCOME10` promo and a referral. Dates are relative
to today so they never go stale.

```bash
cd backend
npm run db:more     # add 3 extra events without wiping data
npm run db:reset    # wipe + reseed clean
```

## Environments

| Stage | Backend | Data |
|-------|---------|------|
| `local` | `localhost:4000` | DynamoDB Local (Docker `:8000`) |
| `staging` | SAM stack `blocktiks-staging` | Own DynamoDB table, Stripe test mode |
| `prod` | SAM stack `blocktiks-prod` | Real data, never seeded |

```bash
flutter run --dart-define-from-file=config/env/local.json     # default
flutter run --dart-define-from-file=config/env/staging.json
flutter build ipa --dart-define-from-file=config/env/prod.json
```

## Verification

```bash
flutter analyze                      # 0 errors expected
cd backend && npm run typecheck && npm run typecheck:scripts
cd buyer-web && npm run build
cd studio && npm run build
maestro test maestro/                # simulator smoke tests (see docs/)
```

## Repo layout

```
lib/                 Flutter app (fan flows + creator door mode)
buyer-web/           fan web app
studio/              organiser Studio web app
backend/             Fastify API, single-table DynamoDB, SAM deploy
designs/             prototypes + handoff spec (source of truth, do not edit
                     copy lightly): handoff/01-05 docs, brand/tokens.json
docs/                progress logs, backend gap analysis, smoke-test reports
maestro/             iOS simulator UI smoke flows
dev.sh               one-command local launcher
AGENTS.md            invariants: integer minor units, idempotency keys,
                     venue timezone, X-Org-Id
```

## Documentation

- [SETUP.md](SETUP.md) - full setup guide
- [AGENTS.md](AGENTS.md) - rules every contributor/agent must follow
- `designs/handoff/` - data model (01), API contracts (02), business rules (03),
  open decisions (04), real-world scenarios (05)
- `docs/backend-gap-analysis.md` - spec-vs-code audit and build order
- `docs/progress-*.md` - per-surface implementation logs
- `docs/maestro-smoke-test-2026-11-18.md` - simulator test report
- [backend/README.md](backend/README.md) - API and AWS deployment details

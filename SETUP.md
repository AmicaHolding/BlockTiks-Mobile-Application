# Setup guide

Everything needed to go from a fresh clone to all four Sahra surfaces running
locally. No AWS account required for local development.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Docker Desktop | any recent | must be running before `dev.sh` |
| Node.js | 22.x | backend + web apps |
| Flutter SDK | stable | `~/flutter/bin/flutter` on this machine |
| Xcode | 26.x | iOS simulator + signing |
| Stripe CLI | optional | only for webhook testing |

Verify:

```bash
docker info >/dev/null && echo docker ok
node --version          # v22+
flutter --version
xcrun simctl list devices available | grep iPhone
```

## 1. Backend + database (DynamoDB Local)

The launcher creates `backend/.env` on first run, boots the DynamoDB Local
container, creates the `blocktiks` table, seeds demo data, then starts the
API on port 4000:

```bash
./dev.sh --local --seed        # backend + flutter run
./dev.sh --local --no-app      # backend only
```

Equivalent manual steps (useful when you want the pieces separate):

```bash
cd backend
npm install
npm run db:up          # docker compose up -d dynamodb   -> localhost:8000
npm run db:create      # create the 'blocktiks' table
npm run db:seed        # users, events, orders, tickets, a listing, a promo
npm run dev:local      # tsx watch -> http://localhost:4000
```

Check it:

```bash
curl http://localhost:4000/health
# {"status":"ok","db":"ok","dbLocal":true,"stripe":"configured",...}

curl -s -X POST http://localhost:4000/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"fan@test.com","password":"password123"}' | head -c 200
```

Data persists in a Docker volume between restarts. Useful scripts:

```bash
npm run db:more      # add 3 extra events, skips titles that already exist
npm run db:reset     # wipe + reseed
npm run db:down -- -v  # destroy the volume entirely
```

### Stripe

Local runs use test keys. `backend/.env` already has a test secret; the app
posts card payments through Stripe PaymentSheet with the publishable key from
`config/env/*.json`. To exercise the webhook path locally:

```bash
cd backend && npm run stripe:listen
```

### Troubleshooting

- **`db: error` on /health** - Docker isn't up or the table is missing:
  `npm run db:up && npm run db:create`.
- **Port 4000 already in use** - a stale backend may be holding it:
  `lsof -ti:4000 | xargs kill`.
- **`@fastify/*` module not found** - stale `node_modules` after a pull:
  `cd backend && npm install`.

## 2. Fan web (`buyer-web`, port 5174)

```bash
cd buyer-web
cp .env.example .env        # only needed once; defaults already point local
npm install
npm run dev
```

Open `http://localhost:5174`, sign in with `fan@test.com` / `password123`.
The home page is city-aware (Dubai/Abu Dhabi/Riyadh/Doha chips) and the
checkout uses a 15-minute hold countdown per spec.

## 3. Studio (`studio`, port 5173)

```bash
cd studio
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`, sign in `creator@test.com` / `password123`, or
sign up fresh to walk host onboarding (org setup → verification → publish).
The header has a dev "Preview role" switcher for Admin / Co-host / Gate views.

## 4. Mobile app (`lib/`, Flutter)

```bash
flutter pub get
flutter run --dart-define-from-file=config/env/local.json
```

`config/env/local.json` points the app at `http://localhost:4000`. On the iOS
simulator, `localhost` reaches the host Mac directly. For Android emulator use
`10.0.2.2`, and for a physical device use your Mac's LAN IP:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:4000
```

Sign in with any demo account. `fan@test.com` shows tickets in the wallet;
switching to creator mode is under Profile / Account → Switch profile, which
reveals the door-mode tabs (Events, Scan, Guests, Account).

### Simulator smoke tests (Maestro)

Maestro flows live in `maestro/` and are documented with screenshots in
`docs/maestro-smoke-test-2026-11-18.md`. Setup used on this machine:

```bash
export PATH="$HOME/.maestro/bin:$HOME/.local/jre/jdk-21.0.13+9-jre/Contents/Home/bin:$PATH"
export JAVA_HOME="$HOME/.local/jre/jdk-21.0.13+9-jre/Contents/Home"
export MAESTRO_DRIVER_STARTUP_TIMEOUT=240000
maestro test maestro/08b-signin.yaml
maestro test maestro/11-checkout-verify.yaml
```

## 5. Deploy to AWS (staging / prod)

Staging and prod run as AWS Lambda + API Gateway via SAM:

```bash
cd backend && scripts/deploy.sh staging     # prints ApiUrl
```

Put that URL in `config/env/staging.json` (`API_BASE_URL`) and build with
`--dart-define-from-file`. Web apps read `.env.staging` / `.env.production`
(see the `*.example` files in each app). Full detail: `backend/README.md`.

## Common verification commands

```bash
flutter analyze                          # mobile, infos only
cd backend && npm run typecheck          # backend
cd backend && npm run typecheck:scripts  # seed/deploy scripts
cd buyer-web && npm run build            # tsc + vite
cd studio && npm run build
```

## Where to read next

- `AGENTS.md` - hard invariants (integer minor units, idempotency keys on
  money POSTs, venue timezones, `X-Org-Id` on org-scoped calls)
- `designs/handoff/` - the product spec this repo implements
- `docs/progress-*.md` - what each surface implements and what's stubbed
  (`TODO(api-gap)` markers map to the backend gap analysis)

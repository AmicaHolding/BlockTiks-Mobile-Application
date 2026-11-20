#!/usr/bin/env bash
# Sahra (BlockTiks) local dev launcher, starts the backend and the Flutter app.
# Storage is a local SQLite file speaking the D1 dialect — no Docker, no AWS.
#
# Usage:
#   ./dev.sh                # backend + flutter run (asks for device)
#   ./dev.sh --local        # same as default now (kept for muscle memory)
#   ./dev.sh --seed         # also seed demo users, events, tickets, listings (see backend/scripts/seed.ts)
#   ./dev.sh --no-app       # backend only
#   ./dev.sh -d <device>    # extra args are passed to `flutter run`
#
# Env overrides:
#   BACKEND_DIR   path to the backend (default: ./backend)
#   API_PORT      backend port (default: 4000)
#   DB_PATH       SQLite file (default: backend/data/dev.db)

set -euo pipefail

BACKEND_DIR="${BACKEND_DIR:-$(cd "$(dirname "$0")" && pwd)/backend}"
API_PORT="${API_PORT:-4000}"
API_URL="http://localhost:${API_PORT}"
SEED=false
APP_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    --local) ;; # SQLite is the only local engine now; flag is a no-op.
    --no-app) APP_ARGS=("--no-app") ;;
    *) APP_ARGS+=("$arg") ;;
  esac
done

export PATH="$HOME/.local/bin:$HOME/flutter/bin:$HOME/.gem/ruby/2.6.0/bin:$PATH"

echo "==> Backend: $BACKEND_DIR"
cd "$BACKEND_DIR"

# --- .env -------------------------------------------------------------------
if [ ! -f .env ]; then
  cat > .env <<EOF
PORT=${API_PORT}
NODE_ENV=development
CORS_ORIGIN=*
DB_ENGINE=sqlite
DB_PATH=data/dev.db
TABLE_NAME=blocktiks
JWT_SECRET=dev-only-secret-change-me
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PLATFORM_FEE_PERCENT=5
RESERVATION_TTL_MINUTES=15
EOF
  echo "    created .env"
fi

# --- deps -------------------------------------------------------------------
[ -d node_modules ] || npm install

# --- database ---------------------------------------------------------------
# Schema auto-applies on first connection; ensure it exists up front anyway.
npm run --silent db:create >/dev/null 2>&1 || true

BACKEND_PID=""
STARTED_BACKEND=false

# --- start backend ----------------------------------------------------------
HEALTH_URL="$API_URL/health"
ALREADY=false
if curl -s --max-time 2 "$HEALTH_URL" | grep -q '"status":"ok"'; then
  ALREADY=true
  echo "==> Backend already running on $API_URL"
elif curl -s -o /dev/null --max-time 1 "$HEALTH_URL"; then
  echo "!! Port $API_PORT is used by something that is not the Sahra backend."
  exit 1
fi
if ! $ALREADY; then
  echo "==> Starting backend on $API_URL"
  npm run dev > /tmp/blocktiks-backend.log 2>&1 &
  BACKEND_PID=$!
  STARTED_BACKEND=true
  trap 'kill ${BACKEND_PID:-} ${STRIPE_PID:-} 2>/dev/null || true' EXIT
  for i in $(seq 1 30); do
    curl -s "$HEALTH_URL" | grep -q '"status":"ok"' && break
    sleep 1
  done
  curl -s "$HEALTH_URL" | grep -q '"status":"ok"' || { echo "!! Backend failed to start, see /tmp/blocktiks-backend.log"; exit 1; }
fi

API_HEALTH=$(curl -s "$API_URL/health")
echo "    health: $API_HEALTH"
echo "$API_HEALTH" | grep -q '"stripe":"missing"' && \
  echo "!! STRIPE_SECRET_KEY not set, checkout will fail until you add a sk_test_ key to backend/.env"

# --- stripe webhook forwarder -------------------------------------------------
if grep -q '^STRIPE_SECRET_KEY=sk_' .env && command -v stripe >/dev/null 2>&1; then
  SKEY="$(grep '^STRIPE_SECRET_KEY=' .env | cut -d= -f2-)"
  if ! pgrep -f "stripe listen" >/dev/null 2>&1; then
    echo "==> Starting stripe listen (webhook forwarder)"
    stripe listen --forward-to "$API_URL/webhooks/stripe" --api-key "$SKEY" \
      --events payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled \
      > /tmp/blocktiks-stripe-listen.log 2>&1 &
    STRIPE_PID=$!
  fi
fi

# --- seed --------------------------------------------------------------------
if $SEED; then
  echo "==> Seeding demo data"
  npm run --silent db:seed
fi

# --- flutter ------------------------------------------------------------------
if [[ " ${APP_ARGS[*]} " == *" --no-app "* ]]; then
  echo "==> Backend running. Ctrl+C to stop."
  if $STARTED_BACKEND; then
    trap - EXIT
    wait $BACKEND_PID
  else
    tail -f /tmp/blocktiks-backend.log
  fi
  exit 0
fi

cd "$(dirname "$0")"
echo "==> Starting Flutter app ($API_URL)"
flutter pub get && exec flutter run "${APP_ARGS[@]}"

#!/usr/bin/env bash
# BlockTiks local dev launcher, starts the MVP backend and the Flutter app.
#
# Usage:
#   ./dev.sh                # backend + flutter run (asks for device)
#   ./dev.sh --local        # use DynamoDB Local in Docker (no AWS account needed)
#   ./dev.sh --seed         # also seed demo users, events, tickets, listings (see backend/scripts/seed.ts)
#   ./dev.sh --no-app       # backend only
#   ./dev.sh -d <device>    # extra args are passed to `flutter run`
#
# Env overrides:
#   BACKEND_DIR   path to the backend (default: ./backend)
#   API_PORT      backend port (default: 4000)

set -euo pipefail

BACKEND_DIR="${BACKEND_DIR:-$(cd "$(dirname "$0")" && pwd)/backend}"
API_PORT="${API_PORT:-4000}"
API_URL="http://localhost:${API_PORT}"
SEED=false
LOCAL=false
APP_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    --local) LOCAL=true ;;
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
AWS_REGION=$(aws configure get region 2>/dev/null || echo me-central-1)
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

# --- DynamoDB table ---------------------------------------------------------
if $LOCAL; then
  command -v docker >/dev/null 2>&1 || { echo "!! --local needs Docker"; exit 1; }
  echo "==> Starting DynamoDB Local (docker compose)"
  docker compose up -d dynamodb >/dev/null
  for i in $(seq 1 30); do
    curl -s -o /dev/null http://localhost:8000 && break
    sleep 1
  done
  npm run --silent db:create
else
  if command -v aws >/dev/null 2>&1; then
    REGION="$(aws configure get region 2>/dev/null || echo me-central-1)"
    if ! aws dynamodb describe-table --table-name blocktiks --region "$REGION" >/dev/null 2>&1; then
      echo "==> Creating DynamoDB table 'blocktiks' in $REGION"
      aws dynamodb create-table \
        --table-name blocktiks --region "$REGION" --billing-mode PAY_PER_REQUEST \
        --attribute-definitions \
          AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
          AttributeName=gsi1pk,AttributeType=S AttributeName=gsi1sk,AttributeType=S \
          AttributeName=gsi2pk,AttributeType=S AttributeName=gsi2sk,AttributeType=S \
        --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
        --global-secondary-indexes \
          '[{"IndexName":"gsi1","KeySchema":[{"AttributeName":"gsi1pk","KeyType":"HASH"},{"AttributeName":"gsi1sk","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"gsi2","KeySchema":[{"AttributeName":"gsi2pk","KeyType":"HASH"},{"AttributeName":"gsi2sk","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
        >/dev/null
      aws dynamodb wait table-exists --table-name blocktiks --region "$REGION"
    fi
  else
    echo "!! aws CLI not found, backend needs DynamoDB access. Continuing anyway."
  fi
fi

BACKEND_PID=""
STARTED_BACKEND=false

# --- start backend ----------------------------------------------------------
# In --local mode we only reuse a backend whose /health reports dbLocal=true;
# a server already on the port may be an AWS-backed one (different data).
HEALTH_URL="$API_URL/health"
LOCAL_MARKER='"dbLocal":true'
ALREADY=false
if $LOCAL; then
  HEALTH=$(curl -s --max-time 2 "$HEALTH_URL" || true)
  if echo "$HEALTH" | grep -q "$LOCAL_MARKER"; then
    ALREADY=true
    echo "==> Backend already running on $API_URL"
  elif echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "!! Port $API_PORT is used by an AWS-backed backend. Stop it or run with API_PORT=<free port>."
    exit 1
  elif curl -s -o /dev/null --max-time 1 "$API_URL/health"; then
    echo "!! Port $API_PORT is used by something that is not the Sahra backend."
    exit 1
  fi
elif curl -s --max-time 2 "$HEALTH_URL" | grep -q '"status":"ok"'; then
  ALREADY=true
  echo "==> Backend already running on $API_URL"
fi
if ! $ALREADY; then
  echo "==> Starting backend on $API_URL"
  if $LOCAL; then DEV_SCRIPT=dev:local; else DEV_SCRIPT=dev; fi
  npm run "$DEV_SCRIPT" > /tmp/blocktiks-backend.log 2>&1 &
  BACKEND_PID=$!
  STARTED_BACKEND=true
  trap 'kill ${BACKEND_PID:-} ${STRIPE_PID:-} 2>/dev/null || true' EXIT
  WAIT_MARKER='"status":"ok"'
  $LOCAL && WAIT_MARKER="$LOCAL_MARKER"
  for i in $(seq 1 30); do
    curl -s "$HEALTH_URL" | grep -q "$WAIT_MARKER" && break
    sleep 1
  done
  curl -s "$HEALTH_URL" | grep -q "$WAIT_MARKER" || { echo "!! Backend failed to start, see /tmp/blocktiks-backend.log"; exit 1; }
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
  if $LOCAL; then
    npm run --silent db:seed
  else
    AWS_REGION="${REGION:-us-east-1}" npm run --silent db:seed:remote
  fi
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

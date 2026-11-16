#!/usr/bin/env bash
# BlockTiks local dev launcher — starts the MVP backend and the Flutter app.
#
# Usage:
#   ./dev.sh                # backend + flutter run (asks for device)
#   ./dev.sh --seed         # also seed demo creator + published events
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
APP_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
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
PLATFORM_FEE_PERCENT=12
RESERVATION_TTL_MINUTES=15
EOF
  echo "    created .env"
fi

# --- deps -------------------------------------------------------------------
[ -d node_modules ] || npm install

# --- DynamoDB table ---------------------------------------------------------
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
  echo "!! aws CLI not found — backend needs DynamoDB access. Continuing anyway."
fi

BACKEND_PID=""
STARTED_BACKEND=false

# --- start backend ----------------------------------------------------------
if curl -sf "$API_URL/health" >/dev/null 2>&1; then
  echo "==> Backend already running on $API_URL"
else
  echo "==> Starting backend on $API_URL"
  npm run dev > /tmp/blocktiks-backend.log 2>&1 &
  BACKEND_PID=$!
  STARTED_BACKEND=true
  trap 'kill ${BACKEND_PID:-} ${STRIPE_PID:-} 2>/dev/null || true' EXIT
  for i in $(seq 1 30); do
    curl -sf "$API_URL/health" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -sf "$API_URL/health" >/dev/null || { echo "!! Backend failed to start — see /tmp/blocktiks-backend.log"; exit 1; }
fi

HEALTH=$(curl -s "$API_URL/health")
echo "    health: $HEALTH"
echo "$HEALTH" | grep -q '"stripe":"missing"' && \
  echo "!! STRIPE_SECRET_KEY not set — checkout will fail until you add a sk_test_ key to backend/.env"

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
  node - "$API_URL" <<'NODE'
const base = process.argv[2];
const j = (r) => r.json();
const post = (p, body, token) =>
  fetch(base + p, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }).then(j);

const run = async () => {
  let res = await post('/auth/login', { email: 'creator@test.com', password: 'password123' });
  if (!res.token) res = await post('/auth/signup', { firstName: 'Demo', lastName: 'Creator', email: 'creator@test.com', password: 'password123', role: 'creator' });
  const token = res.token;
  const events = await fetch(base + '/events/mine', { headers: { authorization: `Bearer ${token}` } }).then(j);
  if ((events.events || []).length === 0) {
    const e1 = await post('/events', {
      title: 'Neon Nights Festival',
      description: 'An all-night electronic music festival featuring live sets and immersive visuals.',
      category: 'Music', startsAt: '2026-12-05T20:00:00.000Z',
      location: 'Riverside Arena', address: '123 Harbor St',
      tiers: [
        { name: 'General Admission', priceCents: 4500, quantity: 200 },
        { name: 'VIP', priceCents: 12000, quantity: 50 },
      ],
    }, token);
    await post(`/events/${e1.event.id}/publish`, {}, token);
    const e2 = await post('/events', {
      title: 'Rooftop Sessions',
      description: 'Intimate live music sessions on the rooftop every Friday.',
      category: 'Concerts', startsAt: '2026-11-28T19:00:00.000Z',
      location: 'Skyline Lounge',
      tiers: [{ name: 'Entry', priceCents: 2500, quantity: 80 }],
    }, token);
    await post(`/events/${e2.event.id}/publish`, {}, token);
    console.log('    seeded 2 events');
  } else {
    console.log('    demo events already exist');
  }
};
run().catch((e) => { console.error(e); process.exit(1); });
NODE
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
exec flutter pub get && flutter run "${APP_ARGS[@]}"

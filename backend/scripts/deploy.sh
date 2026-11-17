#!/usr/bin/env bash
# Deploys one stage of the backend with SAM.
#   scripts/deploy.sh dev|staging|prod
# Secrets come from backend/.env.deploy.<stage> (see .env.deploy.example).
set -euo pipefail

STAGE="${1:-}"
case "$STAGE" in
  dev|staging|prod) ;;
  *) echo "Usage: scripts/deploy.sh dev|staging|prod"; exit 1 ;;
esac

cd "$(dirname "$0")/.."
FILE=".env.deploy.$STAGE"
[ -f "$FILE" ] || { echo "!! $FILE not found — copy .env.deploy.example and fill it in"; exit 1; }
set -a; source "$FILE"; set +a

: "${JWT_SECRET:?JWT_SECRET is required in $FILE}"
: "${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY is required in $FILE}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-*}"

if [ "$STAGE" = prod ]; then
  [ -n "${STRIPE_WEBHOOK_SECRET:-}" ] || { echo "!! STRIPE_WEBHOOK_SECRET is required for prod"; exit 1; }
  [ "$ALLOWED_ORIGINS" != "*" ] || { echo "!! ALLOWED_ORIGINS must list real origins for prod"; exit 1; }
fi
if [ -z "${STRIPE_WEBHOOK_SECRET:-}" ]; then
  # The Lambda refuses to boot without a webhook secret (NODE_ENV=production),
  # so first deploys use a placeholder; payments stay unfulfilled until the
  # real whsec_ from the Stripe webhook is set and you redeploy.
  echo "!! STRIPE_WEBHOOK_SECRET empty — deploying with a placeholder. Webhooks will fail until you set it and redeploy."
  STRIPE_WEBHOOK_SECRET="whsec_placeholder"
fi

aws sts get-caller-identity >/dev/null || { echo "!! No AWS credentials — run 'aws configure' or 'aws sso login'"; exit 1; }

sam build --config-env "$STAGE"
sam deploy --config-env "$STAGE" --no-fail-on-empty-changeset \
  --parameter-overrides \
    "StageName=$STAGE" \
    "JwtSecret=$JWT_SECRET" \
    "StripeSecretKey=$STRIPE_SECRET_KEY" \
    "StripeWebhookSecret=$STRIPE_WEBHOOK_SECRET" \
    "AllowedOrigins=$ALLOWED_ORIGINS"

STACK="blocktiks-$STAGE"
API_URL=$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)
TABLE=$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='TableName'].OutputValue" --output text)
echo
echo "==> $STAGE deployed"
echo "    ApiUrl: $API_URL"
echo "    Table:  $TABLE"
echo "    Health: $(curl -s "$API_URL/health" || echo unreachable)"
echo
echo "    Put ApiUrl in ../config/env/$STAGE.json and the web .env.$STAGE files."
[ "$STAGE" = prod ] || echo "    Seed demo data: TABLE_NAME=$TABLE AWS_REGION=$(aws configure get region) npm run db:seed:remote"

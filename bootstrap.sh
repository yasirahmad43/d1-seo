#!/usr/bin/env bash
# ============================================================================
# D1 SEO Dashboard — one-command bootstrap.
#
# What this does:
#   1. Installs deps (npm install).
#   2. Creates a new Supabase project via the Management API (or reuses one).
#   3. Applies migrations + seed via the Supabase SQL HTTP endpoint.
#   4. Deploys to Vercel (vercel deploy --prod), wires env vars.
#   5. Prints the live URL + first-login instructions.
#
# What you need ready:
#   • Supabase access token   (https://supabase.com/dashboard/account/tokens)
#   • Supabase org ID         (Settings → General → Organization ID)
#   • Vercel token            (https://vercel.com/account/tokens)
#   • Optional: existing GitHub repo for the project
#
# Usage:
#   ./bootstrap.sh                  # interactive prompts
#   SUPABASE_ACCESS_TOKEN=... SUPABASE_ORG_ID=... VERCEL_TOKEN=... ./bootstrap.sh
# ============================================================================

set -euo pipefail
cd "$(dirname "$0")"

c_red()   { printf "\033[31m%s\033[0m" "$*"; }
c_green() { printf "\033[32m%s\033[0m" "$*"; }
c_blue()  { printf "\033[34m%s\033[0m" "$*"; }
c_dim()   { printf "\033[2m%s\033[0m" "$*"; }
say()     { echo "$(c_blue '▶') $*"; }
ok()      { echo "$(c_green '✓') $*"; }
die()     { echo "$(c_red '✗') $*" >&2; exit 1; }

ask() {
  local prompt="$1" var="$2" secret="${3:-no}"
  local value="${!var:-}"
  if [[ -n "$value" ]]; then return; fi
  if [[ "$secret" == "yes" ]]; then read -r -s -p "$prompt: " value; echo;
  else read -r -p "$prompt: " value; fi
  printf -v "$var" '%s' "$value"
  export "$var"
}

# ---------------------------------------------------------------------------
say "checking prerequisites"
command -v node >/dev/null || die "node 18+ required (https://nodejs.org)"
command -v npm  >/dev/null || die "npm required"
command -v curl >/dev/null || die "curl required"
command -v jq   >/dev/null || die "jq required (brew install jq / apt install jq)"
ok "node $(node --version), npm $(npm --version), jq $(jq --version)"

# ---------------------------------------------------------------------------
say "step 1/5 — install npm dependencies"
if [[ ! -d node_modules ]]; then
  npm install --no-audit --no-fund
fi
ok "deps installed"

# ---------------------------------------------------------------------------
say "step 2/5 — Supabase project setup"
ask "Supabase access token (sbp_...)"        SUPABASE_ACCESS_TOKEN yes
ask "Supabase org ID"                        SUPABASE_ORG_ID
ask "Project name (default: d1-seo-dashboard)" PROJECT_NAME
PROJECT_NAME="${PROJECT_NAME:-d1-seo-dashboard}"
ask "Region (us-east-1, us-west-1, eu-west-1, ap-southeast-1 — default us-east-1)" REGION
REGION="${REGION:-us-east-1}"
ask "Database password (16+ chars, save this)" SUPABASE_DB_PASSWORD yes

# Check if a project with this name already exists
existing_project=$(curl -sS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects" | jq -r --arg n "$PROJECT_NAME" '.[] | select(.name==$n) | .id' | head -1)

if [[ -n "$existing_project" ]]; then
  ok "reusing existing project: $existing_project"
  PROJECT_ID="$existing_project"
else
  say "creating new Supabase project (takes ~2 minutes)"
  create_response=$(curl -sS -X POST "https://api.supabase.com/v1/projects" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg n "$PROJECT_NAME" --arg o "$SUPABASE_ORG_ID" --arg p "$SUPABASE_DB_PASSWORD" --arg r "$REGION" \
      '{name:$n, organization_id:$o, db_pass:$p, region:$r, plan:"free"}')")
  PROJECT_ID=$(echo "$create_response" | jq -r .id)
  [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]] && die "project creation failed: $create_response"
  ok "project created: $PROJECT_ID"

  say "waiting for database to come online…"
  for i in {1..40}; do
    status=$(curl -sS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      "https://api.supabase.com/v1/projects/$PROJECT_ID" | jq -r .status)
    [[ "$status" == "ACTIVE_HEALTHY" ]] && break
    printf "  ."; sleep 5
  done; echo
  [[ "$status" == "ACTIVE_HEALTHY" ]] || die "db never came online (status: $status)"
  ok "db is ready"
fi

# fetch keys
keys=$(curl -sS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/$PROJECT_ID/api-keys?reveal=true")
ANON_KEY=$(echo "$keys" | jq -r '.[] | select(.name=="anon") | .api_key')
SERVICE_KEY=$(echo "$keys" | jq -r '.[] | select(.name=="service_role") | .api_key')
SUPABASE_URL="https://$PROJECT_ID.supabase.co"
ok "supabase URL: $SUPABASE_URL"

# ---------------------------------------------------------------------------
say "step 3/5 — apply migrations + seed via SQL HTTP endpoint"
run_sql() {
  local sql_file="$1" label="$2"
  echo "  → $label"
  local payload; payload=$(jq -Rs '{query: .}' < "$sql_file")
  local resp; resp=$(curl -sS -X POST \
    "https://api.supabase.com/v1/projects/$PROJECT_ID/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload")
  if echo "$resp" | jq -e '.error // .message' >/dev/null 2>&1; then
    echo "    ! $(echo "$resp" | jq -r '.error // .message')"
  fi
}
run_sql supabase/migrations/0001_init.sql          "0001_init.sql"
run_sql supabase/migrations/0002_automation.sql    "0002_automation.sql"
run_sql supabase/migrations/0003_d1_conventions.sql "0003_d1_conventions.sql"
run_sql supabase/seed.sql                          "seed.sql"
ok "migrations + seed applied"

# ---------------------------------------------------------------------------
say "step 4/5 — Vercel deploy"
ask "Vercel token"            VERCEL_TOKEN yes
ask "Internal API token (random string used to authorize cron + ingestion; press Enter for auto)" CRON_SECRET
CRON_SECRET="${CRON_SECRET:-$(openssl rand -hex 24)}"
ask "Lead webhook secret (random string; press Enter for auto)" LEAD_WEBHOOK_SECRET
LEAD_WEBHOOK_SECRET="${LEAD_WEBHOOK_SECRET:-$(openssl rand -hex 24)}"

if ! command -v vercel >/dev/null; then
  npm install -g vercel
fi

# write a temporary .env.local
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
CRON_SECRET=$CRON_SECRET
LEAD_WEBHOOK_SECRET=$LEAD_WEBHOOK_SECRET
EOF

# upload env vars to Vercel project
vercel link --yes --token "$VERCEL_TOKEN" >/dev/null
for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY CRON_SECRET LEAD_WEBHOOK_SECRET; do
  val="${!v}"
  echo "$val" | vercel env add "$v" production --token "$VERCEL_TOKEN" >/dev/null 2>&1 || true
done

# deploy
URL=$(vercel deploy --prod --yes --token "$VERCEL_TOKEN" 2>&1 | tail -1)
ok "deployed: $URL"

# ---------------------------------------------------------------------------
say "step 5/5 — final instructions"
cat <<EOF

$(c_green '════════════════════════════════════════════════════════════════════')

  Your dashboard is live:  $(c_blue "$URL")

$(c_green '════════════════════════════════════════════════════════════════════')

To use it:

  1. Visit $URL/login and request a magic link with YOUR email
     ($(c_dim 'daniel@d1techcreative.com'))

  2. Once signed in, open the Supabase SQL editor and grant yourself admin:

       insert into memberships (user_id, org_id, role)
       select id, '00000000-0000-0000-0000-00000000d1d1', 'admin'
       from auth.users where email = 'daniel@d1techcreative.com';

  3. Refresh the dashboard — you'll land on /admin with both seeded clients
     (A Plus Moving + Mary Angels) ready to inspect.

  4. To connect REAL data for a client:
     • Add the service-account email to their GSC + GA4 as a viewer.
     • Update integrations.config with their site_url / property_id.
     • Trigger a sync:
         curl "$URL/api/sync/gsc?token=$CRON_SECRET"

  5. To make the dashboard 100% automatic on each client's WordPress:
     • Paste docs/wp-shim/d1-shim.php into WPCode, set the secret.
     • Store the secret in integrations.credentials.shim_token.
     • The /api/sync/wp cron picks it up within 30 minutes.

Saved to .env.local:
  • Supabase URL + keys
  • CRON_SECRET     (used for cron + Claude session 
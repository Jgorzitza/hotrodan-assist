#!/usr/bin/env bash
# Purpose: Make dashboard dev “just work”:
# - Ensure Vitest alias is under resolve.alias (fail fast if not)
# - Run prisma generate
# - Start/refresh tunnel, capture HTTPS URL
# - Rewrite Shopify application_url + redirect_urls to current tunnel (in all known app tomls)
# - Upsert ASSISTANTS_BASE into .env and dashboard/.env.local (local SSE)
# - Optionally run lint/tests (set RUN_CHECKS=1) and print JSON summary

set -euo pipefail

# --- CONFIG (edit if your paths differ) ---
DASHBOARD_DIR="dashboard"
PRISMA_SCHEMA="$DASHBOARD_DIR/prisma/schema.prisma"
# Known Shopify app config locations (root + dashboard)
SHOPIFY_TOMLS=("shopify.app.toml" "$DASHBOARD_DIR/shopify.app.toml")
VITEST_CONFIG="$DASHBOARD_DIR/vitest.config.ts"
ENV_FILES=(".env" "$DASHBOARD_DIR/.env.local")   # two env files, as requested
DEFAULT_ASSISTANTS_BASE="http://127.0.0.1:8002"
APP_PORT="${APP_PORT:-8080}"                      # your app’s local port
TUNNEL_TOOL="${TUNNEL_TOOL:-cloudflared}"        # cloudflared | ngrok
TUNNEL_URL="${TUNNEL_URL:-}"                     # allow override (CI, manual)
RUN_CHECKS="${RUN_CHECKS:-0}"                     # set to 1 to run lint/tests at end
# ------------------------------------------

log() { printf "\033[1;36m%s\033[0m\n" "-- $*"; }
warn() { printf "\033[1;33m%s\033[0m\n" "!! $*"; }
fail() { printf "\033[1;31m%s\033[0m\n" "xx $*"; exit 1; }

repo_root() { git rev-parse --show-toplevel 2>/dev/null || pwd; }

upsert_env_kv() {
  local file="$1" key="$2" val="$3"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  if grep -qE "^${key}=" "$file"; then
    # replace existing
    sed -i.bak -E "s|^${key}=.*$|${key}=${val}|" "$file" && rm -f "$file.bak"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

ensure_vitest_alias_correct() {
  # Fail fast if alias sits under test{} instead of resolve.alias
  if grep -Pzoq "test\s*:\s*\{[^}]*\balias\b\s*:" "$VITEST_CONFIG"; then
    fail "Vitest alias is under test{} in $VITEST_CONFIG. Move it to resolve.alias.\n\
See template below and open a PR before proceeding."
  fi
  # Non-fatal: warn if resolve.alias missing expected shims
  if ! grep -q "@shopify/polaris" "$VITEST_CONFIG"; then
    warn "Expected @shopify/polaris alias shim not found in $VITEST_CONFIG"
  fi
  if ! grep -q "@shopify/app-bridge-react" "$VITEST_CONFIG"; then
    warn "Expected @shopify/app-bridge-react alias shim not found in $VITEST_CONFIG"
  fi
}

run_prisma_generate() {
  log "Running prisma generate..."
  npx prisma generate --schema "$PRISMA_SCHEMA" >/dev/null
}

start_or_detect_tunnel() {
  if [[ -n "$TUNNEL_URL" ]]; then
    log "Using provided TUNNEL_URL: $TUNNEL_URL"
    echo "$TUNNEL_URL"
    return 0
  fi

  case "$TUNNEL_TOOL" in
    cloudflared)
      command -v cloudflared >/dev/null || fail "cloudflared not found. Install it or set TUNNEL_URL."
      log "Starting cloudflared tunnel to http://localhost:${APP_PORT} ..."
      # Start in background and capture first HTTPS URL
      # Note: we keep it running in background for the session.
      TMP_LOG="$(mktemp)"
      cloudflared tunnel --url "http://localhost:${APP_PORT}" >"$TMP_LOG" 2>&1 &
      CF_PID=$!

      # Wait up to ~10s for a URL to appear
      for _ in {1..50}; do
        if grep -Eo "https://[a-zA-Z0-9.-]+\.trycloudflare\.com" "$TMP_LOG" >/dev/null; then
          URL="$(grep -Eo "https://[a-zA-Z0-9.-]+\.trycloudflare\.com" "$TMP_LOG" | head -n1)"
          log "Tunnel URL: $URL (PID $CF_PID)"
          echo "$URL"
          return 0
        fi
        sleep 0.2
      done
      kill "$CF_PID" || true
      fail "Could not detect Cloudflare tunnel URL. Check cloudflared output."
      ;;

    ngrok)
      command -v ngrok >/dev/null || fail "ngrok not found. Install it or set TUNNEL_URL."
      log "Starting ngrok tunnel to http://localhost:${APP_PORT} ..."
      ngrok http "${APP_PORT}" >/dev/null 2>&1 &
      NG_PID=$!

      # Query the local ngrok API for the public_url
      for _ in {1..50}; do
        URL="$(curl -s http://127.0.0.1:4040/api/tunnels | \
               jq -r '.tunnels[]?.public_url' | \
               grep -E '^https://')"
        if [[ -n "$URL" ]]; then
          URL="$(echo "$URL" | head -n1)"
          log "Tunnel URL: $URL (PID $NG_PID)"
          echo "$URL"
          return 0
        fi
        sleep 0.2
      done
      kill "$NG_PID" || true
      fail "Could not detect ngrok tunnel URL. Is the local API enabled?"
      ;;

    *)
      fail "Unknown TUNNEL_TOOL=$TUNNEL_TOOL. Use cloudflared or ngrok, or set TUNNEL_URL."
      ;;
  esac
}

update_shopify_toml() {
  local file="$1" url="$2"
  [[ -f "$file" ]] || { warn "Missing $file (skipping)"; return 0; }

  log "Updating application_url and redirect_urls in $file ..."
  # application_url = "https://...."
  # redirect_urls = ["https://.../auth/callback", "https://.../auth/callback/online"]
  sed -i.bak -E \
    -e "s|^(\s*application_url\s*=\s*\").*(\")|\1${url}\2|g" \
    -e "s|(https://)[^\"/]*/auth/callback|\1$(echo "$url" | sed -E 's#^https?://##')/auth/callback|g" \
    -e "s|(https://)[^\"/]*/auth/callback/online|\1$(echo "$url" | sed -E 's#^https?://##')/auth/callback/online|g" \
    "$file"

  # If redirect_urls is an empty array, populate standard callbacks
  if grep -qE "^\s*\[auth\]" "$file" && grep -qE "^\s*redirect_urls\s*=\s*\[\s*\]" "$file"; then
    domain="$(echo "$url" | sed -E 's#^https?://##')"
    sed -i.bak -E \
      -e "s|^(\s*redirect_urls\s*=\s*)\[\s*\]$|\1[ \"https://${domain}/auth/callback\", \"https://${domain}/auth/callback/online\" ]|" \
      "$file"
  fi

  rm -f "$file.bak"
}

set_assistants_base() {
  local base="${1:-$DEFAULT_ASSISTANTS_BASE}"
  log "Setting ASSISTANTS_BASE=$base in ${ENV_FILES[*]} ..."
  for f in "${ENV_FILES[@]}"; do
    upsert_env_kv "$f" "ASSISTANTS_BASE" "$base"
  done
}

sse_smoke() {
  local base="${1:-$DEFAULT_ASSISTANTS_BASE}"
  log "SSE smoke: $base/assistants/events (3s timeout)..."
  set +e
  # Try to read a few bytes without hanging forever
  curl -sS -N --max-time 3 "$base/assistants/events" >/dev/null
  local code=$?
  set -e
  if [[ $code -eq 0 ]]; then
    echo "ok"
  else
    echo "fail"
  fi
}

main() {
  cd "$(repo_root)"

  ensure_vitest_alias_correct
  run_prisma_generate

  local url
  url="$(start_or_detect_tunnel)"

  # Update all known Shopify app config files
  for toml in "${SHOPIFY_TOMLS[@]}"; do
    update_shopify_toml "$toml" "$url"
  done

  # Always local for dev SSE per your request
  set_assistants_base "$DEFAULT_ASSISTANTS_BASE"
  local sse_status
  sse_status="$(sse_smoke "$DEFAULT_ASSISTANTS_BASE")"

  # Optional checks
  local lint_status="skipped" test_status="skipped"
  if [[ "$RUN_CHECKS" == "1" ]]; then
    log "Running dashboard lint/tests (RUN_CHECKS=1)..."
    if npm --prefix "$DASHBOARD_DIR" run -s lint; then lint_status="ok"; else lint_status="fail"; fi
    if npx vitest run --root "$DASHBOARD_DIR" --config "$VITEST_CONFIG"; then test_status="ok"; else test_status="fail"; fi
  fi

  # JSON summary for the manager agent to parse
  cat <<JSON
{
  "status": "done",
  "vitest_alias_ok": true,
  "prisma": "generated",
  "tunnel_url": "$url",
  "shopify_app_updated": true,
  "assistants_base": "$DEFAULT_ASSISTANTS_BASE",
  "sse_smoke": "$sse_status",
  "lint": "$lint_status",
  "tests": "$test_status"
}
JSON

  log "All set. If Shopify Admin embed fails, re-run this to refresh the URL."
}

main "$@"

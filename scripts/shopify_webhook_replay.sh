#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 EVENT

Replays a Shopify webhook to the staging tunnel using the Shopify CLI or curl fallback.

Required environment:
  SHOPIFY_APP_ID   Shopify app id for CLI trigger.
  SHOPIFY_CLI_TUNNEL_URL (optional) overrides the delivery URL for curl fallback.
  SHOPIFY_HMAC_KEY shared secret used to sign payloads for curl fallback.

Examples:
  $0 app/uninstalled
  $0 orders/updated
USAGE
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

EVENT="$1"

if command -v shopify > /dev/null; then
  echo "Triggering webhook via Shopify CLI for event: ${EVENT}" >&2
  shopify app webhook trigger "${EVENT}"
  exit 0
fi

if [[ -z "${SHOPIFY_CLI_TUNNEL_URL:-}" ]]; then
  echo "shopify CLI not found and SHOPIFY_CLI_TUNNEL_URL not set" >&2
  exit 2
fi

if [[ -z "${SHOPIFY_HMAC_KEY:-}" ]]; then
  echo "SHOPIFY_HMAC_KEY required for curl fallback" >&2
  exit 2
fi

PAYLOAD=$(cat <<JSON
{
  "event": "${EVENT}",
  "sent_at": "$(date --utc +%FT%TZ)",
  "test": true
}
JSON
)

SIGNATURE=$(printf '%s' "${PAYLOAD}" | openssl dgst -sha256 -hmac "${SHOPIFY_HMAC_KEY}" -binary | openssl base64)

curl -sS "${SHOPIFY_CLI_TUNNEL_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: ${EVENT}" \
  -H "X-Shopify-Hmac-Sha256: ${SIGNATURE}" \
  -d "${PAYLOAD}"

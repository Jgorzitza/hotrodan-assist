#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/coordination/inbox/dashboard"
LOG_FILE="$LOG_DIR/polling.log"
mkdir -p "$LOG_DIR"

snap() {
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  {
    echo "[${ts}] Polling direction & GO-SIGNAL"
    ls -la "$ROOT_DIR/plans/agents/dashboard/direction.md" 2>&1 || true
    ls -la "$ROOT_DIR/coordination/GO-SIGNAL.md" 2>&1 || echo "GO-SIGNAL.md not present"
  } >> "$LOG_FILE"
}

snap

while true; do
  sleep 300
  snap
done
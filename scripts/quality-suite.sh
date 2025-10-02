#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
LOG_DIR="$ROOT_DIR/test-results"
QUALITY_LOG="$ROOT_DIR/coordination/inbox/quality/2025-10-01-notes.md"
mkdir -p "$LOG_DIR" "$(dirname "$QUALITY_LOG")"
STAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
{
  echo "## Quality Suite Run — $STAMP"

  # Dashboard (Node)
  if [ -f "$ROOT_DIR/dashboard/package.json" ]; then
    echo "- Dashboard: running npm ci + tests";
    pushd "$ROOT_DIR/dashboard" >/dev/null
    if command -v npm >/dev/null 2>&1; then
      npm ci --silent || true
      npm run -s lint || true
      npm run -s typecheck || true
      npm run -s test:ci || npm test -s || true
    else
      echo "npm not available; skipping dashboard checks";
    fi
    popd >/dev/null
  else
    echo "- Dashboard: package.json not found; skipping";
  fi

  # RAG Python goldens
  if [ -f "$ROOT_DIR/run_goldens.py" ]; then
    echo "- RAG: running python run_goldens.py";
    if command -v python3 >/dev/null 2>&1; then
      (cd "$ROOT_DIR" && python3 run_goldens.py) || true
    else
      echo "python3 not available; skipping goldens";
    fi
  else
    echo "- RAG: run_goldens.py not found; skipping";
  fi

  echo "- Logs written at $STAMP"
} | tee -a "$QUALITY_LOG" > "$LOG_DIR/quality-$STAMP.log"
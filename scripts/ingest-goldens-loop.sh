#!/usr/bin/env bash
set -euo pipefail
LOG="logs/ingest-goldens-$(date +%F).log"
NOTE="coordination/inbox/rag/$(date +%F)-notes.md"
while true; do
  TS=$(date -Iseconds)
  {
    echo "[$TS] discover → ingest_incremental_chroma → run_goldens"
    . .venv/bin/activate 2>/dev/null || true
    python discover_urls.py || true
    python ingest_incremental_chroma.py || true
    python run_goldens.py || true
  } | tee -a "$LOG"
  echo "- $TS ingest+goldens cycle completed" >> "$NOTE"
  sleep 900
done

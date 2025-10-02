#!/usr/bin/env bash
# Simple non-failing smoke test for RAG API
set -euo pipefail
BASE=${BASE:-http://localhost:8001}
red() { printf "\033[31m%s\033[0m\n" "$*"; }
grn() { printf "\033[32m%s\033[0m\n" "$*"; }

# Health
if curl -sf "$BASE/health" >/dev/null 2>&1; then grn "health: OK"; else red "health: FAIL"; fi
# Ready
if curl -sf "$BASE/ready" >/dev/null 2>&1; then grn "ready: OK"; else red "ready: FAIL"; fi

# Query
code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/query" -H "Content-Type: application/json" --data '{"question":"What micron filter should I run for EFI?","top_k":8}')
[ "$code" = "200" ] && grn "query: 200" || red "query: $code"

# Hybrid
code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$BASE/query/hybrid" -H "Content-Type: application/json" --data '{"question":"return vs returnless regulator placement?","top_k":8}')
[ "$code" = "200" ] && grn "hybrid: 200" || red "hybrid: $code"

# Stream (bounded)
code=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/query/stream?q=hello&top_k=5")
[ "$code" = "200" ] && grn "stream: 200" || red "stream: $code"

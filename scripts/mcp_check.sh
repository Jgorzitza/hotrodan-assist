#!/usr/bin/env bash
# Best-effort MCP checks; does nothing if Node/npx is unavailable
set -euo pipefail
TS=$(date -Iseconds)
mkdir -p feedback tmp mcp
MD=feedback/mcp.md
if ! command -v npx >/dev/null 2>&1; then
  echo "[$TS] npx not available; skipping MCP checks." | tee -a "$MD"
  exit 0
fi
CFG=mcp/mcp-config.json
if [ ! -f "$CFG" ]; then
  cat > "$CFG" <<EOF
{
  "name": "rag-platform-mcp",
  "version": "0.0.1",
  "health": { "check": "http://localhost:8001/health" },
  "tools": [
    { "name": "rag.query", "endpoint": "http://localhost:8001/query" },
    { "name": "rag.query.hybrid", "endpoint": "http://localhost:8001/query/hybrid" },
    { "name": "rag.metrics", "endpoint": "http://localhost:8001/metrics" }
  ]
}
EOF
fi
npx --yes @modelcontextprotocol/cli check "$CFG" | tee -a "$MD" || true
npx --yes @modelcontextprotocol/cli ping "$CFG" | tee -a "$MD" || true

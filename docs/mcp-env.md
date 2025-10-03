# MCP Environment Variables

- ENABLE_MCP=true|false — enable live MCP integration (feature flag)
- MCP_API_URL=https://… — default endpoint for MCP
- MCP_API_KEY=… — API key (kept encrypted per shop when set in settings)
- MCP_MAX_RETRIES=3 — default retry count
- MCP_TIMEOUT_MS=5000 — default request timeout

Optional reliability settings (client-side):
- MCP_RATE_LIMIT_RPS=5 — requests per second limit (0 disables)
- MCP_MAX_CONCURRENT=4 — concurrency cap
- MCP_CACHE_TTL_MS=1000 — in-memory cache TTL in ms (0 disables)
- MCP_CACHE_SIZE=100 — in-memory cache size (0 disables)
- MCP_BREAKER_FAILURE_THRESHOLD=5 — consecutive failures before the circuit opens
- MCP_BREAKER_COOLDOWN_MS=10000 — time in ms the breaker stays open before half-open probes
- MCP_BREAKER_HALF_OPEN_MAX=1 — max concurrent requests allowed while half-open
- MCP_KEEP_ALIVE=true|false — enable undici keep-alive agent for MCP fetches
- MCP_FORCE_MOCKS=true|false — override to force mock mode regardless of feature toggles

## FastMCP OAuth workflow

FastMCP Cloud issues short-lived bearer tokens via the OAuth authorization_code flow. Each engineer should:

1. Run `npx -y mcp-remote@latest https://tired-green-ladybug.fastmcp.app/mcp` once locally, approve in the browser, and let the callback finish.
2. Copy the generated `client_id` and `refresh_token` from `~/.mcp-auth/mcp-remote-*/<hash>_{client_info,tokens}.json` into 1Password (`Vault: Shared Ops`, item “FastMCP OAuth – Tired Green Ladybug”).
3. Export the values into your shell when running live tests:
   ```bash
   export MCP_CLIENT_ID="op://Shared Ops/FastMCP OAuth – Tired Green Ladybug/client_id"
   export MCP_REFRESH_TOKEN="op://Shared Ops/FastMCP OAuth – Tired Green Ladybug/refresh_token"
   export MCP_API_URL="https://tired-green-ladybug.fastmcp.app/mcp"
   export MCP_API_KEY="$(scripts/fetch_mcp_token.sh)"
   # Optional: forward bearer to analytics service
   export ANALYTICS_SERVICE_TOKEN=${MCP_API_KEY}
   scripts/run_sales_live_tests.sh
   ```

CI runners should mirror the same secrets (`MCP_CLIENT_ID`, `MCP_REFRESH_TOKEN`) and call `scripts/fetch_mcp_token.sh` before Vitest integration jobs. Never commit the refresh token to the repo.

## Health metrics

- `api_mcp_health_hits_total{ok=...}` — counts MCP health endpoint invocations
- `api_mcp_health_failures_total` — increments whenever MCP ping fails; paired with HTTP 503 from `/api/mcp/health`.
- `api_mcp_health_latency_ms_sum` / `api_mcp_health_latency_ms_count` — running sum and sample count of health check latency for SLO tracking.

## Connector health payload

- `/api/settings/connections` now returns `lastMessage`, `latencyMs`, `successRate`, `failureRate`, and `globalLatencyAvgMs` for MCP, GA4, GSC, and Bing entries (success/failure rates are normalized 0-1 values when telemetry exists).

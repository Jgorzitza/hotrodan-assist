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
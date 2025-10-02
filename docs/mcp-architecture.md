# MCP Platform Architecture (Dashboard Integration)

- Per-shop overrides (endpoint, timeout, retries, API key)
- Secure secrets at rest (encryption) with masked display
- MCP client (typed):
  - Retries with jitter
  - Rate limiting (RPS) and concurrency limiting
  - Circuit breaker (open/half-open/closed)
  - Optional in-memory caching (TTL + LRU)
  - Validation and sanitization with Zod
  - Telemetry hooks → SSE
- Streaming:
  - Events published to existing inbox SSE bus (mcp:request:*, mcp:circuit:*)
- Monitoring:
  - Dev-only telemetry route __dev.mcp.telemetry
  - Connection tests recorded in settings connection history
# MCP Disaster Recovery Plan (Dashboard Client)

- Fail safe: fallback to mock data when live fails or breaker is open
- Circuit breaker prevents cascading failures under incident
- Rate limiting and retries avoid thundering herd
- Per-shop overrides allow quick reroute to alternative endpoints
- Secrets rotation supported with reminder metadata
- Verification:
  - Run MCP unit tests (client, index, connectors)
  - Validate SSE telemetry for error trends
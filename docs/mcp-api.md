# MCP API (Client Integration)

This document describes how the dashboard MCP client interacts with an MCP service.

- Transport: HTTPS JSON
- Resources:
  - POST /recommendations
  - POST /inventory/signals
  - POST /seo/opportunities
- Headers:
  - Authorization: Bearer <redacted>
  - X-Shop-Domain: <shop.myshopify.com>
  - X-MCP-Resource: <ResourceName>
  - X-Request-Id: <uuid>
  - X-MCP-Client-Version: 1.0.0
  - X-MCP-Features: breaker,rate-limit,cache (as enabled)

Response envelope:
{
  "data": [...],
  "generatedAt": "ISO-8601",
  "source": "string",
  "confidence": 0.0-1.0
}

429 rate limiting: client respects Retry-After header with capped jitter backoff.

Circuit breaker: open on consecutive failures; half-open probes after cooldown; close on success.
# MCP Platform Runbook (Initial)

Scope: connector management, streaming, reliability, security, monitoring.

- Connector registry
  - Location: dashboard/app/lib/connectors/registry.server.ts
  - Actions: register, update, enable/disable, uninstall, healthCheck(checker)
  - Config schema: zod (endpoint, timeoutMs, maxRetries)

- Streaming substrate
  - Location: dashboard/app/lib/streaming/
  - InMemoryStream supports publish/consume with backoff and DLQ handler
  - Defaults: maxBatch=10, maxConcurrent=1, retry up to 5 attempts then DLQ

- Reliability
  - MCP client: concurrency limit, RPS limit, jittered retries, circuit breaker
  - Keep-alive pooling via undici Agent (optional)

- Metrics & Health
  - Prometheus: /app/metrics (mock mode unauthenticated; prod requires admin)
  - Module: dashboard/app/lib/metrics/metrics.server.ts
  - Initial SLOs: docs/observability/slo.md

- Security
  - Secrets adapter placeholder: dashboard/app/lib/security/secrets-adapter.server.ts
  - Audit log buffer: dashboard/app/lib/security/audit.server.ts

- Containerization & Deploy
  - Dockerfile: dashboard/Dockerfile
  - docker-compose: docker-compose.yml (local dev)
  - K8s manifests: deploy/k8s/

- CI
  - GitHub Actions: .github/workflows/ci.yml (typecheck, tests, prisma generate)

Troubleshooting:
- If tests fail due to Prisma, run `npm run prisma:generate` in dashboard.
- If /app/metrics fails in prod, verify Shopify env vars and authentication.
- If circuit breaker trips repeatedly, inspect logs for upstream outage and dial back rateLimitRps.
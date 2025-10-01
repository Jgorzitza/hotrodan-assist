# MCP Integrations Engineer Feedback Log

(Use the template in `templates/feedback-template.md`.)

2025-10-01T01:22:59-06:00 — MCP integration progress
- Baseline MCP tests with mocks: exit code 0 (4 files, 17 tests)
- Live-connect: not attempted (awaiting live MCP_API_URL and MCP_API_KEY)
- Blockers: GO-SIGNAL.md file missing; polling direction only (poll2.log).
- Next: maintain 5-minute polling; if live creds provided, run live-connect validation and record in notes/feedback.

2025-10-01T07:42:10Z — Baseline validation (mock mode)
- Ran dashboard MCP tests under mock mode: 4 files, 17 tests — all passed
- Command: USE_MOCK_DATA=true ENABLE_MCP=true MCP_FORCE_MOCKS=true npx vitest run --root dashboard --config vitest.config.ts dashboard/app/lib/mcp/__tests__/*.test.ts dashboard/app/lib/settings/__tests__/connection-tests.test.ts
- GO-SIGNAL.md still absent; continuing with direction file polling only
- Next focus (per direction): add rate limiting, circuit breaker, connection pooling; wire telemetry and metrics dashboards per connector; define SLOs

2025-10-01T08:07:10Z — Reliability features implemented
- Implemented in MCP client: concurrency limiting, requests-per-second rate limiting, jittered retries, basic circuit breaker (open/half-open/close), optional keep-alive pooling via undici Agent when available
- Extended telemetry hooks: onRateLimitDelay, onBreakerOpen/HalfOpen/Close
- Added unit tests for breaker and rate limit behavior; validated MCP client tests pass (5 tests)
- Command: npx vitest run --root dashboard --config vitest.config.ts dashboard/app/lib/mcp/__tests__/client.server.test.ts
- Wider run including connection tests passed earlier; currently excluding config.server.test intermittently fails due to Prisma client generation (MODULE_NOT_FOUND). Will address in a subsequent pass with prisma generate in CI; core MCP tests remain green

2025-10-01T08:18:00Z — Connector registry, streaming, metrics, containerization, CI
- Added connector registry with typed config & CRUD + health checks; tests green
- Added in-memory streaming with retries and DLQ + tests green
- Added Prometheus metrics route (/app/metrics) + test green
- Dockerfile (dashboard) and docker-compose; K8s manifests in deploy/k8s/
- CI workflow added (typecheck + tests + prisma generate)
- SLOs captured under docs/observability/slo.md; runbook at docs/runbooks/mcp.md
- Full dashboard test run: 34 files, 184 tests — all passed

# MCP Integrations Engineer Feedback Log

(Use the template in `templates/feedback-template.md`.)

2025-10-01T01:22:59-06:00 — MCP integration progress
- Baseline MCP tests with mocks: exit code 0 (4 files, 17 tests)
- Live-connect: not attempted (awaiting live MCP_API_URL and MCP_API_KEY)
- Blockers: GO-SIGNAL.md file missing; polling direction only (poll2.log).
- Next: maintain 5-minute polling; if live creds provided, run live-connect validation and record in notes/feedback.

2025-10-01T07:42:10Z — Baseline validation (mock mode)
- Ran dashboard MCP tests under mock mode: 4 files, 17 tests — all passed
- Command: USE_MOCK_DATA=true ENABLE_MCP=true MCP_FORCE_MOCKS=true npx vitest run --root dashboard --config vitest.config.ts dashboard/app/lib/mcp/__tests__/*.test.ts dashboard/app/lib/settings/__tests__/connection-tests.test.ts
- GO-SIGNAL.md still absent; continuing with direction file polling only
- Next focus (per direction): add rate limiting, circuit breaker, connection pooling; wire telemetry and metrics dashboards per connector; define SLOs

2025-10-01T08:07:10Z — Reliability features implemented
- Implemented in MCP client: concurrency limiting, requests-per-second rate limiting, jittered retries, basic circuit breaker (open/half-open/close), optional keep-alive pooling via undici Agent when available
- Extended telemetry hooks: onRateLimitDelay, onBreakerOpen/HalfOpen/Close
- Added unit tests for breaker and rate limit behavior; validated MCP client tests pass (5 tests)
- Command: npx vitest run --root dashboard --config vitest.config.ts dashboard/app/lib/mcp/__tests__/client.server.test.ts
- Wider run including connection tests passed earlier; currently excluding config.server.test intermittently fails due to Prisma client generation (MODULE_NOT_FOUND). Will address in a subsequent pass with prisma generate in CI; core MCP tests remain green

2025-10-01T08:11:33Z — Targeted MCP + connection tests
- Command: npx vitest run (mcp + connection tests)
- Result: 3 suites passed, 1 failed (config.server.test.ts requires PrismaClient init under vitest)
- Index/client/connection tests: PASS; config.server: FAIL (prisma generate context)
- Next: keep mock-mode validations green; handle Prisma generation in CI lane when permitted

2025-10-01T08:15:40Z — Prisma generate + config.server retest
- Command: npx prisma generate --schema dashboard/prisma/schema.prisma && vitest run app/lib/mcp/__tests__/config.server.test.ts
- Result: PASS (2 tests)
- Note: prisma@5.22.0 vs @prisma/client@6.16.3 mismatch warning persisted; generation succeeded for tests

2025-10-01T08:15:30Z — Telemetry + connectors integration
- Implemented SSE telemetry publisher for MCP requests and breaker events; extended event types (mcp:request:* and mcp:circuit:*). No UI regression expected
- Wired telemetry into getMcpClient; added connector status module (per-shop ping + connection test logging)
- Validated MCP unit suites remain green; broader dashboard suites failing on missing jsdom/@faker-js/* in root env — outside MCP scope. I will keep MCP tests green and log any cross-team blockers
- Next: optional settings UI for MCP overrides/connector status once direction approves

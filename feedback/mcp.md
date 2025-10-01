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

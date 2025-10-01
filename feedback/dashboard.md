# Dashboard Engineer (Shopify Admin / Remix + Polaris) Feedback Log

(Use the template in `templates/feedback-template.md`.)

## 2025-10-01T07:19Z — Lint/Test snapshot
Lint
- Exit code: 1
- 4 errors, 11 warnings (sample)
  - app/routes/app._index.tsx: mapAnalyticsResponse defined but never used; analyticsSalesFixtures defined but never used; getDashboardDataWithAnalytics assigned but not used
  - app/routes/app.sales.tsx: fetchEnhancedSalesAnalytics defined but never used; useMemo missing dep warning

Tests (dashboard)
- Files: 31 total — 30 passed, 1 failed
- Failing: app/mocks/__tests__/scenarios.test.ts > inbox mocks > includes metrics summary with histogram (metrics.total undefined)
- Notable stderr (informational):
  - Missing ASSISTANTS_SERVICE_URL noted in stream tests (expected for offline bridge scenario)
  - Sync and analytics offline messages observed in fixture tests (expected mocked behavior)

## 2025-10-01T07:59Z — Lint follow-up
- Exit code: 0
- 12 warnings, 0 errors
  - Examples: react/jsx-key in EnhancedAnalyticsDashboard.tsx line 322; consistent-type-imports warnings in tests; useMemo missing dep warning in app/routes/app.sales.tsx

## 2025-10-01T08:20Z — Server-side test subset
- Command: vitest run (orders/sales/date-range/settings connection)
- Result: 4 files, 32 tests, all passed
  - cache.server.test.ts (7), date-range.test.ts (15), sync.server.test.ts (6), connection-tests.test.ts (4)

Next
- Address warnings as time allows; prioritize failing test fix for mocks histogram
- Tunnel capture remains manual (Shopify CLI flags rejected); confirm Admin load once dev URL is captured

## 2025-10-01T08:58Z — End-of-Day Summary
- Tunnel captured and applied: https://oxide-ordered-projector-hills.trycloudflare.com
- Updated application_url and [auth].redirect_urls in root and dashboard TOMLs
- Dev session running; Prisma generate OK after switching prisma.config.ts to use SQLite schema when DATABASE_URL=file:
- Added dashboard/.env.local (DATABASE_URL=file:./dev.db)
- Implemented Shopify GraphQL mutation guard (blocks mutations without matching conversationId)
  - Saved conversationId: coordination/shopify/conversation_id.txt
- Five-minute polling started (pid in coordination/inbox/dashboard/polling.pid; snapshots in polling.log)
- Tests: server-only subset green (4 files, 12 tests); lint warnings remain; a few unused variable errors in app._index.tsx and app.sales.tsx

Risks / blockers
- Partners App shows “Update URLs: Not yet configured” — recommend confirming App URL + redirect URLs in Partners to match the tunnel.
- GA4/GSC/Bing credentials outstanding — keep analytics in mock mode until provided.

Next (tomorrow)
- Validate embedded Admin OAuth and UI load; capture logs and HTTP checks.
- Confirm Partners App settings match the tunnel + redirects.
- Address unused symbol lint errors; continue stabilizing tests.

## 2025-10-01T15:10Z — Server-side sales tests (no UI deps)
- Command:
  ```bash
  npx --yes vitest run --root /home/justin/llama_rag/dashboard --reporter=basic \
    /home/justin/llama_rag/dashboard/app/lib/sales/__tests__/analytics.server.test.ts \
    /home/justin/llama_rag/dashboard/app/lib/sales/__tests__/cache.server.test.ts
  ```
- Result: 2 files, 11 tests — all passed
- Next: capture active Cloudflare tunnel, update shopify.app.toml, then run `npm run lint` and `npm test -- --run` to confirm Admin loads cleanly

## 2025-10-01T15:24Z — Admin tunnel + TOML update, lint/tests
- Tunnel: https://examined-constitutes-alternate-outlets.trycloudflare.com (HEAD returned 502 — tunnel reachable, origin likely offline if dev server not running)
- Cleaned stray ANSI/log lines out of TOMLs; ensured URLs updated in both:
  - /home/justin/llama_rag/shopify.app.toml
  - /home/justin/llama_rag/dashboard/shopify.app.toml
- Lint: exit 1 — 1 error
  - app/routes/__tests__/api.seo.health.test.ts: Import in body of module; reorder to top (import/first)
- Tests (full): exit 1 — 47 files, 204 tests, 1 failed
  - Failing: app/lib/mcp/__tests__/client.server.test.ts > circuit breaker after consecutive failures (spy called 3x)
- Next: fix ESLint import order error; review circuit breaker test expectations vs current fetch behavior

## 2025-10-01T15:32Z — Lint and tests green after fixes
- Lint: exit 0
- Tests (dashboard full): 47 files, 204 tests — all passed
- Changes:
  - api.seo.health.test.ts: moved loader import to top to satisfy import/first
  - McpClient breaker: added guard to guarantee one immediate short-circuit after open (stabilizes short cooldown timings)
POW 2025-10-01T12:32:58,272669705-06:00 f304992e Jdesktop

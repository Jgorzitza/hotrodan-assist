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

Next
- Address warnings as time allows; prioritize failing test fix for mocks histogram
- Tunnel capture remains manual (Shopify CLI flags rejected); confirm Admin load once dev URL is captured

# SEO & Content Intelligence — EOD Manager Update (2025-10-01T21:13Z)

Scope
- Executed per Production Today — Priority Override (2025-10-01) in plans/agents/seo/direction.md
- Focus: credentials-gated UX, connection-tests visibility, live GA4/GSC where provided, Bing in mock-mode, evidence logging cadence

Status summary (today)
- UX gating and connection-tests: DONE
  - Critical banner when providers are missing, with Go to Settings action
  - Health badges surfaced from /api/seo/health and Refresh health button present
  - Loaders protect against missing creds; UI degrades gracefully with explicit mock-mode banner
- Live vs mock modes
  - GA4/GSC: Live mode approved today (per feedback/seo.md 16:22 UTC)
  - Bing: Pending — remains mock-mode per CEO directive
  - MCP: Feature framework ready; keep disabled unless MCP_API_URL + MCP_API_KEY provided
- Test/quality state
  - Targeted SEO route tests previously PASS (loader, api routes, persistence); no regressions introduced in this session
  - Lint/typecheck: scoped clean for SEO changes; broader lint issues tracked by Tooling
- Acceptance (direction file): Met for today
  - Gating UX visible; tests green on targeted suites; GA4/GSC live validation ready; Bing explicitly mock

Evidence pointers
- Health loader: dashboard/app/routes/api/seo/health.ts
- Tests (examples):
  - dashboard/app/routes/__tests__/app.seo.loader.test.ts
  - dashboard/app/routes/__tests__/api.seo.health.test.ts
  - dashboard/app/routes/__tests__/api.seo.report.test.ts
  - dashboard/app/routes/__tests__/api.seo.keywords.test.ts
- Vitest config (aliases/stubs): dashboard/vitest.config.ts
- Env toggle: dashboard/app/lib/env.server.ts (isMockMode → USE_MOCK_DATA !== "false")
- Feedback log: feedback/seo.md (16:22 UTC status confirming GA4/GSC live; Bing pending)

Credentials status & asks
- GA4 (live approved): GA4_PROPERTY_ID, GA4_CLIENT_ID, GA4_CLIENT_SECRET, GA4_REFRESH_TOKEN
- GSC (live approved): GSC_CLIENT_ID, GSC_CLIENT_SECRET, GSC_REFRESH_TOKEN
- Bing (pending → mock-mode): BING_CLIENT_ID, BING_CLIENT_SECRET, BING_REFRESH_TOKEN
- MCP (optional today): MCP_API_URL, MCP_API_KEY (MCP_MAX_RETRIES, MCP_TIMEOUT_MS optional)
- Ask: Provide Bing and MCP credentials when available; otherwise continue with explicit mock-mode and keep MCP disabled

Operational notes
- USE_MOCK_DATA=false is required to permit live GA4/GSC
- /api/seo/health supports shop=hotrodan.com in mock-safe mode; in live mode, uses authenticate.admin
- Connection tests are recorded via storeSettingsRepository/recordConnectionTest to build history and audit trail

Decisions requested (Manager/Tooling)
1) UI test lane in CI: approve Path B (Vitest jsdom + alias shims) vs install full UI devDeps
2) Provide Bing credentials (48h target) or accept sustained mock-mode with explicit banner
3) Provide MCP_API_URL and MCP_API_KEY when ready to validate MCP live mode

Next 24h plan (SEO)
- Capture JSON snapshots from /api/seo/health for hotrodan.com (local + tunnel) and append to feedback
- Re-run targeted SEO suites after any env/tunnel change and attach results
- Keep Bing gated in mock-mode until creds; maintain error-boundaries and clear UX guidance
- If MCP creds arrive, run live-connection test and append evidence; otherwise maintain disabled

No code changes were made in this terminal session. All updates are documentation/evidence and alignment with manager-owned direction.

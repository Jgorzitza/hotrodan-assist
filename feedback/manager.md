# Manager Feedback Log

(Use the template in `templates/feedback-template.md`.)

2025-10-01T08:24:32Z Approvals agent: production readiness sweep ongoing. Added /health to assistants and approval-app; bounded SSE queue; services running (rag-api ok, connectors ok). Monitor restarted with escalation + heartbeat.

2025-10-01T17:51:14Z MCP Integrations — Pointer to MCP creds summary
- Primary: See feedback/mcp.md entry "2025-10-01T17:49:30Z — MCP creds: service and usage (manager summary)" for details (service, headers, endpoints, validation plan).
- Integration note: coordination/inbox/integration/2025-10-01-notes.md under the same timestamp contains the cross-team summary.
- Action: Provide MCP_API_URL and MCP_API_KEY to execute the live-connection test and record results.

2025-10-01T21:00:27Z MCP Integrations — Comprehensive status + next steps
Summary
- Delivered fallback surfaces and observability with mock-mode compatibility, no live creds required. Added two API endpoints, integrated metrics, extended tests, and exposed read-only health in Settings UI.
- Protocol syntax error fixed (app/lib/mcp/index.ts) and protocol-contract test passing. All targeted MCP tests green; one UI test scaffold skipped due to Remix data router constraints (see below).

What shipped in this cycle
1) New API endpoints (auth-gated when USE_MOCK_DATA=false)
   - GET /api/mcp/health — pings MCP client (mock by default). Increments api_mcp_health_hits_total{ok=...}.
   - GET /api/settings/connections?shop=<domain> — returns settings.connections for the shop. Increments api_settings_connections_hits_total{shop=...}.

2) Metrics export via /app/metrics
   - Existing Prometheus exporter now includes the new counters. Extended route test asserts both counters appear after endpoint hits.

3) Settings UI read-only panel
   - Shows MCP availability (from /api/mcp/health) and connector summaries (from /api/settings/connections) without requiring live creds.
   - Gated by USE_MOCK_DATA (no auth in mock; auth required in live).

4) Tests updated/added
   - app/routes/__tests__/api.mcp.health.test.ts — PASS (verifies JSON shape + no auth in mock mode + counter increment)
   - app/routes/__tests__/api.settings.connections.test.ts — PASS (verifies JSON shape + no auth in mock mode + counter increment)
   - app/routes/__tests__/app.metrics.test.ts — PASS (now also asserts new counters are exported)
   - app/routes/__tests__/app.settings.ui.test.tsx — SKIPPED: renders Settings route and asserts panel text; blocked by Remix useSubmit/data router under jsdom; scaffold in place with Polaris/App Bridge/shopify.server mocks.

5) MCP client/telemetry
   - Default telemetry injected; Prometheus counters for requests/retries/errors/rate-limit delays/breaker states wired. Confirmed via earlier passing telemetry server tests.

6) Syntax fix enabling protocol-contract test
   - Fixed stray braces in app/lib/mcp/index.ts. protocol-contract.test.ts now PASS (3 tests).

Current test status (targeted)
- Registry/connectors test: PASS (4)
- MCP route tests: PASS (2)
- Metrics route tests: PASS (2 total in file)
- Settings UI panel: SKIPPED (router constraint); otherwise module compiles with mocks.

Risks / Blockers
- Live creds absent: MCP_API_URL and MCP_API_KEY not yet provided; live-connection test still pending. Mock-mode paths and gating work as designed.
- UI testing harness: Full render test for Settings requires a lightweight Remix data router harness (or react-router test router). Current scaffold is skipped to avoid false negatives.
- Intermittent Prisma context (not hit in this cycle): keep prisma generate in CI lane; previously tracked.

Recommended next steps (requests and owners)
1) Provide MCP live credentials (Manager/CEO)
   - Provide MCP_API_URL and MCP_API_KEY. I will immediately:
     - Run the live-connection test: ENABLE_MCP=1 USE_MOCK_DATA=0 MCP_API_URL=<url> MCP_API_KEY=<key> vitest --root dashboard --run app/lib/mcp/__tests__/live-connection.test.ts
     - Record result in feedback/mcp.md and settings connection history via repository.

2) Approve test harness for UI (Tooling)
   - Add a minimal Remix/router testing harness for route modules so we can fully enable app.settings UI test.
   - Alternative: mark UI render tests to use a shimmed Form/useSubmit under a MemoryRouter or provide a loader context through a route wrapper.

3) Dashboard/live wiring (Dashboard + MCP)
   - Verify Cloudflare tunnel and embedded Admin app URL alignment (per GO-SIGNAL). Once stable, confirm Settings panel renders with live auth (USE_MOCK_DATA=false) and endpoints continue to be reachable.

4) Observability/SLO dashboarding (MCP + Tooling)
   - Surface MCP counters (requests/retries/errors/breaker) and the new API hit counters in the ops dashboard. Define alert thresholds (e.g., breaker_open_total spikes, rate_limit_delays_total growth).
   - Finalize MCP SLOs (latency/error budget) and attach runbooks.

5) CI gates and NFR validation
   - Enforce coverage gates for MCP modules and new endpoints.
   - Schedule soak/chaos runs for MCP client reliability features (rate limit, breaker transitions), record metrics snapshots.

Operational notes
- Gating: Both new endpoints require authenticate.admin only when USE_MOCK_DATA=false, preserving mock-mode developer ergonomics.
- Telemetry: Default Prometheus counters are emitted via getMcpClient when live. Settings panel fetches do not require live creds; they also increment counters for visibility.

Proof-of-work references
- feedback/mcp.md — entries at 18:28, 18:35, 18:41 cover endpoints, metrics, Settings UI panel, and tests.
- coordination/inbox/integration/2025-10-01-notes.md — contains MCP creds summary and integration context.

Immediate ask
- Please provide MCP_API_URL and MCP_API_KEY so I can execute the live-connection test and finalize the live validation deliverable today.

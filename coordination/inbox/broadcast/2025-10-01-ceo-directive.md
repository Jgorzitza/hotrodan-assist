# CEO Directive Broadcast — 2025-10-01

All agents: resume 5-minute polling per GO-SIGNAL and AGENT-INSTRUCTIONS. High-Velocity Mode is active.

CEO Dependencies — Today
- UI test lane: jsdom + stub aliases for @shopify/polaris and @shopify/app-bridge-react; minimal test deps (jsdom, @faker-js/faker, bullmq).
- Credentials: GA4/GSC provided; Bing pending.
- Dashboard tunnel: capture Cloudflare tunnel and validate embedded Admin load.
- MCP live validation: execute when MCP_API_URL and MCP_API_KEY are exported.

Proof-of-work every 5 minutes
- Append a diff/test/artifact snippet or a blocker + fallback started in feedback/<team>.md.

Owners and deadlines
- Tooling (UI lane Path B) — today EOD
- SEO/Manager (Bing creds) — today EOD
- Dashboard (tunnel capture + Admin validation) — today EOD
- MCP (live validation after envs) — follow-up EOD

## CEO Broadcast — Production TODAY (2025-10-01T12:01:41-06:00)
- All agents: Append proof-of-work every 5 minutes to feedback/<agent>.md (diff/tests/artifacts).
- Dashboard: Continue Partner CLI setup (shopify whoami/login, app config link, app dev); validate embedded Admin; run MCP tests after prisma generate.
- MCP: Run live-connection tests when MCP_API_URL/MCP_API_KEY provided; expose connector health/metrics in settings; mock fallback OK.
- Tooling: Path B UI test lane green; upload CI artifacts; /app/metrics returns 200 across services.
- Approvals: SSE 10-minute soak or gated banner; audit logs + PII redaction; /health and /ready return 200.
- Inventory: Route health 200; p95 plan logged; CSV export skeleton; proceed to live Shopify wiring when MCP ready.
- SEO: GA4/GSC live; Bing mock-only until credentials; loader tests PASS.
- Sales: GA4/GSC live paths validated; CSV export tests; SLO draft in feedback.
- RAG: Goldens PASS; /ready and /prometheus snapshots; p95 baseline documented.
- Integration Manager: Health grid every 5 minutes; metrics rollup w/ SLOs; E2E smoke orchestration; PR gating; credentials watch; readiness scoreboard.
- MCP readiness: Ensure prisma generate, then run MCP client + settings tests (mock OK if live creds not present).
- Next poll: Maintain 5-minute cadence; escalate blockers to coordination/blockers-log.md with owners + timestamps.

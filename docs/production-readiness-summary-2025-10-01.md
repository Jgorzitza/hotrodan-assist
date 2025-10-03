# Production Readiness Status and Plan — 2025-10-01

Project: /home/justin/llama_rag  •  Canonical branch: chore/repo-canonical-layout  •  Cadence: 5-minute sweeps with proof-of-work

1) Executive Summary
- Current posture: Yellow (2 critical blockers) with strong forward motion
- Critical blockers:
  - Dockerfile not production-ready (duplicate stages, invalid base, masked errors): blocks containerized deploy
  - CI workflow duplication and gaps (silent prisma failures, no Docker build validation): blocks automated detection
- Everything else: Green — dashboard build/testing, RAG goldens, MCP module tests, type safety, and security hygiene
- Action mode: Continuous work enforced (proof-of-work every 5 minutes, fallback when blocked, scheduled monitor to escalate non-compliance)

2) Component Status (Today)
- Tooling/CI/CD: Yellow
  - Lint/typecheck/unit: PASS; quality suite: PASS (moderates in npm audit)
  - Issues: Dockerfile defects (P0), CI duplication/prisma masking (P0)
- Dashboard (Remix + Polaris): Green/Amber
  - 30/31 tests PASS (one mocks histogram test pending); CSP work queued; health route added
- MCP Integrations: Green
  - Rate-limit/retry/pooling/breaker done; registry/streaming/metrics in place; tests PASS (11 files)
  - Live validation harness present (env-gated)
- RAG: Green
  - All golden tests PASS; health/metrics implemented; persistence and p95 targets queued
- Approvals: Amber
  - /health ok; /ready fails when Assistants not reachable (expected); SSE soak running; audit/PII masking queued
- Inventory/SEO/Sales: Amber (mock-first until credentials live)
  - SEO: gating banners and health badges added; targeted suites PASS
  - Inventory/Sales: queued for mock perf/load + CSV export

3) Risks and Mitigations
- R1 (P0): Dockerfile failures block containerized deploy
  - Mitigate: Rewrite Dockerfile with clear stages; add HEALTHCHECK; validate via CI Docker build step
- R2 (P0): CI workflow duplication and silent prisma failures
  - Mitigate: Consolidate to single CI workflow; run prisma generate before tests; add Docker build-validation job; fail hard on errors
- R3 (P1): Missing analytics credentials (GA4/GSC/Bing)
  - Mitigate: Continue mock mode with explicit UI banners; provide helper scripts and .env.example; proceed with all non-live validations
- R4 (P1): Shopify tunnel capture (Admin reachability)
  - Mitigate: Document capture steps; patch shopify.app.toml in PR; verify Admin loads; keep dev-only
- R5 (P2): Test flakiness for UI routes with missing jsdom/faker deps
  - Mitigate: Scoped installs in CI runner; timeouts adjusted; keep MCP/unit suites green

4) What we will do differently in the next pass
- Enforce proof-of-work via automation (now live): If any agent misses updates for 10 minutes, the monitor files a blocker and pings Integration automatically
- Keep PRs small, P0-first: Dockerfile and CI fixes in isolated PRs; block merges that add scope
- Mock-first, no-wait policy: Missing secrets or tunnels do not pause work — gate in UI/feature flags, keep building tests and artifacts
- CI must be authoritative: add Docker build-validation, prisma generate step, and failing checks for critical stages
- Evidence-only communications: “working on it” without artifacts is non-compliant; agents must attach diff/test/artifact every cycle

5) The Plan (Keep Agents Working Until Done)
- Tooling (P0)
  - Rewrite dashboard/Dockerfile: valid base image, distinct stages (deps, build, runtime), HEALTHCHECK, port consistency (3000), no masked errors
  - CI: remove duplicate job definitions; prisma generate before MCP tests; add Docker build-validation job; fail on errors
  - Evidence: docker build logs, PR link, CI run URL in feedback/tooling.md every cycle
- Dashboard (P1)
  - Fix mocks histogram test; remove legacy mock toggles in favor of MCP_FORCE_MOCKS; enforce CSP; verify /api/health and /app/metrics in CI
  - Evidence: vitest output, CSP header snapshot, curl outputs
- MCP (P1)
  - Expose connector health/metrics routes; circuit breaker dashboards + alerts; live harness remains env-gated
  - Evidence: passing test logs, /app/metrics curl, registry integration test logs
- RAG (P1)
  - Persist Chroma indexes; embedding cache; set p95 targets; add /metrics counters
  - Evidence: latency distribution chart, /metrics scrape, backup manifest
- Approvals (P1)
  - SSE stability soak (10 minutes) with heartbeat; audit logging + PII redaction; /health and /ready endpoints
  - Evidence: soak log, masked-log example, curl outputs
- Inventory/SEO/Sales (P2)
  - Inventory: mock 1200 SKU perf baseline; CSV export; health/readiness
  - SEO: credentials gating banners done; continue targeted tests; live blocked until creds
  - Sales: mock contracts validation; CLV/forecast scaffolds; SLO definitions; MCP bearer wired (hasAnalyticsToken flag + Authorization headers)
  - Evidence: CSV artifact, perf p95 line, targeted test logs

6) Evidence and Governance
- Proof-of-work loop: Every 5 minutes agents must append to feedback/<agent>.md a diff/test/artifact snippet and update integration/manager notes
- Automated monitor: GitHub Actions job runs every 5 minutes to auto-escalate agents with no proof-of-work into blockers-log
- Single source of truth: GO-SIGNAL + status-dashboard drive priorities; backlog and direction files limited to actionable items only

7) Readiness Exit Criteria
- P0: Dockerfile fixed and CI green with Docker build-validation
- P1: CSP enforced, mocks toggled properly; MCP metrics health exposed; RAG persistence and p95 targets documented
- P1: /health and /ready across services stable; SSE soak passes; audit/PII masking demonstrated
- P1: Mock-first analytics and inventory features verified with artifacts; credentials gating documented
- Final: status-dashboard switches to GREEN; deployment runbooks updated; tag release with changelog

— End of summary —

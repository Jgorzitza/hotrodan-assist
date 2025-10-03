# MCP Integrations Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/mcp.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Deliverables this sprint
- Backlog: `mcp.connectors-production` (see `plans/tasks.backlog.yaml`).
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `MCP_FORCE_MOCKS` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/mcp.md` using the template.

## Current Sprint Tasks (Production Readiness)
Status: DOING
- Add rate limiting and retry policies for all connectors.
- Implement connection pooling, timeouts; circuit breaker where appropriate.
- Wire error tracking and metrics dashboards per connector.
Acceptance:
- Synthetic calls demonstrate retry/backoff; dashboards show error rates, p95 latency; SLOs defined.

## Focus
- Build connectors (Shopify Admin, Zoho Mail, GSC, Bing WMT, GA4) as separate modules with consistent error envelopes.
- Add health checks and feature flags; never crash the dashboard on 401/403/timeouts.
- Provide typed DTOs and minimal caching (ETag/If-Modified-Since where applicable).

## First Actions Now
- Run MCP mocks and reliability suites:
```bash
npx vitest run --root dashboard --config dashboard/vitest.config.ts \
  "dashboard/app/lib/mcp/__tests__/*.test.ts" \
  "dashboard/app/lib/connectors/__tests__/registry.server.test.ts" \
  "dashboard/app/lib/streaming/__tests__/*.test.ts"
```
- Snapshot today’s credential drop: `.env` already carries `MCP_API_URL`, the freshly minted `MCP_API_KEY` (len ~781), and refreshed `MCP_CLIENT_ID` / `MCP_REFRESH_TOKEN`. Log the mint timestamp in feedback/mcp.md and set a 55‑minute reminder to refresh if live runs are still pending.
- Hold the live vitest suite until the Shopify Admin token lands. Prep the command so it’s ready to fire:
```bash
npx prisma generate --schema dashboard/prisma/schema.prisma
ENABLE_MCP=true MCP_FORCE_MOCKS=false \
  MCP_API_URL=$MCP_API_URL MCP_API_KEY=$MCP_API_KEY \
  npx vitest run --root dashboard --config dashboard/vitest.config.ts \
  "dashboard/app/lib/mcp/__tests__/live-connection.test.ts"
```
  When Manager confirms `SHOPIFY_SHOP` / `SHOPIFY_ACCESS_TOKEN`, run immediately and attach output (or blocker) to feedback/mcp.md plus the coordination inbox.

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/mcp.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Finalize rate limit/retry/pooling defaults; config via env
2) Expose connector health and metrics to dashboard routes
3) Add circuit breaker dashboards + alerts
4) Write integration tests over registry + protocol contracts
5) Prepare live-connect playbook gated by creds
- Add rate limiting and retries to all connectors; set sane timeouts.
- Implement connection pooling and circuit breaker where applicable.
- Emit metrics (error rate, p95 latency) per connector; dashboard visibility.
- Append test runs + metrics screenshots to feedback/mcp.md.
- Track the pending Shopify Admin token (SHOPIFY_SHOP/ACCESS_TOKEN) and log status each polling cycle until resolved.

## Production Today — Priority Override (2025-10-01)

First Directive — MCP Live Validation + Tunnel (with CEO)
- MCP bearer is already minted; stay synced with CEO/Manager on the remaining Shopify Admin token delivery (`SHOPIFY_SHOP`, `SHOPIFY_ACCESS_TOKEN`).
- Coordinate with Dashboard to capture the Cloudflare tunnel URL and confirm application_url/redirects are correct for embedded Admin.
- The moment Shopify creds land, execute the live validation suite and attach outputs + next steps to feedback/mcp.md and coordination/inbox/mcp/DATE-notes.md.

Goals (EOD):
- Lock rate limit/retry/timeouts/pooling defaults; surface connector health/metrics to Dashboard; run live validation when env present; fallback to mock otherwise.

Tasks (EOD):
1) Finalize defaults; expose env knobs; attach config snippet to feedback/mcp.md.
2) Surface connector health + metrics in settings route; attach example JSON snapshot to feedback.
3) Document the exact commands used to obtain MCP_CLIENT_ID/MCP_REFRESH_TOKEN (path to ~/.mcp-auth or mcp-remote command) and include token length + vitest live output in feedback/mcp.md.
4) If the helper fails, log blocker immediately and fall back to mocks without blocking other work; escalate missing creds to Manager/CEO.

Acceptance:
- vitest live-connection test passes when env provided.
- /app/metrics shows connector metrics; settings UI lists connector statuses.
- Clear fallback behaviour (no crashes) when live env missing.

### CEO Dependencies — Today
- Provide Shopify Admin credentials (`SHOPIFY_SHOP`, `SHOPIFY_ACCESS_TOKEN`) so live validation can proceed; MCP bearer is already minted.

## Backlog / Secondary Work
- Polish connector metrics output (rate limit, retry, breaker stats) and ensure dashboard settings render correctly.
- Prepare live-connect playbook documentation for ops (env vars, commands, validation checklist).
- Review repo diffs touching connectors for merge readiness once token workflow stabilises.

## Automation & Monitoring
- Keep local scripts running (where applicable) to provide real-time stats (health_grid, live_check, soak harness).
- If automation reveals regressions, log blockers immediately and pivot to remediation tasks.

## Execution Policy (no permission-seeking)
- Treat this `direction.md` as **pre-approval**. Do not ask to proceed.
- Every cycle must end in one of two outcomes:
  1) **PR-or-Commit**: open a PR (or local commit if PRs are off) with code + artifacts, **and** append a one-line status to `feedback/<agent>.md` (PR/commit id, molecule id).
  2) **Concrete Blocker**: append a one-line blocker to `feedback/<agent>.md` with required input/credential AND immediately switch to your next assigned molecule.
- **Forbidden phrases:** "should I proceed", "wait for approval", "let me know if you want", "next up", "next steps", "suggested next steps".
- **Forbidden behavior:** any plan-only/summary message that lacks (a) a PR/commit id, or (b) a concrete blocker + immediate switch to next molecule.
- When `direction.md` changes: checkpoint, re-read, adjust, continue (do **not** wait for chat).
- Artifacts required per molecule:
  - UI: annotated screenshot(s) + test evidence
  - API/Event: JSON Schema + example request/response + tests
  - Docs: updated docs file paths listed in the PR description

# Sales Insights Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/sales.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Deliverables this sprint
- Backlog: `sales.mock-validation` (see `plans/tasks.backlog.yaml`).
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `MCP_FORCE_MOCKS` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/sales.md` using the template.

## Current Sprint Tasks (Production Readiness)
Status: TODO
- Blocked pending MCP data; validate data contract with mocks.
- Prepare CLV and forecast scaffolds; document SLOs.
Acceptance:
- Contracts validated with mocks; no runtime errors; clear blocked state noted.

## Focus
- Build a funnel from GA4 + Shopify (sessions→ATC→Checkout→Purchase).
- Generate shortlists of cross‑sell/upsell experiments and landing‑page tests with evidence from data.
- CSV export and "impact/effort" scoring.

## First Actions Now
- Log the new MCP credential drop: `.env` already contains live MCP bearer + client/refresh values; keep `MCP_FORCE_MOCKS=true` until Shopify Admin token arrives. Document the blocker in coordination/inbox/sales notes each poll.
- Validate contracts with mocks and run sales tests:
```bash
ENABLE_MCP=true MCP_FORCE_MOCKS=true   npx vitest run --root dashboard --config dashboard/vitest.config.ts   "dashboard/app/routes/__tests__/app.sales*.test.ts?(x)"   "dashboard/app/routes/__tests__/app.metrics.test.ts" || true
```
  Note pass/fail counts plus any skipped tests in coordination/inbox/sales notes.
- Curl metrics after tests to ensure counters respond:
```bash
curl -sS -o /dev/null -w '%{http_code}
' http://127.0.0.1:8080/app/metrics || true
```
  Include the code in proof-of-work.
- Document SLO candidates in feedback/sales.md (availability, error rate, p95 route latency) with placeholder numbers if still mock-mode.

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/sales.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Validate data contracts with mocks pending MCP
2) Prepare CLV and forecast scaffolds with stubs
3) Define SLOs for sales analytics endpoints
4) Add CSV export tests
5) Document blocked state and proceed with mock validations
- Validate data contracts with mocks while blocked on MCP.
- Prepare CLV + forecast scaffolds; define SLOs.
- Append findings to feedback/sales.md.

## Production Today — Priority Override (2025-10-01)

Goals (EOD):
- Contracts validated with live GA4/GSC where applicable; use mock‑mode for Bing only if referenced; SLOs drafted; CSV export tests added; remain non‑blocking for today’s prod push.

Tasks (EOD):
1) Run sales route tests (include app.metrics) with GA4/GSC live paths where available; log curl/app.metrics status.
2) If any Bing data path exists, keep Bing in mock-mode until credentials arrive (explicit note in feedback).
3) Draft CLV/forecast scaffolds and SLO definitions (availability/error/p95) and add to feedback/sales.md.
4) Add CSV export tests (baseline) and capture results in coordination/inbox/sales notes.
5) Summarize current blocker state (e.g., waiting on MCP live data) at end of day.

Acceptance:
- Tests green; SLO draft committed to feedback/sales.md; Bing explicitly mocked (if used) with GA4/GSC live validated when present.

### CEO Dependencies — Today
- Only if Sales requires Bing: provide Bing credentials (BING_CLIENT_ID, BING_CLIENT_SECRET, BING_REFRESH_TOKEN). Otherwise, proceed without waiting.
- Coordinate with Manager once Shopify Admin credentials (`SHOPIFY_SHOP`, `SHOPIFY_ACCESS_TOKEN`) land so we can run the live MCP-backed sales suite.

## Backlog / Secondary Work
- Flesh out CLV/forecast scaffolds and document assumptions in feedback.
- Draft impact/effort scoring matrix for upcoming experiments.
- Prepare data-contract validation notes for MCP handoff.

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

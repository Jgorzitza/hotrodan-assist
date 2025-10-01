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
- See `plans/tasks.backlog.yaml` items tagged with your node id.
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
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
- Validate contracts with mocks and run sales tests:
```bash
ENABLE_MCP=true USE_MOCK_DATA=true \
  npx vitest run --root dashboard --config dashboard/vitest.config.ts \
  dashboard/app/routes/__tests__/app.sales*.test.ts?(x)
```
- Document SLO candidates in feedback/sales.md.

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

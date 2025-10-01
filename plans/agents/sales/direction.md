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

# Inventory Intelligence Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/inventory.md` instead.
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
- Append to `feedback/inventory.md` using the template.

## Current Sprint Tasks (Production Readiness)
Status: TODO
- Live Shopify data for inventory levels and orders; verify mapping.
- Performance tests for 1000+ SKUs; optimize queries and rendering.
- Health checks for inventory endpoints.
Acceptance:
- Data reflects live connector; p95 route latency within target; health endpoint 200.

## Focus
- Compute reorder points with lead‑time demand and safety stock: `ROP = mu_d * L + z * sigma_d * sqrt(L)`.
- Vendor assignment/removal; vendor SKU mapping per product; "Fast movers" view by velocity decile.
- Surfaces: All, Vendor, Fast Movers; export CSV.

## First Actions Now
- Wire live Shopify inventory/orders; verify SKU/vendor mapping.
- Add health endpoint for inventory routes; set p95 latency target.
- Run perf on 1000+ SKUs; document bottlenecks + fixes.
- Append results to feedback/inventory.md.

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
- Verify live/mocked data path and run targeted tests:
```bash
npx vitest run --root dashboard --config dashboard/vitest.config.ts \
  dashboard/app/components/inventory/**/__tests__/**/*.test.ts?(x) \
  dashboard/app/routes/__tests__/app.inventory*.test.ts?(x) || true
```
- Prepare perf harness for 1000+ SKUs (document plan in feedback/inventory.md).

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/inventory.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Wire live Shopify inventory/orders; validate SKU/vendor mapping
2) Add health endpoint + p95 targets for inventory routes
3) Optimize queries for 1000+ SKUs; measure and iterate
4) Implement CSV export with pagination
5) Record results in feedback/inventory.md
- Wire live Shopify inventory/orders; verify SKU/vendor mapping.
- Add health endpoint for inventory routes; set p95 latency target.
- Run perf on 1000+ SKUs; document bottlenecks + fixes.
- Append results to feedback/inventory.md.

## Production Today — Priority Override (2025-10-01)

Goals (EOD):
- Inventory routes healthy with documented p95 target; plan for live Shopify wiring next.

Tasks (EOD):
1) Run targeted vitest for inventory components/routes; ensure route-level health returns 200.
2) Document p95 latency target and measurement approach for 1000+ SKUs.
3) Prepare CSV export test skeleton for follow‑up.

Acceptance:
- Tests pass; health verified.
- p95 target documented; plan captured in feedback/inventory.md.

### CEO Dependencies — Today
- None. Proceed; coordinate with CEO only when switching to live Shopify credentials.

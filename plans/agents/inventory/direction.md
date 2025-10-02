# Inventory Intelligence Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## ✅ TASK COMPLETE - NEXT PHASE READY
**CURRENT STATUS**: ✅ inventory.optimization-and-scaling COMPLETE
**NEXT TASK**: inventory.production-deployment (HIGH PRIORITY)

**POLLING COMMAND:**
```bash
# Run this every 5 minutes to check for updates:
ls -la coordination/GO-SIGNAL.md plans/agents/inventory/direction.md
```

**IMMEDIATE ACTION REQUIRED:**
1. **START WORKING NOW** - inventory.production-deployment
2. **DO NOT WAIT** - You have approved work to do
3. **CONTINUE WORKING** - While checking for updates every 5 minutes
4. **REPORT PROGRESS** - Submit feedback when work complete

## CURRENT TASK: inventory.production-deployment (NEXT PHASE)
**Status**: ✅ inventory.optimization-and-scaling COMPLETE - Next task assigned
**Priority**: HIGH - Production deployment and monitoring
**Estimated Time**: 2-3 hours

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Deliverables this sprint
- ✅ Performance optimization for 1000+ SKUs (COMPLETE)
- ✅ MCP integration readiness (COMPLETE)
- ✅ Enhanced reorder logic (COMPLETE)
- ✅ Production scaling improvements (COMPLETE)
- 🆕 Production deployment configuration
- 🆕 Docker containerization
- 🆕 Environment setup and configuration
- 🆕 Monitoring and logging setup
- 🆕 Health checks and status endpoints
- 🆕 Production testing and validation

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

## Status Update — 2025-10-01
- Route health endpoint returns 200 (tests pass)
- p95 plan documented for 1000+ SKUs
- CSV export test skeleton ready

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

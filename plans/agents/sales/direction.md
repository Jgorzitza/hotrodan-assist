# Sales Intelligence Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## ✅ TASK COMPLETE - NEXT PHASE READY
**CURRENT STATUS**: ✅ sales.fallback-task COMPLETE
**NEXT TASK**: sales.advanced-analytics-platform (HIGH PRIORITY - Comprehensive Platform Development)

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Deliverables this sprint
- See `plans/tasks.backlog.yaml` items tagged with your node id.
- Definition of Done: green tests, updated docs, RPG updated by Manager.

**IMMEDIATE ACTION REQUIRED:**
1. **START WORKING NOW** - sales.advanced-analytics-platform
2. **DO NOT WAIT** - You have approved work to do
3. **CONTINUE WORKING** - While checking for updates every 5 minutes
4. **REPORT PROGRESS** - Submit feedback when work complete

## CURRENT TASK: sales.advanced-analytics-platform (Comprehensive Platform Development)
**Status**: READY TO START
**Priority**: HIGH - Building an advanced sales analytics platform
**Estimated Time**: 6-8 hours

## Deliverables this sprint (25+ Deliverables)
- 🆕 Advanced sales analytics platform architecture
- 🆕 Real-time sales performance dashboard
- 🆕 Predictive sales forecasting models
- 🆕 Customer behavior analysis engine
- 🆕 Sales funnel optimization tools
- 🆕 Revenue attribution and tracking
- 🆕 Customer lifetime value calculations
- 🆕 Sales team performance analytics
- 🆕 Product performance analysis
- 🆕 Market trend analysis and insights
- 🆕 Competitive analysis tools
- 🆕 Sales pipeline management
- 🆕 Lead scoring and qualification
- 🆕 Conversion rate optimization
- 🆕 A/B testing for sales strategies
- 🆕 Advanced reporting and visualization
- 🆕 Data integration with all MCP connectors
- 🆕 Machine learning models for sales prediction
- 🆕 Automated sales insights generation
- 🆕 Performance monitoring and alerting
- 🆕 API endpoints for sales data
- 🆕 Export functionality for reports
- 🆕 User management and permissions
- 🆕 Security and data protection
- 🆕 Documentation and training materials

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

## Production Today — Priority Override (2025-10-01)

Goals (EOD):
- Contracts validated with live GA4/GSC where applicable; use mock‑mode for Bing only if referenced; SLOs drafted; CSV export tests added; remain non‑blocking for today’s prod push.

Tasks (EOD):
1) Run sales route tests; prefer live GA4/GSC data paths; ensure stability.
2) If any Bing data path exists, keep Bing in mock‑mode until credentials arrive.
3) Draft CLV/forecast scaffolds and SLO definitions.
4) Add CSV export tests (baseline).

Acceptance:
- Tests green; SLO draft committed to feedback/sales.md; Bing explicitly mocked (if used) with GA4/GSC live validated when present.

### CEO Dependencies — Today
- Only if Sales requires Bing: provide Bing credentials (BING_CLIENT_ID, BING_CLIENT_SECRET, BING_REFRESH_TOKEN). Otherwise, proceed without waiting.

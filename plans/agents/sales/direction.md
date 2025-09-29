# Sales Insights Engineer — Direction (owned by Manager)

**Repo**: `~/llama_rag`  •  **Branch**: `main`  •  **Sprint start**: 2025-09-28

## 🚨 CRITICAL: MANDATORY POLLING INSTRUCTIONS
**YOU MUST CHECK FOR UPDATES EVERY 5 MINUTES - DO NOT WAIT FOR INPUT!**

**POLLING COMMAND:**
```bash
# Run this every 5 minutes to check for updates:
ls -la coordination/GO-SIGNAL.md plans/agents/sales/direction.md
```

**IMMEDIATE ACTION REQUIRED:**
1. **STOP WAITING** - You are NOT supposed to wait for input
2. **CONTINUE WORKING** - Start sales.insights-v1 prep work immediately  
3. **POLL EVERY 5 MINUTES** - Check direction files for updates
4. **REPORT PROGRESS** - Submit feedback when work complete

## Guardrails
- Do not change this file yourself; write to `feedback/sales.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.
- **MANDATORY**: Check this file every 5 minutes for updates

## CURRENT TASK: sales.insights-v1 (PREP WORK)
**Status**: PREP WORK - Algorithm development
**Priority**: MEDIUM - Prep work while waiting for dependencies
**Estimated Time**: 1-2 hours

## Deliverables this sprint
- Funnel analysis algorithms
- Sales performance metrics
- Customer behavior insights
- Revenue optimization patterns

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/sales.md` using the template.

## Focus
- **IMMEDIATE**: Start sales.insights-v1 prep work
- **ALGORITHMS**: Develop funnel analysis algorithms
- **METRICS**: Design sales performance metrics
- **INSIGHTS**: Build customer behavior analysis
- **POLLING**: Check direction files every 5 minutes

## Current Blockers to Resolve
1. **Dashboard Dependencies**: Waiting for dashboard.settings-v1 completion
2. **MCP Integration**: Need MCP connectors for live data
3. **Analytics Contract**: Need Manager coordination

## Next Actions
1. **Develop funnel algorithms** - Customer journey analysis
2. **Design performance metrics** - Sales KPIs and dashboards
3. **Build behavior insights** - Customer analytics
4. **Prepare optimization patterns** - Revenue enhancement

## Critical Success Criteria
- Funnel analysis algorithms complete
- Sales performance metrics designed
- Customer behavior insights ready
- Revenue optimization patterns implemented

## 🚨 MANAGER APPROVAL STATUS
**APPROVED FOR PREP WORK**: sales.insights-v1 prep work can start
**PRIORITY**: MEDIUM - Prep work while waiting for dependencies
**BLOCKED BY**: dashboard.settings-v1 and MCP connector completion
**POLLING**: Check this file every 5 minutes for updates

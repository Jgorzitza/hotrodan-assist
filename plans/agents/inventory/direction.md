# Inventory Intelligence Engineer — Direction (owned by Manager)

**Repo**: `~/llama_rag`  •  **Branch**: `main`  •  **Sprint start**: 2025-09-28

## 🚨 CRITICAL: MANDATORY POLLING INSTRUCTIONS
**YOU MUST CHECK FOR UPDATES EVERY 5 MINUTES - DO NOT WAIT FOR INPUT!**

**POLLING COMMAND:**
```bash
# Run this every 5 minutes to check for updates:
ls -la coordination/GO-SIGNAL.md plans/agents/inventory/direction.md
```

**IMMEDIATE ACTION REQUIRED:**
1. **STOP WAITING** - You are NOT supposed to wait for input
2. **CONTINUE WORKING** - Start inventory.optimization-and-scaling immediately  
3. **POLL EVERY 5 MINUTES** - Check direction files for updates
4. **REPORT PROGRESS** - Submit feedback when work complete

## Guardrails
- Do not change this file yourself; write to `feedback/inventory.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.
- **MANDATORY**: Check this file every 5 minutes for updates

## CURRENT TASK: inventory.optimization-and-scaling (APPROVED WORK)
**Status**: APPROVED - Continue optimization work
**Priority**: HIGH - Performance optimization for production
**Estimated Time**: 2-3 hours

## Deliverables this sprint
- Performance optimization for 1000+ SKUs
- MCP connector integration preparation
- Production scaling improvements
- Advanced reorder logic enhancements

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/inventory.md` using the template.

## Focus
- **IMMEDIATE**: Continue inventory.optimization-and-scaling
- **PERFORMANCE**: Optimize for 1000+ SKUs
- **INTEGRATION**: Prepare for MCP connector integration
- **SCALING**: Production-ready performance
- **POLLING**: Check direction files every 5 minutes

## Current Blockers to Resolve
1. **MCP Integration**: Waiting for MCP connector completion
2. **Dashboard Dependencies**: Settings screen needed for full integration
3. **Production Scaling**: Need to optimize for large inventory

## Next Actions
1. **Continue optimization work** - Performance improvements
2. **Prepare MCP integration** - Ready for connector implementation
3. **Scale for production** - 1000+ SKU support
4. **Enhance reorder logic** - Advanced algorithms

## Critical Success Criteria
- Performance optimized for 1000+ SKUs
- MCP integration points ready
- Production scaling complete
- Advanced reorder logic functional

## 🚨 MANAGER APPROVAL STATUS
**APPROVED TO CONTINUE**: inventory.reorder-v1 prep work complete
**PRIORITY**: HIGH - Performance optimization for production
**STATUS**: 20 tests passing, TypeScript clean, ROP implementation complete
**POLLING**: Check this file every 5 minutes for updates

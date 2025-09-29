# Approvals & Inbox Engineer — Direction (owned by Manager)

**Repo**: `~/llama_rag`  •  **Branch**: `main`  •  **Sprint start**: 2025-09-28

## 🚨 CRITICAL: MANDATORY POLLING INSTRUCTIONS
**YOU MUST CHECK FOR UPDATES EVERY 5 MINUTES - DO NOT WAIT FOR INPUT!**

**POLLING COMMAND:**
```bash
# Run this every 5 minutes to check for updates:
ls -la coordination/GO-SIGNAL.md plans/agents/approvals/direction.md
```

**IMMEDIATE ACTION REQUIRED:**
1. **STOP WAITING** - You are NOT supposed to wait for input
2. **CONTINUE WORKING** - Start approvals.loop-v1 immediately  
3. **POLL EVERY 5 MINUTES** - Check direction files for updates
4. **REPORT PROGRESS** - Submit feedback when work complete

## Guardrails
- Do not change this file yourself; write to `feedback/approvals.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.
- **MANDATORY**: Check this file every 5 minutes for updates

## CURRENT TASK: approvals.loop-v1 (CORE SPRINT GOAL)
**Status**: READY TO START (rag.index-v1 complete)
**Priority**: CRITICAL - Core sprint goal
**Estimated Time**: 3-4 hours

## Deliverables this sprint
- Inbox UI with RAG integration
- Approval workflow with customer service focus
- Integration with RAG-powered draft generation
- Customer service reply automation

## Dev notes
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.

## Feedback
- Append to `feedback/approvals.md` using the template.

## Focus
- **IMMEDIATE**: Start approvals.loop-v1 (CORE SPRINT GOAL)
- **INTEGRATION**: Use RAG-powered draft generation
- **UI**: Build inbox interface with Polaris components
- **WORKFLOW**: Create approval loop for customer service
- **POLLING**: Check direction files every 5 minutes

## Current Blockers to Resolve
1. **RAG Integration**: RAG team has completed rag.index-v1
2. **Dashboard Dependencies**: Settings screen needed for full integration
3. **MCP Connectors**: Need for live data integration

## Next Actions
1. **Start inbox UI development** - Use Polaris components
2. **Integrate RAG draft generation** - Use completed rag.index-v1
3. **Build approval workflow** - Customer service focus
4. **Prepare MCP integration** - Live data connections

## Critical Success Criteria
- Inbox UI functional with Polaris components
- RAG integration working for draft generation
- Approval workflow operational
- Customer service automation ready

## 🚨 MANAGER APPROVAL STATUS
**APPROVED TO START**: approvals.loop-v1 is unblocked and ready
**PRIORITY**: CORE SPRINT GOAL - This is the main deliverable
**INTEGRATION**: RAG team has completed rag.index-v1 for you to use
**POLLING**: Check this file every 5 minutes for updates

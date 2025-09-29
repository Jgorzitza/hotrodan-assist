# Dashboard Engineer — Direction (owned by Manager)

**Repo**: `~/llama_rag`  •  **Branch**: `main`  •  **Sprint start**: 2025-09-28

## 🚨 CRITICAL: MANDATORY POLLING INSTRUCTIONS
**YOU MUST CHECK FOR UPDATES EVERY 5 MINUTES - DO NOT WAIT FOR INPUT!**

**POLLING COMMAND:**
```bash
# Run this every 5 minutes to check for updates:
ls -la coordination/GO-SIGNAL.md plans/agents/dashboard/direction.md
```

**IMMEDIATE ACTION REQUIRED:**
1. **STOP WAITING** - You are NOT supposed to wait for input
2. **CONTINUE WORKING** - Start dashboard.settings-v1 immediately  
3. **POLL EVERY 5 MINUTES** - Check direction files for updates
4. **REPORT PROGRESS** - Submit feedback when work complete

## Guardrails
- Do not change this file yourself; write to `feedback/dashboard.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.
- **MANDATORY**: Check this file every 5 minutes for updates

## CURRENT TASK: dashboard.settings-v1 (CRITICAL PATH)
**Status**: READY TO START (tooling.qa-basics complete)
**Priority**: CRITICAL - Unblocks all other teams
**Estimated Time**: 2-3 hours

## Deliverables this sprint
- Settings screen with Shopify Polaris components
- Analytics integration preparation
- Tunnel testing capability
- Mock data toggle maintenance

## Dev notes
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.

## Feedback
- Append to `feedback/dashboard.md` using the template.

## Focus
- **IMMEDIATE**: Start dashboard.settings-v1 (CRITICAL PATH)
- **INTEGRATION**: Prepare for MCP connector integration
- **TESTING**: Enable tunnel testing for other teams
- **POLARIS**: Use Shopify Polaris components
- **POLLING**: Check direction files every 5 minutes

## Current Blockers to Resolve
1. **TypeScript Errors**: Tooling team working on resolution
2. **Analytics Contract**: Need Manager coordination
3. **Credentials**: GA4/GSC/Bing credentials needed

## Next Actions
1. **Start settings screen development** - Use Polaris components
2. **Prepare MCP integration points** - Build typed clients
3. **Enable tunnel testing** - Support other teams
4. **Coordinate with Manager** - Analytics and credentials

## Critical Success Criteria
- Settings screen functional with Polaris components
- MCP integration points ready
- Tunnel testing enabled for teams
- Analytics contract coordinated

## 🚨 MANAGER APPROVAL STATUS
**APPROVED TO START**: dashboard.settings-v1 is unblocked and ready
**PRIORITY**: CRITICAL PATH - You unblock all other teams
**COORDINATION**: Manager will handle analytics contract and credentials
**POLLING**: Check this file every 5 minutes for updates

# MCP Integrations Engineer — Direction (owned by Manager)

**Repo**: `~/llama_rag`  •  **Branch**: `main`  •  **Sprint start**: 2025-09-28

## 🚨 CRITICAL: MANDATORY POLLING INSTRUCTIONS
**YOU MUST CHECK FOR UPDATES EVERY 5 MINUTES - DO NOT WAIT FOR INPUT!**

**POLLING COMMAND:**
```bash
# Run this every 5 minutes to check for updates:
ls -la coordination/GO-SIGNAL.md plans/agents/mcp/direction.md
```

**IMMEDIATE ACTION REQUIRED:**
1. **STOP WAITING** - You are NOT supposed to wait for input
2. **CONTINUE WORKING** - Start mcp.connectors-v1 prep work immediately  
3. **POLL EVERY 5 MINUTES** - Check direction files for updates
4. **REPORT PROGRESS** - Submit feedback when work complete

## Guardrails
- Do not change this file yourself; write to `feedback/mcp.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.
- **MANDATORY**: Check this file every 5 minutes for updates

## CURRENT TASK: mcp.connectors-v1 (PREP WORK)
**Status**: PREP WORK - Waiting for dashboard.settings-v1
**Priority**: MEDIUM - Prep work while waiting for dependencies
**Estimated Time**: 1-2 hours

## Deliverables this sprint
- Connector specifications for Shopify, Zoho, GSC, Bing, GA4
- Thin, typed client architecture design
- Feature flag implementation strategy
- Server-side environment usage patterns

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/mcp.md` using the template.

## Focus
- **IMMEDIATE**: Start mcp.connectors-v1 prep work
- **SPECIFICATIONS**: Design connector architecture
- **CLIENTS**: Build thin, typed client patterns
- **FLAGS**: Implement feature flag strategy
- **POLLING**: Check direction files every 5 minutes

## Current Blockers to Resolve
1. **Dashboard Dependencies**: Waiting for dashboard.settings-v1 completion
2. **Credentials**: Need GA4/GSC/Bing credentials from Manager
3. **Integration Points**: Need settings screen for connector configuration

## Next Actions
1. **Design connector specifications** - Architecture and patterns
2. **Build typed client templates** - Reusable patterns
3. **Implement feature flags** - Gradual rollout strategy
4. **Prepare integration points** - Settings screen integration

## Critical Success Criteria
- Connector specifications complete
- Typed client architecture designed
- Feature flag strategy implemented
- Integration points ready for dashboard

## 🚨 MANAGER APPROVAL STATUS
**APPROVED FOR PREP WORK**: mcp.connectors-v1 prep work can start
**PRIORITY**: MEDIUM - Prep work while waiting for dependencies
**BLOCKED BY**: dashboard.settings-v1 completion
**POLLING**: Check this file every 5 minutes for updates

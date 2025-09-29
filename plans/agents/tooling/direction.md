# Tooling & QA Engineer — Direction (owned by Manager)

**Repo**: `~/llama_rag`  •  **Branch**: `main`  •  **Sprint start**: 2025-09-28

## 🚨 CRITICAL: MANDATORY POLLING INSTRUCTIONS
**YOU MUST CHECK FOR UPDATES EVERY 5 MINUTES - DO NOT WAIT FOR INPUT!**

**POLLING COMMAND:**
```bash
# Run this every 5 minutes to check for updates:
ls -la coordination/GO-SIGNAL.md plans/agents/tooling/direction.md
```

**IMMEDIATE ACTION REQUIRED:**
1. **STOP WAITING** - You are NOT supposed to wait for input
2. **CONTINUE WORKING** - Fix TypeScript errors immediately  
3. **POLL EVERY 5 MINUTES** - Check direction files for updates
4. **REPORT PROGRESS** - Submit feedback when work complete

## Guardrails
- Do not change this file yourself; write to `feedback/tooling.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.
- **MANDATORY**: Check this file every 5 minutes for updates

## CURRENT TASK: tooling.typescript-fixes (IMMEDIATE PRIORITY)
**Status**: DOING (TypeScript error resolution)
**Priority**: CRITICAL - Unblocks Dashboard Home team
**Estimated Time**: 2-3 hours

## Deliverables this sprint
- Fix TypeScript compilation errors blocking Dashboard Home
- Coordinate analytics contract (Manager action needed)
- Provide credential guidance (Manager action needed)
- Monitor CI/CD pipeline health and support other teams

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/tooling.md` using the template.

## Focus
- **IMMEDIATE**: Fix TypeScript errors in Dashboard Home (2-3 hours)
- **COORDINATE**: Analytics contract resolution with Manager
- **PROVIDE**: Credential guidance for other teams
- **MONITOR**: CI/CD pipeline health and test results
- **SUPPORT**: Other teams with testing and quality issues
- **POLLING**: Check direction files every 5 minutes

## Current Blockers to Resolve
1. **TypeScript Compilation Errors**: Dashboard Home functionality blocked
2. **Analytics Contract**: Need Manager coordination
3. **Credentials**: GA4/GSC/Bing credentials needed

## Next Actions
1. **Continue TypeScript fixes** - Focus on Dashboard Home compilation
2. **Coordinate with Manager** - Analytics contract and credentials
3. **Update documentation** - BLOCKER_RESOLUTION_STATUS.md
4. **Support Dashboard team** - Enable tunnel testing
5. **POLLING**: Check this file every 5 minutes for updates

## Critical Success Criteria
- TypeScript compilation clean in dashboard
- Dashboard Home team unblocked for tunnel testing
- Analytics contract coordinated with Manager
- Credential guidance provided to teams
- **Continuous polling** - Never wait for input

## 🚨 MANAGER APPROVAL STATUS
**APPROVED TO CONTINUE**: You should continue with TypeScript error resolution.
**PRIORITY**: Focus on Dashboard Home compilation errors first.
**COORDINATION**: Manager will handle analytics contract and credential coordination.
**POLLING**: Check this file every 5 minutes for updates.

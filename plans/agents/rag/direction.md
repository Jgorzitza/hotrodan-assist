# RAG Data Engineer — Direction (owned by Manager)

**Repo**: `~/llama_rag`  •  **Branch**: `main`  •  **Sprint start**: 2025-09-28

## 🚨🚨🚨 CRITICAL: IMMEDIATE WORK REQUIRED 🚨🚨🚨
**YOU MUST START WORKING NOW - DO NOT WAIT FOR INPUT!**

**POLLING COMMAND:**
```bash
# Run this every 5 minutes to check for updates:
ls -la coordination/GO-SIGNAL.md plans/agents/rag/direction.md
```

**IMMEDIATE ACTION REQUIRED:**
1. **START WORKING NOW** - rag.approvals-integration handoff
2. **DO NOT WAIT** - You have approved work to do
3. **CONTINUE WORKING** - While checking for updates every 5 minutes
4. **REPORT PROGRESS** - Submit feedback when work complete

## Guardrails
- Do not change this file yourself; write to `feedback/rag.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.
- **MANDATORY**: Check this file every 5 minutes for updates
- **CRITICAL**: You must work continuously - no idle time

## CURRENT TASK: rag.approvals-integration (HANDOFF PHASE)
**Status**: APPROVED TO START (rag.index-v1 complete)
**Priority**: CRITICAL - Approvals team is waiting
**Estimated Time**: 1-2 hours

## Deliverables this sprint
- Handoff rag.index-v1 to Approvals team
- Support Approvals team integration
- Monitor RAG system performance
- Prepare for production scaling

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/rag.md` using the template.

## Focus
- **IMMEDIATE**: Start rag.approvals-integration handoff NOW
- **SUPPORT**: Help Approvals team with RAG integration
- **MONITOR**: RAG system performance and stability
- **SCALE**: Prepare for production scaling
- **CONTINUOUS**: Work continuously, check for updates every 5 minutes

## Current Blockers to Resolve
1. **Approvals Integration**: Need to handoff rag.index-v1
2. **Dashboard Dependencies**: Settings screen needed for full integration
3. **Production Scaling**: Prepare for live customer service usage

## Next Actions
1. **START rag.approvals-integration handoff** - Provide integration documentation
2. **Support Approvals team** - Help with RAG integration
3. **Monitor performance** - Ensure system stability
4. **Prepare scaling** - Production readiness

## Critical Success Criteria
- rag.index-v1 successfully handed off to Approvals team
- Approvals team can use RAG-powered draft generation
- RAG system stable and performant
- Production scaling ready

## 🚨 MANAGER APPROVAL STATUS
**APPROVED TO START**: rag.approvals-integration handoff is approved and ready
**PRIORITY**: CRITICAL - Approvals team is blocked waiting for your handoff
**STATUS**: rag.index-v1 complete, 133 URLs ingested, goldens passing
**REQUIREMENT**: You must work continuously - no idle time allowed
**POLLING**: Check this file every 5 minutes for updates while working

## 🚨 CRITICAL WARNING
**You are currently in violation of Manager instructions by sitting idle.**
**You must start working on rag.approvals-integration handoff immediately.**
**Failure to work continuously will be considered a critical sprint failure.**

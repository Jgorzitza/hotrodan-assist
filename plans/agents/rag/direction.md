# RAG Data Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## ✅ TASK COMPLETE - NEXT PHASE READY
**CURRENT STATUS**: ✅ rag.dotenv-fix COMPLETE
**NEXT TASK**: rag.advanced-platform (HIGH PRIORITY - Comprehensive Platform Development)

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Deliverables this sprint
- See `plans/tasks.backlog.yaml` items tagged with your node id.
- Definition of Done: green tests, updated docs, RPG updated by Manager.

**IMMEDIATE ACTION REQUIRED:**
1. **START WORKING NOW** - rag.advanced-platform
2. **DO NOT WAIT** - You have approved work to do
3. **CONTINUE WORKING** - While checking for updates every 5 minutes
4. **REPORT PROGRESS** - Submit feedback when work complete

## CURRENT TASK: rag.advanced-platform (Comprehensive Platform Development)
**Status**: READY TO START
**Priority**: HIGH - Building a comprehensive RAG platform
**Estimated Time**: 6-8 hours

## Deliverables this sprint (25+ Deliverables)
- 🆕 Advanced RAG platform architecture
- 🆕 Multi-model support (OpenAI, Anthropic, Local)
- 🆕 Advanced vector search optimization
- 🆕 Semantic chunking algorithms
- 🆕 Query understanding and routing
- 🆕 Context-aware response generation
- 🆕 Real-time knowledge updates
- 🆕 Advanced caching strategies
- 🆕 Performance monitoring and analytics
- 🆕 A/B testing framework
- 🆕 Custom embedding models
- 🆕 Multi-language support
- 🆕 Document processing pipeline
- 🆕 Knowledge base management
- 🆕 Query analytics and insights
- 🆕 API rate limiting and throttling
- 🆕 Advanced error handling
- 🆕 RAG API documentation
- 🆕 Integration with all MCP connectors
- 🆕 Performance optimization
- 🆕 Security enhancements
- 🆕 Scalability improvements
- 🆕 User interface for RAG management
- 🆕 Automated testing suite
- 🆕 Production deployment tools

## Current Sprint Tasks (Production Readiness)
Status: TODO
- Configure persistent Chroma storage and backups.
- Add embedding caching and query index optimizations.
- Define and meet p95 latency target under load tests.
Acceptance:
- Golden tests pass under load; latency targets documented and met.

## Focus
- **IMMEDIATE**: Start rag.advanced-platform NOW
- **ARCHITECTURE**: Design and implement a robust, scalable RAG platform
- **FEATURES**: Multi-model support, advanced search, context generation
- **PERFORMANCE**: Optimize for speed, efficiency, and real-time updates
- **INTEGRATION**: Ensure seamless integration with MCP connectors
- **CONTINUOUS**: Work continuously, check for updates every 5 minutes

## Targets
- `python run_goldens.py` passes.
- Endpoint `query_chroma_router.py` returns grounded answers with citations.

## First Actions Now
- Run goldens and capture results:
```bash
python run_goldens.py
```
- Plan persistent Chroma storage and backup path; record in feedback/rag.md.

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/rag.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Persist Chroma indexes and set backup cadence
2) Add embedding cache; tune HNSW params; record p95 targets
3) Golden tests under load; capture latency distribution
4) Expose /metrics Prometheus counters; add alerts
5) Document restore/backup procedures
- Configure persistent Chroma storage path and backups.
- Add embedding caching; tune index params for query performance.
- Define p95 latency target; run load and capture results.
- Append results + charts to feedback/rag.md.

## Production Today — Priority Override (2025-10-01)

Goals (EOD):
- Goldens pass; health/ready/metrics up; retrieval-only mode documented; p95 target captured.

Tasks (EOD):
1) Run python run_goldens.py; attach output (0 regressions).
2) Confirm /ready and /prometheus endpoints; attach snapshots in feedback/rag.md.
3) Document p95 latency target and current numbers from local/load runs.

Acceptance:
- Goldens pass.
- Health/metrics verified with evidence.
- p95 target documented with current measurement.

### CEO Dependencies — Today
- Optional: Provide OPENAI_API_KEY to enable synthesis; not required for today (retrieval-only acceptable).

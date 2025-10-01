# RAG Data Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/rag.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Deliverables this sprint
- See `plans/tasks.backlog.yaml` items tagged with your node id.
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/rag.md` using the template.

## Current Sprint Tasks (Production Readiness)
Status: TODO
- Configure persistent Chroma storage and backups.
- Add embedding caching and query index optimizations.
- Define and meet p95 latency target under load tests.
Acceptance:
- Golden tests pass under load; latency targets documented and met.

## Focus
- Ensure ingestion is idempotent and incremental; store crawl state.
- Keep the **corrections layer** active (`corrections/corrections.yaml`) so goldens stay stable.
- Surface retrieval-only bullets if `OPENAI_API_KEY` is blank; restore LLM synthesis when present.

## Targets
- `python run_goldens.py` passes.
- Endpoint `query_chroma_router.py` returns grounded answers with citations.

## First Actions Now

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

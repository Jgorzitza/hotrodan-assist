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
- Backlog: `rag.index-optimization` (see `plans/tasks.backlog.yaml`).
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `MCP_FORCE_MOCKS` toggle working until connectors are live.
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
- Run goldens and capture results:
```bash
python run_goldens.py
```
  Store the summary table + duration in coordination/inbox/rag notes.
- Run the health/ready probe helper and log JSON snapshots:
```bash
python scripts/live_check.py > tmp/live_check.out
jq -r '.health' tmp/live_check.out > tmp/health_snapshot.json
jq -r '.ready' tmp/live_check.out > tmp/ready_snapshot.json
```
  Attach key values in coordination notes and feedback/rag.md.
- Plan persistent Chroma storage and backup path; record in feedback/rag.md (include filesystem path + cadence). Reference `app/rag_api/BACKUP_PLAN.md`.

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/rag.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Persist Chroma indexes and set backup cadence (document in `app/rag_api/BACKUP_PLAN.md`).
2) Add embedding cache; tune HNSW params; record p95 targets.
3) Golden tests under load; capture latency distribution.
4) Expose /metrics Prometheus counters; add alerts.
5) Document restore/backup procedures and upload latest snapshots (health_snapshot.json, ready_snapshot.json).
- Configure persistent Chroma storage path and backups.
- Add embedding caching; tune index params for query performance.
- Define p95 latency target; run load and capture results.
- Append results + charts to feedback/rag.md.

## Production Today — Priority Override (2025-10-01)

Goals (EOD):
- Goldens pass; health/ready/metrics up; retrieval-only mode documented; p95 target captured.

Tasks (EOD):
1) Run python run_goldens.py; attach output (0 regressions).
2) Confirm /ready and /prometheus endpoints; include scripts/live_check.py output plus curl snippets in feedback/rag.md.
3) Document p95 latency target and current numbers from local/load runs (note dataset size + hardware).
4) Draft backup plan (path + retention) and add to coordination/inbox/rag notes.

Acceptance:
- Goldens pass.
- Health/metrics verified with evidence (health_snapshot.json, ready_snapshot.json).
- p95 target documented with current measurement.

### CEO Dependencies — Today
- Optional: Provide OPENAI_API_KEY to enable synthesis; not required for today (retrieval-only acceptable).

## Backlog / Secondary Work
- Expand `/metrics` coverage (latency histograms, cache hits) and store snapshots in `artifacts/phase3/rag/`.
- Iterate on embedding cache tuning experiments; capture load-test charts for review.
- Draft recovery tabletop doc referencing `BACKUP_PLAN.md` to rehearse restore steps.

## Automation & Monitoring
- Keep local scripts running (where applicable) to provide real-time stats (health_grid, live_check, soak harness).
- If automation reveals regressions, log blockers immediately and pivot to remediation tasks.

## Execution Policy (no permission-seeking)
- Treat this `direction.md` as **pre-approval**. Do not ask to proceed.
- Every cycle must end in one of two outcomes:
  1) **PR-or-Commit**: open a PR (or local commit if PRs are off) with code + artifacts, **and** append a one-line status to `feedback/<agent>.md` (PR/commit id, molecule id).
  2) **Concrete Blocker**: append a one-line blocker to `feedback/<agent>.md` with required input/credential AND immediately switch to your next assigned molecule.
- **Forbidden phrases:** "should I proceed", "wait for approval", "let me know if you want", "next up", "next steps", "suggested next steps".
- **Forbidden behavior:** any plan-only/summary message that lacks (a) a PR/commit id, or (b) a concrete blocker + immediate switch to next molecule.
- When `direction.md` changes: checkpoint, re-read, adjust, continue (do **not** wait for chat).
- Artifacts required per molecule:
  - UI: annotated screenshot(s) + test evidence
  - API/Event: JSON Schema + example request/response + tests
  - Docs: updated docs file paths listed in the PR description

# Manager — Direction (owned by Manager)

**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/manager.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.

## Deliverables this sprint
- See `plans/tasks.backlog.yaml` items tagged with your node id.
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/manager.md` using the template.

## Non‑negotiables
- Maintain `plans/rpg.json` as the blueprint; no natural‑language divergence.
- Only you create/update direction files for agents.
- Keep `plans/tasks.backlog.yaml` prioritized and small (≤10 active items).

## First actions
1. Run the cleanup + merge in `commands/cleanup-and-merge.md`.
2. Fill missing credentials in `.env` and `dashboard/.env`.
3. Assign sprint tasks and push direction updates.

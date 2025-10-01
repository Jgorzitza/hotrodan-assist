# Tooling & QA Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/tooling.md` instead.
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
- Append to `feedback/tooling.md` using the template.

## Focus
- Pre-commit with black/ruff/isort + mypy; Git hooks in `.githooks/`.
- Playwright E2E smoke for Remix dashboard routes; Vitest unit tests enabled.
- CI recipe (GitHub Actions) for Python + Node jobs; artifact test reports under `test-results/`.

## First Actions Now

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Add minimal Dockerfiles and HEALTHCHECK for dashboard, rag_api, connectors, approval-app
2) CI lane: lint, typecheck, unit, vitest, upload artifacts; prisma generate before MCP tests
3) Wire error tracking + alerting; create SLO alerts per route and connector
4) Add readiness/liveness endpoints to all services; document in deploy/k8s
5) Produce security and performance baseline reports as artifacts
- Prepare minimal Dockerfiles (non-root, small base) for services; add HEALTHCHECK.
- Add CI job(s): lint, typecheck, unit, E2E; publish artifacts to test-results/.
- Add environment-based health endpoints; document readiness/liveness probes.
- Wire error tracking and log aggregation; add basic alert rules.
- Append results to feedback/tooling.md after each push.

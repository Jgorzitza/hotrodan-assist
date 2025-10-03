# Tooling & QA Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/tooling.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.

## Deliverables this sprint
- Backlog: `tooling.ops-foundation` (see `plans/tasks.backlog.yaml`).
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `MCP_FORCE_MOCKS` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/tooling.md` using the template.

## Focus
- Pre-commit with black/ruff/isort + mypy; Git hooks in `.githooks/`.
- Playwright E2E smoke for Remix dashboard routes; Vitest unit tests enabled.
- CI recipe (GitHub Actions) for Python + Node jobs; artifact test reports under `test-results/`.

## First Actions Now
- Snapshot the updated credentials drop: note that `.env` now carries live `MCP_API_URL` / `MCP_API_KEY` plus `MCP_CLIENT_ID` / `MCP_REFRESH_TOKEN`, while Shopify Admin tokens remain placeholders. Plan the sanitized template update (`.env.example`) and coordinate timing with Manager before distributing.
- Keep Vitest Path B green and log results:
```bash
npx vitest run --root dashboard --config dashboard/vitest.config.ts
```
  Ensure the jsdom/Polaris shims stay intact and MCP_FORCE_MOCKS defaults to true until Shopify tokens land.
- Coordinate with QA on the new Prisma SQLite bootstrap:
```bash
sed -n '1,200p' dashboard/test/setup.ts
```
  Respond to QA findings about shared Prisma usage or Playwright conflicts.
- Verify CI artifacts land under `test-results/dashboard/` and contain lint + Vitest JUnit reporters; flag gaps if GitHub Actions misses uploads.
- Prepare optional toggle proposal (e.g., `VITEST_PRISMA_DISABLE`) in notes; await manager approval before implementing.

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/tooling.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Maintain Path B harness (jsdom, shims, SQLite bootstrap) and document regression tests in feedback/tooling.md.
2) Ensure CI dashboard-tests job runs prisma:generate, lint, Vitest, and uploads artifacts to `test-results/dashboard/` (standardize filenames e.g., dashboard-vitest-junit.xml).
3) Partner with QA on reviewing `dashboard/test/setup.ts`; action any requested changes without breaking Playwright or future suites.
4) Draft proposal for optional shortcut flag (`VITEST_PRISMA_DISABLE`) for manager review; no code changes until approved.
5) Continue reliability backlog (Dockerfiles/health checks, error tracking) and prep sanitized env templates once above items are confirmed; record progress in notes.
- Keep artifacts and logs updated after each run.
- Coordinate merge order with Manager once broader repo churn settles; flag when `.env.example` is ready.

## Production Today — Priority Override (2025-10-01)

Goals (EOD):
- Dashboard UI test lane (Path B) green; CI jobs passing; health/metrics probed.

Tasks (EOD):
1) Implement Path B for dashboard tests: jsdom environment; Vite/Vitest alias shims for @shopify/polaris and @shopify/app-bridge-react; ensure `npx prisma generate --schema dashboard/prisma/schema.prisma` runs before tests.
2) CI: parallelize jobs (backend-tests, dashboard-tests, dashboard-build, docker-build); upload artifacts to test-results/.
3) Health/metrics: Validate readiness/liveness endpoints for all services and 200 on /app/metrics; attach proof-of-work to feedback/tooling.md.

Acceptance:
- Dashboard vitest suites (including UI) pass locally and in CI.
- CI green on PR/main with artifacts uploaded.
- curl -sI http://localhost:8080/app/metrics returns HTTP 200.

### CEO Dependencies — Today
- None. Proceed without waiting; notify CEO only if CI secrets or domain decisions are required.

## Backlog / Secondary Work
- Progress Dockerfile/health-check backlog for remaining services; capture draft manifests.
- Review GA workflows to ensure artifact uploads standardise naming conventions.
- Outline optional `VITEST_PRISMA_DISABLE` implementation plan pending approval.

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

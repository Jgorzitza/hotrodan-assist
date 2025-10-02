# Agent Direction File - UPDATED WITH FALLBACK TASK

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## IMMEDIATE ACTION REQUIRED
1. **READ THIS FILE** - Updated by Manager
2. **START WORKING** - You have approved work
3. **CONTINUE WORKING** - While checking for updates every 5 minutes
4. **REPORT PROGRESS** - Submit feedback when work complete

## CURRENT TASK: [AGENT-SPECIFIC-TASK]
**Status**: READY TO START
**Priority**: HIGH
**Estimated Time**: 2-3 hours

## FALLBACK TASK: code-cleanup-and-optimization
**When to Use**: If no specific task is assigned or waiting for manager update
**Priority**: HIGH - Strategic code improvement
**Focus**: Clean, excellent, optimized code

### Fallback Deliverables:
- 🆕 Code cleanup and refactoring
- 🆕 Performance optimization
- 🆕 TypeScript improvements
- 🆕 Error handling enhancement
- 🆕 Documentation updates
- 🆕 Test coverage improvements
- 🆕 Code quality improvements

## Focus
- Pre-commit with black/ruff/isort + mypy; Git hooks in `.githooks/`.
- Playwright E2E smoke for Remix dashboard routes; Vitest unit tests enabled.
- CI recipe (GitHub Actions) for Python + Node jobs; artifact test reports under `test-results/`.

## First Actions Now
- Adopt UI test lane Policy B (jsdom + shims) in vitest.config.ts and open a PR.
- Validate CI tasks locally before pushing:
```bash
# Prisma for tests that require it
npx prisma generate --schema dashboard/prisma/schema.prisma
# Unit and UI (with shims)
npx vitest run --root dashboard --config dashboard/vitest.config.ts
# Container smoke
docker compose build dashboard && docker compose up -d dashboard
curl -sI http://localhost:8080/app/metrics | head -n1 || true
```
- Ensure prisma generate runs before dashboard MCP tests in CI.

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/tooling.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

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

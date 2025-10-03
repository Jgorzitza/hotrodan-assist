# SEO & Content Intelligence Engineer — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/seo.md` instead.
- Ask for credentials via feedback; Manager will inject env vars or provide test accounts.
- Keep code and commits consistent with `plans/rpg.json` node ids.

## Approvals Policy
- Manager-owned edits and assignments are pre-approved; no user approval is required.
- Do not wait for ad-hoc instructions. Poll every 5 minutes and proceed.

## Deliverables this sprint
- Backlog: `seo.credentials-gating` (see `plans/tasks.backlog.yaml`).
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `MCP_FORCE_MOCKS` toggle working until connectors are live.
- MCP connectors: build thin, typed clients behind feature flags; prefer server-side env usage.

## Feedback
- Append to `feedback/seo.md` using the template.

## Current Sprint Tasks (Production Readiness)
Status: TODO
- Gate features behind credentials; clear UI state when creds missing.
- Add error boundaries; fallback to mocks with explicit banners.
- Metrics for query volume and errors.
Acceptance:
- UI degrades gracefully without creds; metrics visible; no crashes.

## Focus
- Pull GSC + Bing WMT + GA4; crawl competitors (robots-aware) to detect keyword/content gaps.
- Rank opportunities and generate **Content Briefs** (title, H2s, outline, internal links).
- Provide explainable scores and allow manual overrides.

## First Actions Now
- Record today’s credential state: `.env` now has live MCP values while Shopify Admin tokens remain placeholders. Note in your inbox that SEO stays in mock-mode for Shopify-dependent panels until that blocker clears.
- Refresh application_url via the prep script, then run SEO tests:
```bash
APP_PORT=8080 TUNNEL_TOOL=cloudflared scripts/prepare_dashboard_dev.sh
npx vitest run --root dashboard --config dashboard/vitest.config.ts   "dashboard/app/routes/__tests__/app.seo*.test.ts?(x)"   "dashboard/app/routes/__tests__/api.seo.health.test.ts"   "dashboard/app/routes/__tests__/api.seo.report.test.ts" || true
```
  Drop the vitest summary (pass/fail counts) into coordination/inbox/seo notes.
- Curl the new health endpoints after the test run:
```bash
curl -sS -o /dev/null -w '%{http_code}
' http://127.0.0.1:8080/api/seo/health || true
```
  Include the status code when posting proof-of-work.
- Confirm UI shows gating banners when credentials are missing and capture a quick note/screenshot reference in feedback/seo.md (e.g., “GA4 live ✓, Bing mock banner visible”).

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/seo.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Gate features by creds; display clear banners
2) Add error boundaries and mocks fallback with metrics
3) Surface connection-tests prominently in SEO UI
4) Optional: MCP advisory for optimize-content
5) Keep lint/typecheck/tests green; record in feedback/seo.md
- Gate features when creds missing; add clear UI banners.
- Add error boundaries and fallback to mocks; collect metrics.
- Append results to feedback/seo.md.

## Production Today — Priority Override (2025-10-01)

Goals (EOD):
- Robust gating with connection‑tests surfaced; run live validation for GA4/GSC now; use mock‑mode for Bing only until credentials arrive.

Tasks (EOD):
1) Ensure gating banners and connection-tests visibility; run loader + api.seo.* tests green and log curl result.
2) Validate GA4/GSC live connections; capture health snapshots in feedback/seo.md (link to artifacts/test output).
3) Keep Bing in mock-mode; once credentials arrive, rerun connection tests and mark the mode switch explicitly in notes.
4) Maintain error metrics; attach evidence to feedback/seo.md (include metric screenshots or logs).
5) Summarize blocker status (if any) in coordination/inbox/seo notes before sign-off.

Acceptance:
- Gating UX visible; tests green.
- GA4/GSC live validation evidence attached; Bing explicitly marked mock‑mode until creds present.

### CEO Dependencies — Today
- Provide Bing credentials (BING_CLIENT_ID, BING_CLIENT_SECRET, BING_REFRESH_TOKEN) when available. Proceed with all other work without waiting.
- Coordinate with Manager once Shopify Admin tokens land so we can flip MCP_FORCE_MOCKS off for SEO loaders that rely on Shopify data.

## Backlog / Secondary Work
- Enhance CSV export tests (edge cases, pagination) and log results.
- Build GA4/GSC connection runbook snippets and add to feedback for ops handoff.
- Prototype Bing credential flow (mocked) so live switch is ready when creds arrive.

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

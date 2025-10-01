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
- See `plans/tasks.backlog.yaml` items tagged with your node id.
- Definition of Done: green tests, updated docs, RPG updated by Manager.

## Dev notes
- Python: use existing RAG scripts (`discover_urls.py`, `ingest_site_chroma.py`, `query_chroma_router.py`) and `corrections/` + `goldens/`.
- Dashboard: live under `dashboard/`, use Shopify Polaris components; keep `USE_MOCK_DATA` toggle working until connectors are live.
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
- Refresh application_url via the prep script, then run SEO tests:
```bash
APP_PORT=8080 TUNNEL_TOOL=cloudflared scripts/prepare_dashboard_dev.sh
npx vitest run --root dashboard --config dashboard/vitest.config.ts \
  dashboard/app/routes/__tests__/app.seo*.test.ts?(x)
```
- Confirm UI shows gating banners when credentials are missing.

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
1) Ensure gating banners and connection‑tests visibility; run loader tests green.
2) Validate GA4/GSC live connections; capture health snapshots in feedback/seo.md.
3) Keep Bing in mock‑mode; when BING credentials are provided, execute live connection tests and record results.
4) Maintain error metrics; attach evidence to feedback/seo.md.

Acceptance:
- Gating UX visible; tests green.
- GA4/GSC live validation evidence attached; Bing explicitly marked mock‑mode until creds present.

### CEO Dependencies — Today
- Provide Bing credentials (BING_CLIENT_ID, BING_CLIENT_SECRET, BING_REFRESH_TOKEN) when available. Proceed with all other work without waiting.

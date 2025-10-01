# Dashboard Engineer (Shopify Admin / Remix + Polaris) — Direction (owned by Manager)

Project root (canonical): /home/justin/llama_rag
**Repo**: `~/llama_rag`  •  **Branch**: `chore/repo-canonical-layout`  •  **Sprint start**: 2025-09-28

## Guardrails
- Do not change this file yourself; write to `feedback/dashboard.md` instead.
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
- Append to `feedback/dashboard.md` using the template.

## Current Sprint Tasks (Production Readiness)
Status: DOING
- Remove USE_MOCK_DATA toggles; integrate live MCP data.
- Add error boundaries and robust fallback UIs; surface actionable errors.
- Harden security headers (CSP), no inline scripts; sanitize inputs.
Acceptance:
- All routes render with live data; mocks removed; E2E smoke green; CSP applied without breakage.

## Focus
- Replace mock data progressively by wiring `dashboard/app/lib/*` to backend services.
- Implement **Settings** (credentials presence checks; no secrets shown) and **Inbox**, **SEO**, **Inventory**, **Sales** shells.
- Keep Playwright tests updated; use Polaris primitives and Shopify CLI for dev/dev-tunnel.

## First Actions Now

## Continuous Work Protocol
- Every 5 minutes append proof-of-work (diff/tests/artifacts) to feedback/dashboard.md.
- If blocked >1 minute, log blocker and start fallback; never idle.

## Next 5 Tasks (updated 2025-10-01 08:29 UTC)
1) Remove USE_MOCK_DATA from routes; MCP-backed loaders behind feature flags
2) Fix failing mocks histogram test; expand Playwright smoke (settings + one route each)
3) Enforce CSP and headers; remediate any inline usage
4) Add /api/health, /app/metrics routes fully verified
5) Tunnel capture procedure doc; verify Admin loads end-to-end
- Remove USE_MOCK_DATA toggles; route data through MCP-backed loaders.
- Add error boundaries and UX for degraded states; surface actionable messages.
- Enforce CSP (no inline scripts); sanitize all inputs; add security headers.
- Update Playwright smoke to cover settings + one route per feature.
- Append results to feedback/dashboard.md.

# Dashboard Build Overview

## Current Snapshot
- Section 0 Remix scaffold lives under `dashboard/`; Shopify CLI link + dev tunnel verified (`shopify app dev --store=afafsaf.myshopify.com --no-update`).
- Scenario-driven mocks power every route via `mockState` query param (`base`, `empty`, `warning`, `error`) with shared builders in `dashboard/app/mocks/*` and typed contracts in `dashboard/app/types/`.
- Polaris shells for `/app`, `/app/sales`, `/app/orders`, `/app/inbox`, `/app/inventory`, `/app/seo`, `/app/settings` now render off those datasets (filters persist via URL params, loaders gated behind `USE_MOCK_DATA`); Orders includes fulfillment metrics, shipment/return summaries, and inventory hold callouts. Inbox refreshed this sprint alongside a wholesale `/app/inventory` rebuild: buckets are tabbed via query params, SKU detail modal exposes velocity + mock trend, and the new vendor PO planner delivers inline edits with draft-save + CSV export stubs.
- Settings loader/actions respect mock mode (`USE_MOCK_DATA=true`) with in-memory persistence via `storeSettingsRepository`; banner messaging clarifies edits are non-destructive and ready to swap to real storage.
- Data-layer scaffolding landed: Shopify Admin client wrapper (`app/lib/shopify`), SEO provider stubs (`app/lib/seo`), inbox providers, encryption helpers, Store settings repository with mocked persistence, and new `withCache` helper for future Redis-backed caching.
- Vitest coverage in `dashboard/app/tests/seo.aggregate.test.ts` validates the mock aggregation path (run via `npx vitest run --config dashboard/vitest.config.ts`).
- RAG API hardened for credential-less environments—falls back to HuggingFace embeddings + retrieval-only summaries when `OPENAI_API_KEY` missing (`app/rag_api/main.py`, `rag_config.py`).

## Immediate Needs
1. Populate `dashboard/.env` + `.env.production` with Partner app credentials, tunnel/base URLs, and `DATABASE_URL` before pushing to shared envs.
2. Run `shopify login` and `shopify app config link` interactively to bind the scaffold to the Dashboard app.
3. Assign owners to each `feature/route-*` worktree; keep progress updated in matching `prompts/dashboard/route-*.md` docs.
4. Capture screenshots/video of each route in the embedded shell (mock states: base + warning) once dev server is running, attach to Section 0 archive.

## Coordination Notes
- Leverage `mockState` + `USE_MOCK_DATA=true` to preview edge cases without Shopify auth; unset to exercise live Admin API once credentials are ready.
- Continue collaborating through pre-created branches (`feature/route-dashboard`, `feature/route-sales`, etc.) to reduce merge friction; PR into `main` only after CI + code review.
- Update the relevant prompt doc at end of session; Section 0 owner (Codex) holds env/config changes until real data + MCP integration are wired.
- Remaining engineering focus: replace mock factories with live Shopify/MCP adapters, wire CSV exports + pagination to loaders, stand up persistence for settings + inbox replies, and expand Vitest/Playwright coverage against live data flows.

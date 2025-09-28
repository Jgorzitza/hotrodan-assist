# Dashboard Build Overview

## Current Snapshot
- Section 0 Remix scaffold lives under `dashboard/`; Shopify CLI link + dev tunnel verified (`shopify app dev --store=afafsaf.myshopify.com --no-update`).
- Scenario-driven mocks power every route via `mockState` query param (`base`, `empty`, `warning`, `error`) with shared builders in `dashboard/app/mocks/*` and typed contracts in `dashboard/app/types/`.
- Polaris shells for `/app`, `/app/sales`, `/app/orders`, `/app/inbox`, `/app/inventory`, `/app/seo`, `/app/settings` now render off those datasets (filters persist via URL params, loaders gated behind `USE_MOCK_DATA`). Dashboard home exposes range buttons + deep links into `/sales` and `/orders` using shared query params; sparkline now runs on Polaris Viz with mock trend data. Orders proxies through the Sync service when mocks are disabled and falls back gracefully, surfacing Fulfillment Pulse, shipments, returns, and operational notes with toast + banner feedback. Inbox refreshed this sprint alongside a wholesale `/app/inventory` rebuild: buckets are tabbed via query params, SKU detail modal exposes velocity + mock trend, and the new vendor PO planner delivers inline edits with draft-save + CSV export stubs.
- SEO insights route now layers the Polaris Viz line chart for keyword trends, severity-organized action queue with assignment/status chips, adapter toggles with fallback copy, keyword/page tables wired to CSV export, and Zod-validated query params (date range, severity, search, mock state) with TODO markers where real Prisma persistence + background exports will land.
- Settings loader/actions respect mock mode (`USE_MOCK_DATA=true`) with in-memory persistence via `storeSettingsRepository`; `runConnectionTest` now exercises GA4/GSC/Bing adapters so history + banners surface real mock diagnostics, and banner messaging clarifies edits are non-destructive while we prep Prisma storage.
- Data-layer scaffolding landed: Shopify Admin client wrapper (`app/lib/shopify`), SEO provider stubs (`app/lib/seo`), inbox providers, encryption helpers, Store settings repository with mocked persistence, new `withCache` helper for future Redis-backed caching, plus Prisma schema + seeds for Store/OrderFlag/Ticket/SEO/Velocity/PO models (`npm run prisma:seed` hydrates the demo dataset).
- Webhooks diagnostics (`/queue/webhooks`) now persist Shopify webhook registrations, order flags, and product velocity snapshots to Prisma (new `WebhookRegistry` migration) with BullMQ/Upstash queue support gated by `WEBHOOK_QUEUE_DRIVER`; diagnostics fall back to the in-memory stub when the flag is off.
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
- Remaining engineering focus: replace mock factories with live Shopify/MCP adapters, wire CSV exports + pagination to loaders, stand up persistence for settings + inbox replies, flesh out the BullMQ worker processors (Zoho + analytics jobs), and expand Vitest/Playwright coverage against live data flows.
- Prisma CLI config migration completed (`dashboard/prisma.config.ts`). As of 2025-09-30 `npm run prisma:generate`, `npm run prisma:db-push:sqlite -- --force-reset`, and `npm run prisma:seed` all pass on `feature/route-sales-drilldown`; CI smoke check remains scheduled post-Oct 1 (tracked in `coordination/2025-09-26_prisma-config-plan.md`).

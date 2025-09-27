You are an expert Shopify app engineer.

## Status
- Section 0 complete: CLI linked and dev preview verified on afafsaf.myshopify.com (2025-02-14).
- Environment files (`.env`, `.env.production`) awaiting partner secrets before committing.

 Build a production-ready, embedded **Remix** app called **Dashboard** for Hot Rod AN that runs inside Shopify Admin. The dev store is **afafsaf.myshopify.com** and the live store is **fm8vte-ex.myshopify.com**. The app must be installable on both stores with zero code changes (env-only flips). After the basics are running, we will integrate Shopify’s **Storefront MCP** (https://shopify.dev/docs/apps/build/storefront-mcp) for extended data access. Scaffold thoroughly, annotate key files, and output exact CLI commands.

#Parallel development
- Once this file is analyzed break out the tasks in multiple files for each component eg. Main dashboard, SEO page, Customer page, ect. Provide this list to the user after completion so he can begin multiple instances of development
- All individual agents will keep progress updated in there own files with a summary provided into a main file for analysis
- Adjust plan as you feel is needed to speed through this process with working code and experience. We are on a time crunch.

# Non-negotiable goals
- One-person control center to scale revenue from ~$1M → $10M.
- Fast, pragmatic UX; all key ops from a single Admin app.
- Clean dev→live promotion (same app, different env/config).
- Extensible: clear adapters for SEO data (GA4, GSC, Bing) and for AI inbox workflows.

# Tech stack (current best practice)
- **Shopify CLI** (latest), **@shopify/shopify-app-remix**, **Remix**, **TypeScript**.
- **Polaris** (UI), **App Bridge** (embedded).
- **GraphQL Admin API** (primary), REST only if necessary.
- **SQLite** for dev session/store data → **Postgres** in prod via Prisma.
- **Background jobs** via Remix resource routes/cron (simple, no extra worker).
- **Storefront MCP**: create a module boundary now (typed interfaces & stubs), wire later.

# CLI scaffolding (output exact commands)
1. Create app (Remix):
   - `npm i -g @shopify/cli @shopify/app` (if needed)
   - `shopify app init dashboard --template remix`
   - `cd dashboard`
   - `npm i`
2. Link to the existing app configured in Partners:
   - `shopify app config link`  (select “Dashboard” app)
3. Dev preview (dev store):
   - `shopify app dev --store=afafsaf.myshopify.com`
4. Sanity (live store preview when needed):
   - `shopify app dev --store=fm8vte-ex.myshopify.com`

# Environment & configuration
- Create `.env` and `.env.production`:

- In **Partners → App setup**, add both dev tunnel and prod URLs to allowed callbacks/redirects. After changes: `shopify app deploy` (deploys config, not the server).

# Routes (top-level navigation)
- `/` (Dashboard home)
- `/sales`
- `/orders`
- `/inbox`
- `/inventory`
- `/seo`
- `/settings`

Provide a **file tree** and **minimal code stubs** for each route with Polaris components:
- Global date range selector via URL params.
- DataTable + Filters with persisted search params.
- Skeletons and empty states.

# Dashboard (/) widgets + drilldowns
1. **Sales Overview**
 - KPIs: GMV, Orders, AOV, Refunds; compare period vs **YoY/MoM/WoW**.
 - Sparkline charts (Polaris + a lightweight chart lib).
 - Period presets: Today, 7d, 28d, 90d, Custom.
 - Click-through to `/sales` maintaining date filters.
2. **Orders Attention**
 - Buckets: Open & Unfulfilled; Fulfilled but tracking “not moving”; Delivery issues.
 - Links to `/orders` with corresponding filter.
3. **Customer Inquiries Snapshot**
 - Outstanding count, Overdue >12h, Approvals pending (AI).
4. **Inventory Snapshot**
 - Low stock (threshold), POs in-process (ETA), Overstock (promo suggestion).
5. **SEO Highlights**
 - Traffic delta, rising queries/pages, critical issues (indexing, 404s).

# /sales
- Drilldown pivots: Date → Collection → Product → Variant (SKU).
- Top repeat customers, highest order value, cohort repeat rate, time-to-second-purchase.
- Highest selling / lowest selling products.
- Export CSV.

# /orders
- Tabs: **Unshipped**, **Delivery issues**, **Completed**.
- Flag orders with customer-reported issues (wrong item, not received, etc.).
- Bulk actions: mark investigated, draft reship/refund (placeholder mutation endpoints).

# /inbox (AI-assisted customer inquiries)
- Unified queue (email, Shopify contact form, social adapters → stubs).
- AI draft: Approve (send unchanged; positive reward), or Edit (human modifies, then send; store both versions to improve future drafts).
- Metrics: Outstanding, Overdue >12h, Closed, Common-question clusters, New product ideas mined from requests.

# /inventory (demand planning)
- Buckets:
- Need urgently (local supplier <2 days).
- Manufacturer sea ship (prod ~20d + delivery ~30d).
- Manufacturer air ship (prod ~30d + delivery ~5d).
- Product trends, velocity, stockout risk date per SKU.
- Product ranking; promo suggestions for overstock.
- PO planner: Draft POs by vendor with recommended quantities.

# /seo
- Data sources: GA4, Google Search Console, Bing Webmaster Tools.
- Cards: Content trends, keyword movements, page health, indexation anomalies, Core Web Vitals placeholders.
- Action list with severities: **Now**, **Soon**, **Later**.
- Keyword tracking table (clicks, CTR, position deltas).
- Page tracking (entrances, exits, conversions where available).
- Export CSV.

# Data layer and modules (generate typed stubs)
- `app/lib/shopify/admin.ts` — Admin GraphQL client factory.
- `app/lib/shopify/queries.ts` — KPIs, orders by status, inventory, customer stats.
- `app/lib/seo/ga4.ts`, `gsc.ts`, `bing.ts` — typed adapters with mock providers in dev.
- `app/lib/inbox/providers.ts` — channel adapters (email, FB/IG, TikTok) with stubs.
- `app/lib/inventory/math.ts` — velocity, stockout date, reorder point, safety stock.
- **Storefront MCP boundary now**:
- `app/lib/mcp/types.ts` — interfaces for MCP tools/resources we’ll call.
- `app/lib/mcp/client.server.ts` — stub client with method signatures, retry skeleton, and telemetry hooks.
- Provide an example resource read (e.g., product recommendations) and a mock via `app/lib/mcp/mocks.ts`.

# Webhooks (register + handlers)
Register on install and ensure per-store persistence:
- Topics: `orders/create`, `orders/fulfilled`, `fulfillments/update`, `products/update`, `app/uninstalled`.
- Provide:
1) registration code (during OAuth/install)
2) HMAC verification middleware (raw body)
3) sample handlers writing to SQLite (dev) or Postgres (prod)
- Include **test commands**:


# Database
- Prisma schema with models:
- `Store` (shop domain, access token, settings)
- `KpiCache`, `OrderFlag`, `Ticket`, `TicketMessage`, `SeoInsight`, `ProductVelocity`, `PurchaseOrder`, `AiDraft`
- Migrations: `npx prisma migrate dev` (SQLite) and prod notes for Postgres.

# Settings page
- Thresholds: low-stock min, overdue hours (default 12), overstock definition.
- SEO API keys & property IDs (GA4, GSC, Bing) stored encrypted.
- Feature toggles: enable MCP data fetch once available.

# Security & limits
- Store tokens per shop; never hard-code store domains.
- Rate-limit Admin API calls; graceful backoff on 429.
- HMAC verify for every webhook; respond 200 in <5s then process async.
- Secrets in env; never commit.

# Dev→Live guidance (must be frictionless)
- Same app credentials; only `APP_URL` and DB change by env.
- Both dev tunnel and prod URLs whitelisted; after edits: `shopify app deploy`.
- Install app on **afafsaf.myshopify.com** for dev and **fm8vte-ex.myshopify.com** for live; data (webhooks/tokens) are per store, code is shared.

# Output required (don’t skip)
1. **Exact CLI commands** to scaffold and run.
2. **File tree** with key files and short comments.
3. **Concrete code stubs** for each route (Remix loaders/actions, Polaris UI).
4. **Admin GraphQL queries** for KPIs, orders by status, inventory low-stock, customer repeats/LTV.
5. **Webhook registration & handlers** with HMAC middleware (raw body).
6. **Prisma schema** (SQLite dev, Postgres prod note).
7. **Settings page** stub with thresholds & SEO keys.
8. **Seed & mock data** for all pages so the UI loads before real API keys.
9. **Testing section**: curl examples + `shopify app webhook trigger` examples.
10. **Deployment notes**: containerize (Dockerfile) + generic host (Fly/Render) steps.
11. **MCP integration stubs**: `client.ts`, `types.ts`, and a demo call placeholder used by one widget.

# Acceptance criteria
- `shopify app dev --store=afafsaf.myshopify.com` launches an embedded app that renders all pages with mock data.

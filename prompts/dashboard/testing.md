# Testing & Verification Plan

## Scope
Comprehensive test strategy for the Remix dashboard covering UI flows, Remix loaders/actions, database interactions, background sync jobs, and Shopify webhook handling.

## Environments & Test Data
- **Local:** Remix dev server with SQLite/Planetscale shadow DB seeded via `npm run seed`.
- **Staging:** Hosted sandbox (same Shopify app + staging store) used for end-to-end flows and webhook drills.
- **Production Shadow:** Read-only replica for smoke validation; never write directly.
- **Seed Data:** Maintain deterministic fixtures for orders/inventory; capture fixture refresh instructions in `prompts/dashboard/seed-data.md`.

## Test Layers & Ownership
- **Static analysis:** ESLint + TypeScript; run on every commit and CI gate.
- **Unit tests:** Vitest targeting utility/libs (e.g., inventory math, date helpers). Owner: Feature engineer.
  - Run locally with `npx vitest run --config dashboard/vitest.config.ts` (includes `app/tests/seo.aggregate.test.ts`).
- **Integration tests:** Remix loader/action tests using `@remix-run/testing` + in-memory DB or Prisma test schema. Owner: Feature engineer with QA pairing.
- **E2E UI tests:** Playwright driving critical dashboard routes (overview, orders, inventory, settings). Owner: QA.
- **Webhook drills:** CLI-triggered Shopify webhook payloads with DB assertions. Owner: Integrations engineer.
- **Load/regression:** Nightly Playwright smoke plus webhook replay to guard against regressions.

## Manual Test Checklist
### Cross-route
- Login via Shopify OAuth; verify tenant scoping, session persistence, and sign-out.
- Confirm navigation shell (sidebar, breadcrumbs, search) is responsive desktop/mobile.
- Validate audit log captures key mutations and is filterable by actor + date.
- Toggle `mockState` query parameter (base/empty/warning/error) and confirm loaders render the appropriate empty/error banners without breaking navigation.
- Link acceptance criteria: add Figma QA checklist URL in the associated Jira ticket.

### Route: Overview
- KPI cards show accurate totals vs seed fixtures; hover tooltips expose last updated timestamp.
- Activity feed paginates correctly; empty state matches design.
- Refresh button triggers background sync and surfaces loading indicator.
- Link acceptance criteria: Figma Overview spec (TBD).

### Route: Orders
- Table columns match design ordering; pagination + infinite scroll behave.
- Filters: status, fulfillment, date range; ensure URL params persist across reloads.
- Order detail drawer displays timeline events, notes, and fulfillment actions.
- Detail modal mock action: trigger "Mark investigated" and confirm success banner + modal close.
- Exports: initiate CSV export, confirm toast, poll export status row.
- Negative: induce 429 via mock adapter and validate retry/backoff messaging.
- Link acceptance criteria: Figma Orders spec (TBD).

### Route: Inventory
- Low-stock filter and search operate concurrently; results reflect fixture quantities.
- Bulk adjust quantities: select items, submit change, confirm audit entry + toast.
- Reorder point suggestion modal pulls correct supplier info.
- CSV export contains staged adjustments; confirm background job updates status.
- Link acceptance criteria: Figma Inventory spec (TBD).

### Route: Sales Analytics
- Chart renders with correct aggregation; switch between daily/weekly increments.
- Compare period toggle rewrites loader query and updates summary deltas.
- Drill-down links to Orders route with pre-applied filters.
- Failover: mock analytics API failure => show fallback card with retry CTA.
- Link acceptance criteria: Figma Sales spec (TBD).

### Route: SEO
- Keyword table sorts by traffic, CPC; filters by channel.
- Recommendations accordion expands/collapses with persisted state per user.
- Action buttons deep-link to Shopify admin; verify correct store + resource.
- Link acceptance criteria: Figma SEO spec (TBD).

### Route: Settings
- Update operational thresholds; expect inline validation, toast confirmation, and persisted values on refresh.
- Toggle MCP/experimental/beta flags; confirm optimistic checkbox state and toast success.
- Save/remove GA4/GSC/Bing credentials; ensure masking (`••••1234`), rotation reminder persistence, and warning banner when credential missing.
- Run Test Connection for each provider; success → success toast, missing credential → error banner, warning scenario → warning banner.
- Link acceptance criteria: Figma Settings spec (TBD).

## Automation Strategy
- **Unit:** Tests in `app/tests/unit` using Vitest + light fakes. Focus on data transforms, webhook signature validation, and pricing math.
- **Mocks / Settings:** Vitest coverage for scenario builders (`dashboard/app/mocks/__tests__`) and the StoreSettings repository (`dashboard/app/lib/settings/__tests__`) runs via `npx vitest run`.
- **Integration:** Use `invokeLoader` / `invokeAction` helpers in `app/tests/integration/setup.ts` to exercise Remix loaders/actions with synthetic `Request` objects (see `orders-loader.test.ts`, `action-handler.test.ts`). Swap `process.env.DATABASE_URL="file:./tmp.db"` for isolated Prisma schema; assert HTTP status, redirects, and DB side-effects.
- **E2E:** Playwright specs in `e2e/` with optional authenticated storage (`e2e/.auth/admin.json`). Set `PLAYWRIGHT_BASE_URL` + `PLAYWRIGHT_WEB_SERVER` to target local/staging servers. Default describe skips when base URL absent.
- **Visual regression:** Optional Applitools or Playwright trace compare on overview cards.
- **CI hooks:** GitHub Actions matrix (Node 20) splitting Vitest vs Playwright. Cache npm + Playwright browsers; upload traces on failure.

## Webhook Verification
- Preferred: `scripts/shopify_webhook_replay.sh orders/updated` (Shopify CLI) or fallback curl with signed payloads + generated HMAC.
- After replay, validate Prisma `webhook_events` entry, dependent aggregates (orders/inventory), and worker job completion inside 60s.
- Negative: invalid HMAC (`expect 401`), duplicate delivery (idempotency guard), delayed processing (>5 min) triggers alert webhook.
- Capture drill evidence (command transcript + DB snapshot) in release/QA ticket.

## Tooling & Observability
- Vitest, Playwright, ESLint, TypeScript, Prisma test harness, MSW for request mocking.
- Capture CI artifacts: Playwright traces/videos, Vitest coverage reports.
- Pager duty hook: alert on failing nightly regression.
- Logging verification: Ensure structured logs ship to monitoring (Datadog/NewRelic) with request IDs.

## Post-Deploy Smoke Checklist
- Source of truth: `prompts/dashboard/smoke-checklist.md` (login, freshness, webhook replay, observability, rollback readiness).
- Run immediately after staging/prod deploys; capture findings + evidence links in release ticket.

## Entry / Exit Criteria
- **Entry:** Feature PR merged into `feature/testing` worktree with passing unit/integration suite.
- **Exit:** All checklists executed, automated suites green, webhook drills pass, deployment smoke validated.
- Sign-off captured in issue template with evidence links (CI run URL, logs).

## Tasks
- [x] Flesh out manual test cases per route, link to Figma acceptance criteria.
- [x] Scaffold Vitest + testing utilities under `app/tests/unit`.
- [x] Add Remix loader/action integration harness and seed fixtures.
- [x] Create Playwright project with auth storage fixtures and environment switch.
- [x] Document webhook replay scripts and expected DB assertions.
- [x] Wire CI workflows (lint, test, e2e) with caching + artifacts.
- [x] Publish smoke checklist for post-deploy verification.

## Status / Notes
- Owner: _unassigned_
- Blockers: _none_
- Notes: Manual QA coverage outlined per dashboard route; Vitest/Playwright scaffolding landed in repo with placeholder specs. Inbox/Inventory mocks now seeded via faker; loaders expose `mockState` + URL params—ensure fixtures cover those permutations when real data arrives.

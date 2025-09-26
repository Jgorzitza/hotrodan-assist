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
- **Integration tests:** Remix loader/action tests using `@remix-run/testing` + in-memory DB or Prisma test schema. Owner: Feature engineer with QA pairing.
- **E2E UI tests:** Playwright driving critical dashboard routes (overview, orders, inventory, settings). Owner: QA.
- **Webhook drills:** CLI-triggered Shopify webhook payloads with DB assertions. Owner: Integrations engineer.
- **Load/regression:** Nightly Playwright smoke plus webhook replay to guard against regressions.

## Manual Test Checklist
### Cross-route
- Login via Shopify OAuth; verify tenant scoping, session persistence, and sign-out.
- Confirm navigation shell (sidebar, breadcrumbs, search) is responsive desktop/mobile.
- Validate audit log captures key mutations and is filterable by actor + date.
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
- Environment badges display for development/staging; prod hides debug toggles.
- Rotate webhook secret => confirm DB update, forced re-subscribe, regenerated HMAC.
- User role management: invite, revoke, downgrade; verify email template triggered.
- Link acceptance criteria: Figma Settings spec (TBD).

## Automation Strategy
- **Unit:** Locate tests in `app/tests/unit`. Use Vitest + `ts-mockito`/plain fakes. Focus on data transforms, webhook signature validation, and pricing math.
- **Integration:** Place under `app/tests/integration`. Spin Prisma test schema via `process.env.DATABASE_URL="file:./tmp.db"`. Cover Remix loaders/actions, verifying HTTP status, redirects, and DB effects.
- **E2E:** Playwright specs in `e2e/`. Use fixtures for authenticated session (`storageState.json`). Critical flows: onboarding, order review, export download, inventory edit, settings save.
- **Visual regression:** Optional Applitools or Playwright trace compare on overview cards.
- **CI hooks:** GitHub Actions matrix (Node 18 & 20). Parallel jobs for unit/integration vs Playwright. Cache npm + Playwright browsers.

## Webhook Verification
- Register webhooks in staging using `shopify app webhook trigger` or `curl` with signed payloads.
- Validate DB side-effects via Prisma Studio or SQL snapshots.
- Assert background jobs (queue processing) via log drains; include retry/backoff scenario.
- Document negative tests: outdated HMAC, duplicate delivery, delayed processing.

## Tooling & Observability
- Vitest, Playwright, ESLint, TypeScript, Prisma test harness, MSW for request mocking.
- Capture CI artifacts: Playwright traces/videos, Vitest coverage reports.
- Pager duty hook: alert on failing nightly regression.
- Logging verification: Ensure structured logs ship to monitoring (Datadog/NewRelic) with request IDs.

## Entry / Exit Criteria
- **Entry:** Feature PR merged into `feature/testing` worktree with passing unit/integration suite.
- **Exit:** All checklists executed, automated suites green, webhook drills pass, deployment smoke validated.
- Sign-off captured in issue template with evidence links (CI run URL, logs).

## Tasks
- [ ] Flesh out manual test cases per route, link to Figma acceptance criteria.
- [ ] Scaffold Vitest + testing utilities under `app/tests/unit`.
- [ ] Add Remix loader/action integration harness and seed fixtures.
- [ ] Create Playwright project with auth storage fixtures and environment switch.
- [ ] Document webhook replay scripts and expected DB assertions.
- [ ] Wire CI workflows (lint, test, e2e) with caching + artifacts.
- [ ] Publish smoke checklist for post-deploy verification.

## Status / Notes
- Owner: _unassigned_
- Blockers: _none_
- Notes: Manual QA coverage outlined per dashboard route; Vitest/Playwright scaffolding landed in repo with placeholder specs.

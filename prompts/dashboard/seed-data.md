# Seed & Mock Data Plan

## Goals
- Provide deterministic, type-safe mock data that powers every dashboard route until live integrations exist.
- Mirror the shapes consumed by Remix loaders and React components so swapping to production data is a drop-in change.
- Capture realistic ranges, outliers, and status permutations so QA can validate happy, empty, warning, and error states.

## Dataset Inventory
- **Sales (`app/mocks/sales.ts`)**: totals (daily/weekly/monthly), trend deltas, channel attribution, forecast variance scenarios.
- **Orders (`app/mocks/orders.ts`)**: paginated orders with status mix (Paid, Processing, Fulfilled, Refunded), fulfillment SLA edge cases, priority tiers (VIP/Rush/Standard), inventory hold metadata, linked support conversations, and timeline events.
- **Order Shipments (`app/mocks/orders.shipments.ts`)**: tracking pending queue, delayed shipments with carrier + delay hours, delivered-today counts, sync timestamps.
- **Order Returns (`app/mocks/orders.returns.ts`)**: pending stages, refund exposure amounts, clustered reasons for analysis.
- **Inbox (`app/mocks/inbox.ts`)**: support tickets, priority flags, sentiment, assignment, canned responses for empty and overdue queues.
- **Inventory (`app/mocks/inventory.ts`)**: catalog summaries, low-stock alerts, backorder and preorder examples, velocity metrics.
- **Sales Route Tiles (`app/mocks/kpis.ts`)**: reusable KPI cards (AOV, conversion, returning customers) with threshold metadata for warning states.
- **SEO (`app/mocks/seo.ts`)**: keyword rankings, lighthouse scores, crawl issues, content opportunities with confidence scores.
- **Settings (`app/mocks/settings.ts`)**: operational thresholds (low-stock minimum, overdue hours, overstock buffer), feature toggles, masked SEO secrets metadata (GA4/GSC/Bing), per-adapter connection history/status badges, and rotation reminders.
- **Shared (`app/mocks/shared.ts`)**: helpers for currency formatting, faker seed setup, and reusable date ranges.

## File Layout
```
app/
  mocks/
    index.ts                // central exports + USE_MOCK_DATA gate
    factories/
      dates.ts              // deterministic date helpers
      numbers.ts            // seeded random number utilities
    sales.ts
    orders.ts
    orders.shipments.ts
    orders.returns.ts
    inbox.ts
    inventory.ts
    seo.ts
    settings.ts
    kpis.ts
  routes/
    dashboard.sales/loader.ts
    ...
```

## Data Generation Strategy
- Use `@faker-js/faker` seeded with `faker.seed(42)` to ensure reproducibility.
- Prefer factory functions returning typed records (`SalesOverview`, `Order`, etc.) instead of static JSON so we can vary counts per scenario.
- Export named scenario builders (e.g., `getSalesScenario("warning")`) for QA to toggle between base, empty, warning, error.
- Co-locate TypeScript types with their loader or data-layer counterparts; re-export types from `app/types/dashboard.ts` to avoid circular deps.
- Keep payload sizes < 100 items per collection to maintain sub-second loader times.
- Settings factory should output `SettingsPayload` with defaults, overrides, masked secrets, connection badge state, and rotation metadata; expose helpers per store to simulate stale credentials vs freshly verified ones.
- Orders factories should precompute backlog metrics (awaiting fulfillment, overdue pct, avg fulfillment hours, breach counts) so `/orders` loader can return deterministic aggregates per scenario.

## Integration Pattern
- Create `USE_MOCK_DATA` boolean via Remix server env (`process.env.USE_MOCK_DATA === "true"`).
- In each loader, branch early:
  ```ts
  import { getSalesSummary } from "~/mocks";

  export async function loader({ context }: LoaderArgs) {
    if (USE_MOCK_DATA) {
      return json(await getSalesSummary(context.params));
    }
    return fetchLiveSales(context);
  }
  ```
- Expose mock scenario querystring override (`?mockState=empty`) during development by reading from `request.url`.

## Test Coverage
- Add unit tests under `app/mocks/__tests__` validating deterministic outputs and schema alignment (`zod` or TypeScript assertion tests).
- Expand route loader tests to exercise both mock and live branches using scenario overrides.
- Ensure Storybook stories (if available) import mock factories for consistent visuals.
- For settings, validate that masked secrets never leak plaintext and that connection status permutations cover success, warning, and error.

## Tasks
- [ ] Define TypeScript interfaces per dataset and export from `app/types/dashboard.ts`.
- [ ] Scaffold `app/mocks/` directory structure and seed utilities.
- [ ] Implement primary scenario factories for each dataset (base, empty, warning, error).
- [ ] Wire `USE_MOCK_DATA` toggle into Remix loaders and document usage in `README`.
- [ ] Add minimal Jest/Vitest coverage asserting deterministic mock outputs.
- [ ] Document developer workflow for switching scenarios.
- [ ] Ensure settings scenarios include masked secrets, rotation reminders, and connection status variance.

## Documentation & Handoff
- Update route-specific docs under `prompts/dashboard` to reference the new mock entry points.
- Add `scripts/populate-mock-data.ts` if future CLI seeding is required.
- Keep this plan updated as new routes/components land; open a task whenever a loader needs additional mock permutations.
- Prisma harness (`prisma/seed.ts`) now hydrates the demo store/settings/ticket dataset; update the script alongside mock contract changes so database seeds and mock loaders stay in sync.

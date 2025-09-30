# Seed & Mock Data Plan

## Goals
- Provide deterministic, type-safe mock data that powers every dashboard route until live integrations exist.
- Mirror the shapes consumed by Remix loaders and React components so swapping to production data is a drop-in change.
- Capture realistic ranges, outliers, and status permutations so QA can validate happy, empty, warning, and error states.

## Dataset Inventory
- **Sales (`app/mocks/sales.ts`)**: totals (daily/weekly/monthly), trend deltas, channel attribution, forecast variance scenarios.
- **Orders (`app/mocks/orders.ts`)**: paginated orders with status mix (Paid, Processing, Fulfilled, Refunded), timeline events, fulfillment SLA edge cases.
- **Inbox (`app/mocks/inbox.ts`)**: support tickets, priority flags, sentiment, assignment, canned responses for empty and overdue queues.
- **Inventory (`app/mocks/inventory.ts`)**: catalog summaries, low-stock alerts, backorder and preorder examples, velocity metrics.
- **Sales Route Tiles (`app/mocks/kpis.ts`)**: reusable KPI cards (AOV, conversion, returning customers) with threshold metadata for warning states.
- **SEO (`app/mocks/seo.ts`)**: keyword rankings, lighthouse scores, crawl issues, content opportunities with confidence scores.
- **Settings (`app/mocks/settings.ts`)**: merchant profile, plan limits, team invites, feature flags.
- **Shared (`app/mocks/shared.ts`)**: helpers for currency formatting, faker seed setup, and reusable date ranges.

## Dataset Schemas
- **SalesOverview**
  - `period: "Today" | "Yesterday" | "Last 7 days" | "MTD"`
  - `gross`, `net`, `forecast`, `variancePct`, `channelMix[]`, `topProducts[]`
  - `channelMix` spans `shopify`, `marketplace`, `assistant`, `in-store`
- **OrderSummary**
  - `orders[]` with `id`, `status`, `placedAt`, `expectedShipAt`, `lineItems[]`, `slaRisk`
  - Paginated envelope `{ nodes: Order[], pageInfo: { hasNextPage, cursor } }`
- **InboxThread**
  - `conversationId`, `channel`, `customer`, `lastMessageAt`, `slaBreach`, `draftStatus`, `sentiment`, `labels[]`
  - Include nested `messages[]` with abbreviated bodies for UI hover states
- **InventoryItem**
  - `sku`, `name`, `onHand`, `daysOfCover`, `status`, `reorderPoint`, `velocity`
  - Optional `incomingShipment` with `eta`, `quantity`
- **KpiCard**
  - `id`, `label`, `value`, `changePct`, `changeDirection`, `target`, `status`, `trend[]`
- **SeoReport**
  - `keywords[]` (position, change, volume), `crawlIssues[]`, `lighthouse` scores, `contentOpportunities[]`
- **SettingsPayload**
  - `merchant`, `team[]`, `plan`, `featureFlags`, `integrations`

## Scenario Matrix
```
| Scenario | Sales | Orders | Inbox | Inventory | KPI Tiles | SEO | Settings |
|----------|-------|--------|-------|-----------|-----------|-----|----------|
| base     | Normalized mix with slight growth | Healthy mix, 1 pending refund | 1 SLA amber | 1 low-stock warning | AOV up, conversion flat | Minor crawl issues | Default plan |
| empty    | Zero revenue, copy uses "No data" patterns | No orders returned | No threads | All inventory counts zeroed | KPI cards show placeholders | No keyword data | Minimal merchant profile |
| warning  | Revenue dip, forecast missed | 3 delayed fulfillments | 2 SLA breaches | 2 critical SKUs | Conversion down 12% | Lighthouse accessibility fail | Plan near limit |
| error    | Throw to error boundary (simulate fetch failure) | Timeout condition | Loader returns 500 | Missing inventory response | KPI loader rejects | SEO endpoint 404 | Settings env misconfigured |
```

## File Layout
```
app/
  types/
    dashboard.ts           // shared dataset interfaces
  mocks/
    index.ts                // central exports + USE_MOCK_DATA gate
    factories/
      dates.ts              // deterministic date helpers
      numbers.ts            // seeded random number utilities
    scenarios/
      dashboardHome.ts      // JSON-backed scenario selectors per route
      sales.ts
    utils/
      loadFixture.ts        // lazy JSON loader with in-memory cache
    sales.ts
    orders.ts
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

## Scenario Implementation Notes
- **Base**: represents normal operating conditions with healthy growth and occasional alerts. Populate channel mixes and KPIs with slight positive deltas.
- **Empty**: ensure UI gracefully handles zero arrays and null-like values. Use `undefined` instead of empty strings so components can branch on optional chaining.
- **Warning**: surface near-SLA breaches, inventory backorders, and conversion downturns. Provide single-thread callouts for router prompts to reference.
- **Error**: throw Remix `Response` objects with HTTP status to exercise error boundaries. Include telemetry context (`mock: true`) to distinguish from real failures.

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

## QA Hooks
- Add `/dashboard?mockState=warning` shortcuts to router docs and QA scripts.
- Provide Storybook stories per scenario to visualize all state permutations quickly.
- Capture snapshot tests for GraphQL or REST mocks so loader schema drift is caught during CI.

## Test Coverage
- Add unit tests under `app/mocks/__tests__` validating deterministic outputs and schema alignment (`zod` or TypeScript assertion tests).
- Expand route loader tests to exercise both mock and live branches using scenario overrides.
- Ensure Storybook stories (if available) import mock factories for consistent visuals.

## Tasks
- [x] Bootstrap canonical JSON fixtures for `dashboard-home` and `sales` scenarios.
- [x] Define TypeScript interfaces per dataset and export from `app/types/dashboard.ts`.
- [x] Scaffold `app/mocks/` directory structure and seed utilities.
- [x] Implement primary scenario factories for each dataset (base, empty, warning, error).
- [x] Wire `USE_MOCK_DATA` toggle into Remix loaders and document usage in `README`.
- [x] Add minimal Jest/Vitest coverage asserting deterministic mock outputs.
- [x] Document developer workflow for switching scenarios.

## Documentation & Handoff
- Update route-specific docs under `prompts/dashboard` to reference the new mock entry points.
- Add `scripts/populate-mock-data.ts` if future CLI seeding is required.
- Keep this plan updated as new routes/components land; open a task whenever a loader needs additional mock permutations.
- Developer workflow:
  1. Set `USE_MOCK_DATA=true` in `.env` to enable mocks locally.
  2. Append `?mockState=<state>` to dashboard URLs to pivot scenarios on demand.
  3. Run `npm install` once, then `npm test` to ensure mock builders stay deterministic.
  4. Update fixtures in `prompts/dashboard/examples/` whenever builder outputs change.

## Milestones & Ownership
- **Week 1 – Foundations (Justin, Priya)**: confirm type definitions, scaffold `app/mocks`, wire `USE_MOCK_DATA` flag, land smoke tests.
- **Week 2 – Scenario Coverage (QA, Devon)**: implement warning/error permutations, hook Storybook/Chromatic snapshots, align prompt docs.
- **Week 3 – Integration Hardening (Full squad)**: dual-run mock vs live loaders, add observability for scenario overrides, prep handoff notes.
- **Week 4 – Cutover Readiness (Ops)**: validate data behind feature flag, update runbooks, archive outdated mock paths.

## Maintenance Guidelines
- Treat mock factories as first-class data sources; update them in the same PR as schema changes to loaders or UI components.
- Gate any new scenario behind a descriptive enum (e.g., `MockState.CRITICAL_BACKORDER`) to avoid stringly-typed checks.
- Version datasets that may diverge from production (e.g., SEO); include `schemaVersion` in payloads so consumers can opt-in gradually.
- Document breaking changes in `prompts/dashboard/CHANGELOG.md` with before/after payload snippets.
- Update `app/types/dashboard.ts` whenever loader shapes shift; fixtures and factories must stay aligned.

## Sample Payloads
```ts
// Sales base scenario
export const salesBase: SalesOverview = {
  period: "Last 7 days",
  gross: 42750,
  net: 39860,
  forecast: 41000,
  variancePct: 4.3,
  channelMix: [
    { channel: "shopify", revenue: 28500, deltaPct: 6.1 },
    { channel: "assistant", revenue: 7200, deltaPct: 12.4 },
    { channel: "marketplace", revenue: 4140, deltaPct: -2.2 },
    { channel: "in-store", revenue: 3920, deltaPct: 1.5 }
  ],
  topProducts: [
    { sku: "AN-8-HOSE", name: "AN-8 PTFE Hose Kit", revenue: 8200, deltaPct: 21.8 },
    { sku: "EFI-RETROFIT", name: "EFI Retrofit Bundle", revenue: 6700, deltaPct: 9.4 }
  ]
};
```

- Canonical JSON snapshots live under `prompts/dashboard/examples/`. These power prompt QA before the TypeScript factories ship.
- Keep the JSON aligned with the typed factories—treat them as fixtures for docs, Storybook, and golden tests.
- Naming convention: `<route>.<scenario>.json` (e.g., `dashboard-home.warning.json`).
- Scenario coverage currently includes `base`, `empty`, `warning`, and `error` variants for both `dashboard-home` and `sales` routes.
- Reference `prompts/dashboard/examples/README.md` for fixture descriptions and quick-start usage.

```ts
// Inventory warning scenario sample
export const inventoryWarning: InventoryItem[] = [
  {
    sku: "AN-6-BULKHEAD",
    name: "AN-6 Bulkhead Kit",
    onHand: 14,
    daysOfCover: 2.1,
    status: "critical",
    reorderPoint: 25,
    velocity: 6.5,
    incomingShipment: { eta: addDays(now, 7), quantity: 60 }
  },
  {
    sku: "DUAL-TANK-SWITCH",
    name: "Dual Tank Switching Module",
    onHand: 48,
    daysOfCover: 4.4,
    status: "warning",
    reorderPoint: 45,
    velocity: 10.7
  }
];
```

## Scenario Builders
```ts
import { buildDashboardHomeScenario } from "~/mocks/dashboardHome";
import { buildInventoryScenario } from "~/mocks/inventory";
import { buildKpiScenario } from "~/mocks/kpis";
import { buildOrdersScenario } from "~/mocks/orders";
import { buildSalesScenario } from "~/mocks/sales";
import { buildSeoScenario } from "~/mocks/seo";
import { buildSettingsScenario } from "~/mocks/settings";

const dashboardPayload = buildDashboardHomeScenario("warning");
const salesPayload = buildSalesScenario("base");
const ordersPayload = buildOrdersScenario("base");
const inventoryPayload = buildInventoryScenario("warning");
const kpiCards = buildKpiScenario("base");
const seoReport = buildSeoScenario("warning");
const settingsPayload = buildSettingsScenario("base");
```

- Scenario builders return strongly typed payloads matching Remix loader contracts.
- Error scenarios emit `MockErrorPayload`; loaders should branch accordingly.
- Use the builders inside tests and Storybook to avoid duplicating fixture data.

## Loader Toggle
```ts
import { json } from "@remix-run/node";
import { getDashboardHomeData, resolveMockState, shouldUseMockData } from "~/mocks";

export async function loader({ request, context }) {
  if (shouldUseMockData(context?.env ?? process.env)) {
    const state = resolveMockState(request.url);
    return json(getDashboardHomeData(state));
  }
  return fetchLiveDashboard(context);
}
```

- `shouldUseMockData` reads `USE_MOCK_DATA` from Remix server env.
- `resolveMockState` inspects the `mockState` query param (defaulting to `base`).
- Live branch currently throws `501` in the repo until integrations land; replace with production fetch once ready.

## Open Questions & Risks
- Do we need parallel mocks for external integrations (Shopify, Klaviyo) to keep contract tests in sync?
- Should scenario overrides be tenant-scoped or global? (Impacts multi-merchant preview workflows.)
- What SLA do we set for updating mocks after a new dashboard widget lands?
- Can we surface mock provenance metadata in the UI to avoid confusing stakeholders during demos?

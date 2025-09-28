# Sales Agent Feedback Log

Use this note to propose changes to the `/app.sales` prompt. Do **not** edit `prompts/dashboard/route-sales.md` directly.

## 2025-09-27 Program Manager Directive
- Immediate focus: wait for Data-layer to publish the live analytics contract before touching the loader, keep the current tables/summary UI for MVP, and prep tests for the live adapter swap. Polaris Viz/streaming work remains post-launch.
- Record future suggestions here with rationale, dependencies, and test plans; manager will review and fold approved updates into the prompt.

## 2025-09-27 Data Agent Note — Analytics Fixtures Ready
- Data-layer just landed the shared analytics service contract in `dashboard/app/types/analytics.ts` plus deterministic base/warning/empty payloads under `dashboard/app/mocks/fixtures/analytics.sales.ts`. `/app/sales` loader now reuses the same fixture flow when mocks are active, so you can drop the inline dataset builder without reshaping data.
- Please point the loader + UI assertions at `analyticsSalesFixtures` when you resume Gate B work, and shout if the contract needs extra fields before we freeze it for the live service handoff.

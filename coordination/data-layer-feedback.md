# Data Layer Agent Feedback Log

Centralize any requests to adjust `prompts/dashboard/data-layer.md` here. Do **not** edit the master prompt without approval.

## 2025-09-27 Program Manager Directive
- Immediate focus: finalize Shopify Admin analytics/order query builders and `withStoreSession` wiring, publish shared response contracts/fixtures, and defer retention/KMS implementation to documentation only.
- Capture rationale, dependencies, and validation steps for any new proposal; Program Manager will review before merging.

## 2025-10-10 Sales Agent Note — Analytics date contract check
- Sales UI now normalizes analytics range/trend dates to `YYYY-MM-DD`. Please confirm the live `/analytics/sales` response keeps those fields in `YYYY-MM-DD` (no time component) so the adapter doesn’t drift once mocks flip off. If the upstream service can’t guarantee this, let us know so we can revisit the adapter before launch.

## 2025-09-27 Settings Agent Request
- Deliver the SEO + MCP credential handoff bundle (GA4 property/service account, GSC site token, Bing API key scope, MCP endpoint/api key expectations) with matching `.env` keys so `/app/settings` can exit mock mode once staging Postgres is provisioned.
- Publish refreshed Prisma fixtures (`StoreSettings`, `StoreSecret`, `ConnectionEvent`) that align with those credentials to keep Vitest/Playwright stable across teams.
- Provide target timeline + staging env name so we can schedule the Settings UI verification pass immediately after the bundle is ready.

## 2025-09-27 Inventory Agent Request
- Need bucket-level demand trend aggregation from the inventory analytics endpoint so `/app.inventory` can hydrate the new sparkline + WoW deltas with live data. Expect a 6-point weekly series per bucket (ordered oldest→newest) with stable `label`/`units` fields and zero-safe values for gaps.
- Please confirm whether the service will emit per-SKU time series as well; we currently sum SKU series client-side via `aggregateTrendSeries` and can switch to a pre-aggregated bucket payload if it’s cheaper to compute server-side.
- Validation: once the feed is live, we’ll run `npm exec vitest run app/lib/__tests__/inventory-math.test.ts` plus `/app.inventory` Playwright smoke (pending) against the live payload. Let us know if you prefer a contract test we can stub for you.

# Dashboard Mock Payload Fixtures

These JSON files provide deterministic payloads for dashboard prompts while the TypeScript mock factories are under construction. Each file mirrors the Remix loader response for a specific route and scenario.

## Files
- `dashboard-home.base.json` – healthy operations snapshot with one SLA breach and fresh RAG index.
- `dashboard-home.warning.json` – multiple SLA breaches, failing golden, and degraded system health.
- `dashboard-home.empty.json` – no inbox activity or telemetry data; components should render empty states.
- `dashboard-home.error.json` – canonical error envelope for testing loader failure handling.
- `sales.base.json` – week-over-week growth with balanced pipeline and inventory alerts.
- `sales.warning.json` – revenue slide, stalled opportunities, and critical inventory hits.
- `sales.empty.json` – zero-activity placeholder verifying empty state UX.
- `sales.error.json` – error envelope used to trigger escalation copy.
- `orders.base.json` – mixed status queue with pagination cursor for list views.
- `orders.warning.json` – SLA breach order plus refund pending edge case.
- `orders.empty.json` – no orders returned; confirm empty table states.
- `orders.error.json` – timeout envelope to drive loader error boundary.
- `inventory.base.json` – healthy stock mix with warning edge.
- `inventory.warning.json` – multiple critical SKUs requiring action.
- `inventory.empty.json` – empty array to validate zero-stock render.
- `inventory.error.json` – service unavailable envelope.
- `kpis.base.json` – KPI tiles with positive trends and thresholds.
- `kpis.warning.json` – KPI degradations and critical conversion alert.
- `kpis.empty.json` – no KPI data returned.
- `kpis.error.json` – error envelope for dashboard tile loader.
- `seo.base.json` – keyword gains, single crawl issue, healthy lighthouse.
- `seo.warning.json` – ranking drop, high-severity crawl issues, degraded scores.
- `seo.empty.json` – empty SEO payload for blank states.
- `seo.error.json` – failure envelope for SEO widgets.
- `settings.base.json` – team roster, feature flags, and integration status.
- `settings.warning.json` – plan downgrade, stale user, and disconnected integration.
- `settings.empty.json` – baseline merchant with no team or integrations.
- `settings.error.json` – failure envelope for settings loader.

## Usage
1. During early QA, load these payloads into prompt experiments or Storybook stories to validate copy and routing decisions.
2. When the TypeScript factories ship, use these fixtures as reference outputs for unit and snapshot tests to guard against schema drift.
3. Update both the fixtures and factories together whenever loader contracts change.
4. After edits run `npm test` to confirm scenario builders still align with the JSON fixtures.

Each JSON file is formatted with stable keys to keep diffs clean; avoid trailing commas to simplify tooling compatibility.

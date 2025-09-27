# Route `/seo` — Organic Performance

## Scope
Surface organic traffic insights, technical health, and prioritized actions:
- Cards for content trends, keyword movements, page health, indexation anomalies, Core Web Vitals placeholders.
- Action list segmented by severity (**Now**, **Soon**, **Later**) with assignment + status tracking.
- Keyword tracking table (clicks, impressions, CTR, avg position, delta) with filters + CSV export.
- Page tracking table (entrances, exits, conversion proxy, canonical issues).
- Integrations with GA4, GSC, Bing adapters (mock now, real later).

## Deliverables
- Remix loader combining SEO metrics from mock adapters; support scenario overrides.
- Polaris UI: `Page`, `Layout`, `Card`, `ResourceList`/`IndexTable`, `Filters`, `Badge`, `Banner` for issues.
- Action management components (list, detail modal) with stubbed mutation endpoint.
- Keyword trend chart leveraging `@shopify/polaris-viz` line chart.
- CSV export action (keywords + pages) with TODO for background job when filters large.

## Technical Notes
- Loader must fetch GA4/GSC/Bing data in parallel (Promise.all) and merge by canonical page.
- Provide fallback messaging when any adapter disabled; use settings toggles.
- Use `zod` to validate query params (date range, severity, filter text, `mockState`).
- Annotate spots where MCP product recommendations will slot in (e.g., "Top products lacking SEO coverage").
- Support user-assigned statuses; store in Prisma `SeoInsight` model once DB ready.

## Dependencies
- `seed-data.md` SEO fixtures + action lists.
- `data-layer.md` SEO adapter interfaces.
- `route-settings.md` for API key storage + feature toggles.
- `mcp.md` for future MCP integration surface.

## Tasks
- [x] Loader fetching mock SEO metrics + merging.
- [x] Build cards + keyword/page tables with filters + empty states.
- [x] Implement action list UI with severity sections + mutation stub.
- [x] Add CSV export + TODO for background processing.
- [x] Document fallback behavior when adapters disabled.
- [x] Update overview/testing docs after skeleton ready.

## Status / Notes
- Owner: SEO Insights UI agent (Codex)
- Blockers: Awaiting MCP credentials + live SEO adapters to replace mocks.
- Notes: Loader now hydrates GA4/GSC/Bing mock adapters in parallel, applies Zod-validated filters, and surfaces adapter health toggles/fallback copy. UI covers traffic charting, keyword+page tables with filter/search + CSV export, and an actionable Now/Soon/Later queue with mutation stub. Overview + testing docs refreshed 2025-09-26 to capture chart/action/CSV coverage.
- Immediate focus: line up Prisma persistence for action statuses, keep SEO lint clean (`npx eslint app/routes/app.seo.tsx`), and prep GA4/GSC/Bing adapter + MCP swaps when credentials arrive.

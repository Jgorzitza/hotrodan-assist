# Testing Plan — Dashboard

## Manual Checks
- `/seo`
  - Toggle filters (source/date/severity/search type/mock state) and confirm URL params update + mocks adjust.
  - Verify insight/action cards render for `mockState=base` and empty states appear for `mockState=empty`.
  - Export CSV for keywords/pages; confirm metadata headers (`# dataset`, `# property`, etc.) precede rows.
  - Switch to `mockState=warning` to surface credential banner (Bing auth false) and check severity badges.
  - Validate severity snapshot counts update with filters and when action/insight arrays empty.

## Automated Follow-ups (TODO)
- Add Vitest coverage for `mergeSeoAnalytics` mock path ensuring filtering by source/severity works.
- Snapshot CSV builder output for keywords/pages to catch regressions in headers/metadata ordering.
- Component tests (React Testing Library) for `SeoRoute` verifying filter persistence and empty states.
- Integration tests (Playwright) once Remix app runs end-to-end to ensure navigation, exports, and credential banner flows.

## Notes
- When live adapters replace mocks, extend tests to cover OAuth failure modes and caching refreshes.
- Update this plan as other routes (sales/orders/inbox/inventory/settings) adopt similar mock scenarios.

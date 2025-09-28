# Dashboard Agent Feedback Log

Use this note to propose updates to the dashboard home prompt. Do **not** edit `prompts/dashboard/route-dashboard.md` directly.

## 2025-09-27 Program Manager Directive
- Immediate focus: smoke embedded-shell deep links for shared range persistence once the dev tunnel is available, reuse `buildDashboardRangeSelection` for all range-aware routes, and hold off on new UI work until live analytics contracts drop.
- Document lint/test status and blocker notes here when you have real updates; the Program Manager will fold approved changes into the master prompt.

## 2025-09-27 Dashboard Home Update
- Status: Polaris Viz sparkline + range buttons wired into `/app` with memoized sales prefetch; loader now hydrates MCP copy when toggles/mocks permit. Shared filter helper (`withDashboardRangeParam`) routes `range` + `mockState` to `/sales`, `/orders`, `/inbox`, `/inventory`, `/seo`.
- Tests: `npm exec vitest run app/routes/__tests__/app._index.test.ts app/mocks/__tests__/dashboard.test.ts --config vitest.config.ts` (pass, Vite WebSocket warning only); `npm run lint` still blocked by pre-existing sync/orders/test lint errors (`@typescript-eslint/no-unused-vars`, `testing-library/no-unnecessary-act`).
- Next: Smoke embedded-shell deep links once tunnel returns; coordinate with data-layer owners before swapping mocks for live Admin totals; circle back on lint blockers with respective owners.

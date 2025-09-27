# Storefront MCP Integration Plan

## Scope
Lay the groundwork for Shopify Storefront MCP usage within the Dashboard app. Define typed contracts, client stubs, configuration, and future data flows without hitting live MCP APIs yet.

## Objectives
- Establish module boundary under `app/lib/mcp/` with strongly typed requests/responses.
- Document required configuration (API keys, endpoints) and environment toggles.
- Identify initial use cases: product recommendations, inventory insights, SEO opportunity enrichment.
- Provide mock implementation returning deterministic data for UI development.

## Module Layout
```
app/lib/mcp/
  types.ts            // shared interfaces & enums
  client.server.ts    // MCP client stub (fetch wrapper, retries)
  mocks.ts            // mock responses for local dev
  index.ts            // export helpers, environment toggle
```

## Types & Contracts
- `McpResourceType` enum: `ProductRecommendation`, `InventorySignal`, `SeoOpportunity`.
- `McpRequestContext`: `{ shopDomain, resource, params, dateRange }`.
- `McpResponse<T>`: `{ data: T; generatedAt: string; source: string; confidence: number; }`.
- Resource payloads:
  - `ProductRecommendation`: list of SKUs, rationale, supporting metrics.
  - `InventorySignal`: SKU, risk level, suggested action, supporting demand signals.
  - `SeoOpportunity`: page handle, keyword clusters, projected impact.

## Client Stub
- `createMcpClient({ apiKey, endpoint, fetchFn })` returning methods:
  - `getProductRecommendations(context)`
  - `getInventorySignals(context)`
  - `getSeoOpportunities(context)`
- Each method currently returns mock data via `mocks.ts`; include TODO for real fetch + authentication (HMAC or bearer token).
- Implement simple retry/backoff skeleton (max 3 attempts) with logging hook.
- Surface telemetry hook (e.g., `onRequest`, `onResponse`) for future observability.

## Integration Touchpoints
- Dashboard overview widget pulls top product recommendation summary via MCP client.
- Inventory route uses `getInventorySignals` to enrich risk callouts.
- SEO route lists `SeoOpportunity` for prioritized actions.
- Settings route exposes toggle `enableMcp` & API credential fields; toggling on should validate via `client.ping()` stub.

## Configuration & Security
- Env vars: `MCP_API_URL`, `MCP_API_KEY`, optional `MCP_TIMEOUT_MS`, `MCP_MAX_RETRIES`.
- Secrets stored encrypted via `secrets.server.ts`; never commit keys.
- Document rotation steps (invalidate old key, update environment, verify connection).
- Provide fallback behavior when MCP disabled (hide sections or show informative empty states).

## Tasks
- [x] Define types + enums in `app/lib/mcp/types.ts`.
- [x] Implement client stub + mock data wiring.
- [x] Expose environment toggle + helper to detect availability.
- [x] Update relevant route docs (`route-dashboard`, `route-inventory`, `route-seo`) with integration hooks.
- [x] Add placeholder unit tests verifying mocks + client configuration.
- [x] Document enablement steps in `README`/`route-settings`.

## Status / Notes
- Owner: Codex (Section 0 bootstrap)
- Progress: Settings UI now surfaces per-shop MCP endpoint/timeout/retry inputs with validation; saving feeds the repository overrides that `resolveMcpConfigFromEnv` and the route loaders consume for live fetch prep.
- Tests: Vitest suites cover override precedence (`dashboard/app/lib/mcp/__tests__/index.test.ts`), the override loader (`dashboard/app/lib/mcp/__tests__/config.server.test.ts`), and the settings loader/action path (`dashboard/app/routes/__tests__/app.settings.test.ts`) to guard the new form plumbing.
- Blockers: Awaiting real Storefront MCP endpoint + credentials to swap off mock mode.
- Immediate focus: document secure persistence migration notes, align on production-ready MCP creds, and chase the remaining Vitest flake owners (mock scenario regressions + missing Prisma/Shopify env vars) so the suite runs green once we flip off mock mode.

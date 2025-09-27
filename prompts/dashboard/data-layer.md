# Data Layer & Modules

## Scope
Define typed modules powering queries, adapters, utilities, and configuration persistence:
- `app/lib/shopify/admin.ts` — Admin GraphQL client factory with rate limiting/backoff.
- `app/lib/shopify/queries.ts` — Export typed query builders for KPIs, orders by status, inventory, customer stats.
- `app/lib/seo/{ga4,gsc,bing}.ts` — Adapter interfaces + mock implementations.
- `app/lib/inbox/providers.ts` — Channel adapter stubs (email, FB/IG, TikTok).
- `app/lib/inventory/math.ts` — Functions for velocity, stockout date, reorder point, safety stock.
- `app/lib/mcp/{types,client}.ts` — Storefront MCP boundary.
- `app/lib/settings/repository.server.ts` — `StoreSettingsRepository` consolidating thresholds, toggles, secret metadata, and connection history per store.
- `app/lib/security/secrets.server.ts` — Secret helper wrapping encrypt/decrypt + TODO for KMS/Shopify storage integration.

## Deliverables
- TypeScript module stubs with clear interfaces, placeholder implementations returning mock data (wired to `seed-data`).
- Documentation within modules indicating required env vars, error handling expectations, retry logic.
- MPC client example method (e.g., `fetchProductRecommendations`) returning mock data.
- `StoreSettingsRepository` contract exposing `getSettings(storeId)`, `updateThresholds`, `updateToggles`, `updateSecrets`, and `recordConnectionTest`; initial implementation backed by in-memory mocks seeded from `app/mocks/settings.ts`.
- Secret helper providing `encryptSecret`, `decryptSecret`, `maskSecret`, and TODO notes for rotation/audit logging.

## Technical Notes
- Use `@shopify/shopify-api` (from CLI template) for Admin API client; configure query cost handling.
- Provide `withSession` helper to fetch store access token from Prisma `Store` model.
- SEO adapters should expose async methods returning typed results with `source` metadata and `TODO` for OAuth.
- Inbox providers must align with `route-inbox` expected shape (tickets + messages).
- Inventory math should be deterministic; include unit tests outline in `testing.md`.
- Settings repository should compose data from Prisma `Store` (plan level, identifiers) and `StoreSettings` (thresholds, toggles, secrets). Until Prisma lands, rely on in-memory mock store keyed by shop domain.
- Secret helper must never return plaintext outside server context; include TODO for Shopify secret storage + KMS (AWS KMS/GCP KMS) integration.
- Connection test history stored as capped array (last 5 attempts) with status + response time; repository should expose typed union for `success | warning | error`.

## Tasks
- [x] Outline Admin API client factory with rate limiter stub.
- [x] Enumerate GraphQL queries (sales, orders, inventory, customer repeat stats) with TypeScript types.
- [x] Draft SEO adapter interfaces + mock implementations reading from `seed-data`.
- [x] Draft inbox provider + inventory math modules.
- [x] Flesh MCP types + client stub; include sample call used in dashboard widget.
- [x] Implement `StoreSettingsRepository` contract + mock in-memory store.
- [x] Implement `secrets.server.ts` helper with encryption TODO + masking utilities.
- [x] Update `overview.md` referencing module completion status.

## Status / Notes
- Owner: Codex
- Blockers: Awaiting live Shopify credentials + SEO API keys to replace mock adapters; finalize KMS storage approach before returning plaintext tokens.
- Notes: Shopify admin client now exposes `withStoreSession` for Prisma-backed tokens, GraphQL query builders ship typed contracts, and the settings repository now persists through Prisma (`StoreSecret`, `ConnectionEvent`, and `StoreSettings.connectionMetadata` with MCP overrides). Vitest suite covers both mock and Prisma paths using the stubbed client. Relates to: `mcp.md`, `seed-data.md`, `database.md`, `route-settings.md`.

## Immediate Focus
- Coordinate with the Database agent on the Prisma seed + loader plan, rerun the SQLite seed (`DATABASE_URL="file:./dev.sqlite" npx prisma db seed`) once those changes land, and log the outcome in `coordination/2025-09-26_prisma-config-plan.md`.
- Coordinate with Sync/Webhooks on payload contracts, prep `withStoreSession` wiring for loaders once Shopify credentials + KMS plan are finalized, and align on DAO helpers for Shopify access tokens.
- Partner with the cron/ops owner to schedule retention jobs for connection events + secret rotation reminders now that persistence is live.
- Shadow the SEO adapters to ensure real credentials slot into the Prisma-backed secrets pipeline once keys land (document gaps in the coordination memo).

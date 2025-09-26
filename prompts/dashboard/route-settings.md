# Route `/settings`

## Scope
Administrative control center for store-level configuration and integrations:
- Threshold management for low-stock minimums, overdue order hours (default 12), and overstock SKUs with per-store overrides + reset-to-default helper.
- Credential vault for SEO adapters (GA4, GSC, Bing) with masked display, last updated metadata, and inline connection status badges.
- Feature toggles governing MCP integration, experimental dashboard widgets, and beta workflows with contextual guidance.
- Integration diagnostics: trigger "Test connection" flows that surface success/error banners and log events for observability stubs.
- Surface upcoming security requirements (rotation reminders, audit logging) without blocking day-one functionality.

## Deliverables
- Remix loader returning a typed `SettingsPayload` composed from Prisma `Store` + `StoreSettings` (mock repo) covering thresholds, toggles, secrets metadata, and connection history.
- Remix action handling granular updates (thresholds, toggles, credentials) with Zod validation, optimistic UI states, toast + inline error plumbing.
- Polaris UI: `Page` + `Layout` with cards for **Operational thresholds**, **Integrations**, **Feature toggles**, including `FormLayout`, `TextField`, `Checkbox`, `Button`, `InlineError`, `Banner`, and `Toast` implementations.
- Secret storage helper stub (e.g., `app/lib/security/secrets.server.ts`) encapsulating encrypt/decrypt/TODO for KMS + Shopify hosted storage migration.
- Connection test handlers stubbing out GA4/GSC/Bing pings (use adapters from `data-layer.md`) and surfacing badge state (`Success`, `Warning`, `Error`).

## Technical Notes
- Define `StoreSettingsRepository` in the data layer returning `{ thresholds, toggles, secrets, connectionStatuses }`; back with in-memory mocks until Prisma schema lands.
- Sensitive fields must stay server-side: send masked tokens (`••••1234`) + `lastVerifiedAt`, never raw secrets; action receives plaintext, passes through `encryptSecret` helper before persistence.
- Use Remix `defer` or blocking loader depending on secret fetch latency; keep form submissions multipart-aware for future file inputs (e.g., service account JSON).
- Validation: leverage `zod` schemas per section; enforce numeric ranges (min/max thresholds) and throttle connection button to avoid spamming mock APIs.
- Plan for production: TODO comment referencing Shopify/app secret storage, key rotation cadence, and audit log entries (tie into `mcp.md` when toggles change).

## Dependencies
- `database.md`: `Store` model encryption notes and future `StoreSettings` table.
- `data-layer.md`: repository contract + SEO adapter interfaces for connection tests.
- `seed-data.md`: default threshold/toggle values + sample masked secrets.
- `route-seo.md`: consumes API keys; ensure naming alignment.
- `testing.md`: outline form/action tests (loader/action unit tests + Playwright happy path).

## Tasks
- [ ] Scaffold `StoreSettingsRepository` (mock) with typed payload + secret helper integration.
- [ ] Implement loader/action pair with Zod validation, optimistic toggles, and toast feedback wiring.
- [ ] Build Polaris form layout covering thresholds, credentials, toggles, and connection test buttons.
- [ ] Add mock connection test handlers hitting SEO adapters and surfacing badge/banner states.
- [ ] Document security + production migration TODOs (encryption, rotation, audit logging).
- [ ] Update `overview.md` + cross-link relevant routes once skeleton lands.

## Status / Notes
- Owner: _unassigned_
- Blockers: _none_
- Coordinate with seed + Prisma workstreams before wiring to real persistence.

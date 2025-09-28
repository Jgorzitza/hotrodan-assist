# Database & Persistence Plan

## Scope
Design Prisma schema + migration workflow bridging dev (SQLite) and production (Postgres). Capture model responsibilities, relationships, and operational practices (migrations, seeding, backups).

## Target Models
- `Store` — Shopify shop domain, access token, plan level, status, onboarding flags.
- `StoreSettings` — thresholds, feature toggles, connection metadata, last rotation dates.
- `StoreSecret` — per-provider encrypted credentials + rotation reminders linked back to `Store`.
- `KpiCache` — cached analytics per store/date range (sales KPIs, orders, inventory snapshots).
- `OrderFlag` — flags assigned to Shopify orders (attention status, notes, resolution state).
- `Ticket` / `TicketMessage` — inbox conversation + thread messages (AI drafts, human edits, metadata).
- `SeoInsight` — action items with severity, status, linked resources.
- `ProductVelocity` — per SKU velocity metrics, stockout forecasts, reorder recommendations.
- `PurchaseOrder` — draft POs with vendor, line items, status.
- `AiDraft` — log of AI-generated drafts, human edits, feedback, reward signals.
- `ConnectionEvent` — optional log for integration connection tests (GA4, GSC, Bing, MCP).
- `WebhookRegistry` — Shopify webhook subscription audit (`shopDomain`, `topicKey`, delivery method, operation, callback URL, last handshake result).

## Schema Notes
- Use UUID primary keys (`cuid()` helper) for all models; reference by `storeId` foreign key.
- Normalize Shopify identifiers (order ID, customer ID, product/variant) as strings stored alongside store to avoid collisions.
- Include `createdAt`, `updatedAt` default timestamp fields; add indexes on frequently queried combos (e.g., `OrderFlag(storeId, status, createdAt)`).
- `WebhookRegistry` stores one row per `{shopDomain, topicKey}` with `recordedAt` + `updatedAt` tracking to power the webhook diagnostics route and uninstall cleanup.
- `AiDraft` records link to `TicketMessage` + include `model`, `version`, `approved`, `rewardScore` fields for future tuning.
- Store secrets encrypted at rest: store cipher text + `encryptionVersion`, never plaintext. (Stub helper until KMS ready.)

## Migration Workflow
- Dev (SQLite quick sync): `DATABASE_URL="file:./prisma/dev.sqlite" npm run prisma:db-push:sqlite` to mirror the latest schema; run `npm run prisma:migrate:sqlite -- --name <change>` only when validating migration SQL locally.
- Staging/Prod (Postgres): `npm run prisma:migrate` runs `prisma migrate deploy` using `prisma/schema.prisma`; rollback with `prisma migrate resolve --rolled-back <migration>`.
- CI: `npx prisma migrate deploy --schema prisma/schema.prisma` during build, followed by smoke tests.
- Client generation: `npm run prisma:generate` after dependency installs and within Docker build stage.
- Seeding: `DATABASE_URL="file:./prisma/dev.sqlite" npm run prisma:seed` hydrates a demo store/settings/ticket dataset; Prisma CLI executes `node --import ./prisma/register-ts-loader.mjs prisma/seed.ts` under the hood so the TypeScript seed runs without the experimental `--loader` flag.

## Operational Guidance
- Canonical schema: `dashboard/prisma/schema.prisma` (Postgres). SQLite shadow schema lives at `dashboard/prisma/schema.sqlite.prisma` for fast local runs.
- Helper scripts now cover generate/migrate/seed/studio for both providers—see `dashboard/package.json` (`prisma:migrate`, `prisma:migrate:sqlite`, `prisma:db-push:sqlite`, `prisma:seed`, `prisma:studio`).
- Prisma config auto-registers the TypeScript seed harness (`prisma/register-ts-loader.mjs`, `prisma/ts-loader.mjs`, `prisma/seed.ts`) and wires the CLI to `node --import ./prisma/register-ts-loader.mjs prisma/seed.ts` when the files exist.
- For Postgres, route connections through PgBouncer/Data Proxy and cap pool size (`PRISMA_CLIENT_MAX_CONNECTIONS`) at least 20% below plan limits.
- Use `npm run prisma:seed` to refresh the deterministic demo store before QA or local screenshot capture.
- `prisma/migrations/20250218120000_expand_dashboard_models` is the authoritative bootstrap migration; keep future changes additive and regenerate SQLite via `npm run prisma:db-push:sqlite` after every schema edit.

## Environment Configuration
- **Postgres**: set `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public`. Optional: `DIRECT_URL` for management connections, `SHADOW_DATABASE_URL` for Prisma migrate.
- **SQLite**: `DATABASE_URL=file:./prisma/dev.sqlite`. Use the `:memory:` suffix for tests that need isolated DBs.
- **Shared secrets**: `ENCRYPTION_KEY` placeholder not yet required—the mock `encryptSecret` helper stores ciphertext with an embedded IV. Once KMS lands, introduce `KMS_KEY_ID` and rotate `encryptionVersion`.
- When switching providers, regenerate the Prisma client (`npm run prisma:generate`) to hydrate enum changes.

## Backup & Restore
- Enable managed snapshots (Render, Fly, or RDS automated backups). Target hourly point-in-time recovery for prod, daily for staging.
- Manual export: `pg_dump --format=custom --no-owner "$DATABASE_URL" > backups/dashboard-$(date +%Y%m%d%H%M%S).dump`.
- Manual restore: `pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" backups/<file>.dump`.
- Store weekly encrypted exports in S3/Backblaze with 30-day retention; tag prod vs staging artifacts.
- Document how to mark failed migrations as rolled back: `prisma migrate resolve --rolled-back <migration-name>` followed by `prisma migrate deploy` once fixed.

## Data Retention
- **AI Drafts**: retain 90 days of approved/denied drafts per store for model feedback. Schedule weekly job to delete drafts older than 90 days with `rewardScore = null`.
- **Connection Events**: keep last 30 days per integration to power health dashboards. Purge with rolling delete job, leaving latest success/failure for audit.
- **KPI Cache**: expire records via `expiresAt` (default 6h). Cleanup cron removes stale cache nightly.
- **Tickets & Order Flags**: archive (set status `ARCHIVED`/`RESOLVED`) but keep indefinitely for compliance until legal retention policy defined.
- **Webhook Events**: hold 14 days for replay/debugging, then delete rows with `status IN ('SUCCEEDED','SKIPPED')` and `processedAt < now() - interval '14 days'`.

## Tasks
- [x] Draft Prisma schema with models/relations listed above.
- [x] Set up migration + seed npm scripts in `dashboard/package.json`.
- [x] Document environment variables for SQLite vs Postgres.
- [x] Outline backup/restore steps for production database.
- [x] Define data retention policy (AI drafts, connection events) with cleanup strategy.
- [x] Update `overview.md` and `seed-data.md` once schema finalized.

## Status / Notes
- Owner: Codex (Data & Prisma agent)
- Completed: Postgres + SQLite schemas aligned, migrations regenerated, seed harness live (`npm run prisma:seed` hydrates demo data). `DATABASE_URL="postgresql://…" npx prisma generate`, `DATABASE_URL="file:./prisma/dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma`, and the SQLite seed run were all verified locally. Added migration `20250326150000_add_webhook_registry` so webhook registrations flow into Prisma instead of the in-memory cache.
- Completed 2025-10-03: `StoreSettingsRepository` now runs on Prisma—secrets persist via `StoreSecret`, MCP overrides live in `StoreSettings.connectionMetadata`, and connection tests append to `ConnectionEvent` with history hydrated from the database. SQLite/Postgres seeds were refreshed to include the new metadata envelope.
- Blockers: Still waiting on final production provider selection (Fly vs Render vs RDS) before wiring automated backups + connection pooling configs.
- Immediate focus: await infrastructure decision (Fly vs Render) so ops can schedule the `/cron/retention` sweep using the new checklist, keep UI/service owners aligned on the Prisma repository rollout, and capture Postgres pooling/backup decisions in `coordination/2025-09-26_prisma-config-plan.md` once the provider is selected.
- References: Prisma config migration tracked in `coordination/2025-09-26_prisma-config-plan.md`; new migrations `20250218120000_expand_dashboard_models`, `20250311090000_add_store_secrets`, `20250326150000_add_webhook_registry`, and `20251006121500_add_retention_indexes` are ready for review.
- Update 2025-10-01: Reconfirmed the SQLite workflow on `feature/route-sales-drilldown`; `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all succeed with the TypeScript seed harness in place.
- Update 2025-10-05: Added Prisma-backed retention utilities (`dashboard/app/lib/settings/retention.server.ts`) and a guarded Remix cron endpoint (`dashboard/app/routes/cron.retention.ts`) pruning stale `ConnectionEvent` rows and surfacing upcoming `StoreSecret` rotation reminders; covered by Vitest (`app/lib/settings/__tests__/retention.server.test.ts`).
- Update 2025-10-06: Documented Fly vs Render cron deployment paths in `coordination/2025-09-26_prisma-config-plan.md`, reran `npm run prisma:generate`, `DATABASE_URL="file:./prisma/dev.sqlite" npm run prisma:db-push:sqlite`, and `npm exec vitest run app/lib/settings/__tests__/retention.server.test.ts` (WebSocket port warning expected in sandbox).
- Update 2025-10-07: Shipped migration `20251006121500_add_retention_indexes` adding `StoreSecret.rotationReminderAt` and `ConnectionEvent.createdAt` indexes for the retention cron sweep; revalidated `npm run prisma:generate` and `DATABASE_URL="file:./prisma/dev.sqlite" npm run prisma:db-push:sqlite` on `feature/route-sales-drilldown`.

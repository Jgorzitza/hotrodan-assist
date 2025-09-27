# Database & Persistence Plan

## Scope
Design Prisma schema + migration workflow bridging dev (SQLite) and production (Postgres). Capture model responsibilities, relationships, and operational practices (migrations, seeding, backups).

## Target Models
- `Store` — Shopify shop domain, access token, plan level, status, onboarding flags.
- `StoreSettings` — thresholds, feature toggles, connection metadata, last rotation dates.
- `KpiCache` — cached analytics per store/date range (sales KPIs, orders, inventory snapshots).
- `OrderFlag` — flags assigned to Shopify orders (attention status, notes, resolution state).
- `Ticket` / `TicketMessage` — inbox conversation + thread messages (AI drafts, human edits, metadata).
- `SeoInsight` — action items with severity, status, linked resources.
- `ProductVelocity` — per SKU velocity metrics, stockout forecasts, reorder recommendations.
- `PurchaseOrder` — draft POs with vendor, line items, status.
- `AiDraft` — log of AI-generated drafts, human edits, feedback, reward signals.
- `ConnectionEvent` — optional log for integration connection tests (GA4, GSC, Bing, MCP).

## Schema Notes
- Use UUID primary keys (`cuid()` helper) for all models; reference by `storeId` foreign key.
- Normalize Shopify identifiers (order ID, customer ID, product/variant) as strings stored alongside store to avoid collisions.
- Include `createdAt`, `updatedAt` default timestamp fields; add indexes on frequently queried combos (e.g., `OrderFlag(storeId, status, createdAt)`).
- `AiDraft` records link to `TicketMessage` + include `model`, `version`, `approved`, `rewardScore` fields for future tuning.
- Store secrets encrypted at rest: store cipher text + `encryptionVersion`, never plaintext. (Stub helper until KMS ready.)

## Migration Workflow
- Dev: `npx prisma migrate dev --name init` (uses SQLite file `prisma/dev.db`).
- Test: `npx prisma migrate deploy --schema prisma/schema.prisma` inside CI before integration tests.
- Prod: `npx prisma migrate deploy` executed during deployment (Fly/Render release command). Document rollback via `prisma migrate resolve --rolled-back`.
- Generate client: `npx prisma generate` post-install + in Docker build stage.
- Seed script: `npm run prisma:seed` (create baseline StoreSettings, mock stores) referencing `app/mocks`.

## Operational Guidance
- Keep Prisma schema within `dashboard/prisma/schema.prisma`; derive TypeScript types via `@prisma/client`.
- Add script alias in root `package.json` for `prisma:migrate`, `prisma:generate`, `prisma:studio`.
- Document environment variable expectations: `DATABASE_URL` (SQLite or Postgres), `SHADOW_DATABASE_URL` for Planetscale if used, `DIRECT_URL` (optional).
- For Postgres, ensure connection pooling via PgBouncer or Prisma Data Proxy; configure connection limit < plan max.
- Backup policy: enable Fly/Postgres or Render snapshots; store weekly exports in S3/Backblaze. Outline manual `pg_dump` commands.
- Provide instructions for migrating from SQLite dev DB to Postgres (prisma migrate deploy with `DATABASE_URL=postgres://...`).

## Tasks
- [ ] Draft Prisma schema with models/relations listed above.
- [ ] Set up migration + seed npm scripts in `dashboard/package.json`.
- [ ] Document environment variables for SQLite vs Postgres.
- [ ] Outline backup/restore steps for production database.
- [ ] Define data retention policy (AI drafts, connection events) with cleanup strategy.
- [ ] Update `overview.md` and `seed-data.md` once schema finalized.

## Status / Notes
- Owner: _unassigned_
- Blockers: Awaiting confirmation on production DB provider (Fly Postgres vs Render vs RDS).
- Follow-up: Prisma CLI config migrated to `dashboard/prisma.config.ts`; `package.json#prisma` removed. SQLite seed remains manual until `prisma/seed.ts` + `prisma/ts-loader.mjs` land on this branch. See `coordination/2025-09-26_prisma-config-plan.md` for rollout details.

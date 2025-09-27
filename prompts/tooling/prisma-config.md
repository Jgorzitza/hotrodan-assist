# Tooling Agent — Prisma Config Migration

## Mission
Shift Prisma CLI configuration ownership from `package.json#prisma` to a dedicated `prisma.config.ts`, keeping local dev, CI, and deploy flows stable ahead of the Prisma 7 upgrade.

## Current Context
- Dual schemas are in place (`prisma/schema.prisma` for Postgres, `schema.sqlite.prisma` for dev).
- TypeScript seed harness (`ts-loader.mjs`, `seed.ts`) exists on the main dashboard branch but may be missing on some worktrees.
- Prisma CLI ≥ 5.13 reads `prisma.config.ts` automatically; we are currently on 6.16.2.

## Tasks
- [x] Mirror current defaults in `prisma.config.ts` (schema path, seed command).
- [x] Remove the legacy `package.json#prisma` block without breaking existing npm scripts.
- [x] Validate workflows (`prisma:generate`, sqlite seed, deploy scripts) — sqlite seed still pending harness drop.
- [x] Communicate changes across prompts/coordination docs.

## Immediate Focus
- Run `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` until they pass clean, then note results in the coordination memo.
- Trigger the post-Oct 1 CI smoke once this work merges to main and record the outcome in `coordination/2025-09-26_prisma-config-plan.md`.
- Coordinate with the Database agent on documenting the seed dataset expectations now that the TypeScript harness is active, keeping `prompts/dashboard/database.md` in sync.

## References
- `coordination/2025-09-26_prisma-config-plan.md`
- `prompts/dashboard/database.md`
- `prompts/dashboard/overview.md`
- `dashboard/package.json`
- `dashboard/prisma/`

## Status / Notes
- 2025-09-26: Migration plan captured in `coordination/2025-09-26_prisma-config-plan.md`; pending DevOps confirmation on external pipeline consumers.
- 2025-09-27: DevOps confirmed no pipelines depend on `package.json#prisma`; `prisma.config.ts` landed with guarded seed hook, and `package.json` cleanup completed. Outstanding: rerun sqlite seed once `prisma/seed.ts` + `ts-loader.mjs` land on this branch, and capture CI smoke results after Oct 1.
- 2025-09-28: `npm run prisma:generate` failed (`Store.webhookEvents` referenced a missing `WebhookEvent` model); Database agent flagged the schema fix.
- 2025-09-29: `npm run prisma:generate` passes on `feature/mcp-client`; Prisma CLI loads `prisma.config.ts` without overrides. Still waiting on `prisma/seed.ts` + `prisma/ts-loader.mjs` to land before rerunning the sqlite seed; CI smoke remains scheduled post-Oct 1.
- 2025-09-30: Seed harness merged (`prisma/seed.ts` + loader). Updated `prisma/ts-loader.mjs` to resolve extensionless TS imports, reset the SQLite dev DB via `prisma db push --force-reset --schema prisma/schema.sqlite.prisma`, and captured a successful `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` run.
- 2025-10-01: Reran the full CLI flow (`npm run prisma:generate`, SQLite `db push --force-reset`, and `db seed`) on `feature/route-sales-drilldown`; all succeeded via `prisma.config.ts`. Next up is the post-Oct 1 CI smoke.
- 2025-10-02: Revalidated the Prisma CLI suite on `feature/route-sales-drilldown`; all commands succeeded (`prisma:generate`, SQLite `db push --force-reset`, `db seed`). Pending action: schedule the post-Oct 1 CI smoke.
- 2025-10-03: Ran the Prisma CLI + SQLite reset again after lint cleanup (`npm run prisma:generate`, SQLite `db push --force-reset`, `db seed`); waiting on post-Oct 1 CI smoke once branches merge.

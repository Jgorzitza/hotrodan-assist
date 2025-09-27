# Tooling Agent — Prisma Config Migration

## Mission
Shift Prisma CLI configuration ownership from `package.json#prisma` to a dedicated `prisma.config.ts`, keeping local dev, CI, and deploy flows stable ahead of the Prisma 7 upgrade.

## Current Context
- Dual schemas are in place (`prisma/schema.prisma` for Postgres, `schema.sqlite.prisma` for dev).
- TypeScript seed harness (`ts-loader.mjs`, `seed.ts`) exists on the main dashboard branch but may be missing on some worktrees.
- Prisma CLI ≥ 5.13 reads `prisma.config.ts` automatically; we are currently on 6.16.2.

## Immediate Tasks
1. Mirror current defaults in `prisma.config.ts` (schema path, seed command).
2. Remove the legacy `package.json#prisma` block without breaking existing npm scripts.
3. Validate workflows (`prisma:generate`, sqlite seed, deploy scripts).
4. Communicate changes across prompts/coordination docs.

## References
- `coordination/2025-09-26_prisma-config-plan.md`
- `prompts/dashboard/database.md`
- `prompts/dashboard/overview.md`
- `dashboard/package.json`
- `dashboard/prisma/`

## Status / Notes
- 2025-09-26: Migration plan captured in `coordination/2025-09-26_prisma-config-plan.md`; pending DevOps confirmation on external pipeline consumers.
- 2025-09-27: DevOps confirmed no pipelines depend on `package.json#prisma`; `prisma.config.ts` landed with guarded seed hook, and `package.json` cleanup completed. Outstanding: rerun sqlite seed once `prisma/seed.ts` + `ts-loader.mjs` land on this branch, and capture CI smoke results after Oct 1.

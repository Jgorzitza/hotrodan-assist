# Plan: Prisma CLI Config Migration

Author: DevOps (Codex)
Date: 2025-09-26
Stakeholders: Tooling, Data & Database, Dashboard App owners

## Summary
Prisma 7 removes support for the deprecated `package.json#prisma` configuration block. The dashboard app currently wires its TypeScript seed command through that block. We are introducing `prisma.config.ts` so Prisma CLI picks up defaults from a dedicated config file, keeping local dev (SQLite) and deploy (Postgres) workflows aligned while the upgrade proceeds.

## Goals
- Provide a repository-owned `prisma.config.ts` that mirrors the current defaults (Postgres schema, TypeScript seed command).
- Ensure npm scripts continue to work for both SQLite dev flows and Postgres deploys.
- Document the rollout plan and confirm no CI/CD automation relies on the legacy package.json field.

## Non-Goals
- No schema or migration changes.
- No alterations to dual-schema strategy (`schema.prisma` + `schema.sqlite.prisma`).

## Action Plan
1. **Implement config file** – Scaffold `dashboard/prisma.config.ts` using `defineConfig`, defaulting to `prisma/schema.prisma` and registering the TypeScript seed command when present.
2. **Clean up package.json** – Remove the legacy `"prisma"` block while keeping existing `prisma:*` npm scripts untouched.
3. **Validate workflows** – Run `npm run prisma:generate` and sqlite seed using `DATABASE_URL="file:./dev.sqlite"` once the seed harness is present.
4. **Confirm pipeline consumers** – Verify CI/CD definitions and external integrations do not depend on `package.json#prisma`.
5. **Communicate** – Update tooling and database prompts with status/location changes and file the coordination note for cross-team visibility.

## Status (2025-09-27)
- ✅ `prisma.config.ts` added with guardrails for missing seed harness (only registers the seed command when `prisma/ts-loader.mjs` and `prisma/seed.ts` exist).
- ✅ `package.json#prisma` block removed; npm scripts unchanged.
- ✅ `npm run prisma:generate` succeeds with new config.
- ⏳ `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` pending until the seed harness lands on this branch (config already supports it).
- ✅ DevOps verification: `.github/` workflows, `scripts/`, and supporting automation contain no references to `package.json#prisma`; no external pipelines consume the legacy field.
- 🔜 Coordinate CI smoke after Oct 1 deploy window.

## Follow-ups
- Trigger CI pipeline run post-merge to confirm the new config is picked up in staging/prod deploy scripts.
- Data team to confirm whether dual-schema automation should be centralized in config vs npm scripts.


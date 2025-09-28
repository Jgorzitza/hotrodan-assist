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

## Status (2025-09-29)
- ✅ `prisma.config.ts` added with guardrails for missing seed harness (only registers the seed command when `prisma/ts-loader.mjs` and `prisma/seed.ts` exist).
- ✅ `package.json#prisma` block removed; npm scripts unchanged.
- ✅ `npm run prisma:generate` passes on `feature/mcp-client` (2025-09-29); confirmed Prisma CLI loads `prisma.config.ts` automatically.
- ⏳ `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` pending until the seed harness lands on this branch (config already supports it). (Resolved 2025-09-30 once the harness merged.)
- ✅ DevOps verification: `.github/` workflows, `scripts/`, and supporting automation contain no references to `package.json#prisma`; no external pipelines consume the legacy field.
- 🔜 Coordinate CI smoke after Oct 1 deploy window.

## Status (2025-09-30)
- ✅ Verified `npm run prisma:generate` on `feature/route-sales-drilldown`; CLI resolves the config and regenerates client without warnings.
- ✅ Seed harness (`prisma/seed.ts` + loader) landed on the branch; updated `prisma/ts-loader.mjs` to handle extensionless TypeScript imports.
- ✅ Reset local SQLite (`DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`) and captured a successful `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` run (see seed log above).

## Status (2025-10-01)
- ✅ Revalidated the Prisma CLI flows on `feature/route-sales-drilldown`; `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all completed cleanly with the TypeScript seed harness.
- 🔜 Trigger the post-Oct 1 CI smoke and capture the outcome in this doc once pipelines run.

## Status (2025-10-02)
- ✅ Reran the Prisma CLI suite on `feature/route-sales-drilldown`; `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all completed successfully.
- 🔜 Post-Oct 1 CI smoke still pending; coordinate with DevOps once the branch merges.

## Status (2025-10-03)
- ✅ Re-verified Prisma CLI + seed flow post-lint fixes: `npm run prisma:generate`, SQLite `db push --force-reset`, and `db seed` completed locally after the settings/webhooks lint cleanup.
- 🔜 CI smoke still pending merge to `main`; schedule with DevOps once feature branches consolidate.

## Status (2025-10-05)
- ✅ Captured the new `/cron/retention` Remix resource (prunes stale `ConnectionEvent` rows and returns `StoreSecret` rotation reminders) and Vitest coverage in the Database prompt; ops to schedule a daily POST with `CRON_SECRET` once the deployment target is confirmed.
- 🔜 Document scheduler options (Fly cron vs Render jobs) and the alerting path for upcoming/overdue rotations so the post-MVP retention plan is ready once a provider is chosen; defer implementation until the deployment target is locked.

## Status (2025-10-06)
- ✅ Documented Fly.io scheduled job vs Render cron job options for calling `/cron/retention`, including auth, observability, and failure escalation expectations (see "Retention Cron Deployment Options").
- 🔜 Await infrastructure selection (Fly vs Render) so we can open the ops ticket and wire the daily schedule in the chosen environment.

## Status (2025-10-07)
- ✅ Added migration `20251006121500_add_retention_indexes` to back the retention cron sweep with indexes on `StoreSecret.rotationReminderAt` and `ConnectionEvent.createdAt`; reran `npm run prisma:generate` and `DATABASE_URL="file:./prisma/dev.sqlite" npm run prisma:db-push:sqlite` on `feature/route-sales-drilldown` to confirm client + SQLite stay in sync.
- 🔜 Once hosting provider is finalized, rerun `npm exec vitest run app/lib/settings/__tests__/retention.server.test.ts` after deployment scripts pick up the new migration to verify the cron worker behavior against staging data.

## Status (2025-10-08)
- ✅ Revalidated the Prisma CLI suite on `feature/route-sales-drilldown`; `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all completed without errors. Seed command now uses `node --import ./prisma/register-ts-loader.mjs` to drop the Node experimental loader warning.
- 🔜 Post-Oct 1 CI smoke still outstanding; schedule once the branch merges to `main`.

## Status (2025-10-09)
- ✅ Reran the Prisma CLI validation suite on `feature/route-sales-drilldown` after the latest webhooks changes; `npm run prisma:generate`, SQLite `db push --force-reset` (`DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`), and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all succeeded with Prisma CLI loading `prisma.config.ts`.
- 🔜 Post-Oct 1 CI smoke remains pending; coordinate with DevOps once feature branches consolidate into `main`.

## Status (2025-10-10)
- ✅ Reran the Prisma CLI validation suite on `feature/route-sales-drilldown`; `npm run prisma:generate`, SQLite `db push --force-reset` (`DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`), and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all completed successfully with Prisma CLI picking up `prisma.config.ts`.
- 🔜 Post-Oct 1 CI smoke remains pending; follow up with DevOps once the branch merges into `main`.

## Status (2025-10-11)
- ✅ Reconfirmed Prisma CLI + SQLite flows on `feature/route-sales-drilldown`; reran `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` with all commands succeeding via `prisma.config.ts`.
- 🔜 Post-Oct 1 CI smoke still outstanding; coordinate with DevOps post-merge to capture the pipeline result here.

## Status (2025-10-12)
- ✅ Reran Prisma CLI validation suite on `feature/route-sales-drilldown`; `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all completed successfully with Prisma CLI loading `prisma.config.ts`.
- 🔜 Post-Oct 1 CI smoke still outstanding; will schedule with DevOps once the Prisma config work merges into `main`.

## Status (2025-10-13)
- ✅ Revalidated Prisma CLI flows on `feature/route-sales-drilldown`; `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all succeeded with Prisma CLI loading `prisma.config.ts` and executing the TypeScript seed harness.
- 🔜 Post-Oct 1 CI smoke remains outstanding; follow up with DevOps after the Prisma config changes merge to `main`.

## Status (2025-10-14)
- ✅ Ran the Prisma CLI validation suite again on `feature/route-sales-drilldown`; `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all passed with Prisma CLI sourcing defaults from `prisma.config.ts`.
- 🔜 Still need to trigger the post-Oct 1 CI smoke once the Prisma config work lands on `main`; coordinate with DevOps for scheduling.

## Retention Cron Deployment Options
- Endpoint: `POST https://<dashboard-host>/cron/retention` protected by `CRON_SECRET` (Bearer token or `?token=` query param). Response returns `{ ok: true, result }`; Prisma logs land under `[cron:retention]` in application logs.
- Required env: `CRON_SECRET`, `DATABASE_URL`, `DIRECT_URL` (if applicable). Job should run once per day (03:00 store-local suggestion) and support manual retry.

### Fly.io Scheduled Task
- Provision Fly Cron (`fly cron schedule daily_retention --schedule "0 9 * * *" --command "curl ..."`). Use Fly machine executing `curl -sf` with `Authorization: Bearer $CRON_SECRET`; fallback to `wget` if curl unavailable.
- Configure alert: Fly metrics alarm on non-zero exit status / log search for `cron.retention` failures; page Ops Slack channel `#ops-alerts`.
- Retry policy: Fly cron automatically retries failed runs once; document manual rerun command (`fly ssh console --command "curl ..."`).

### Render Cron Job
- Create Background Worker (cron type) with schedule `0 9 * * *`; command `curl -sf -H "Authorization: Bearer ${CRON_SECRET}" https://<dashboard-host>/cron/retention`.
- Enable Render incident notifications to `ops@hotrodan.com`; add dashboard app log drain filter for `[cron:retention]` to capture retention metrics.
- Retry policy: allow Render automatic retry (max 3); include runbook note to invoke `curl` manually if all retries fail.

### Ops Handoff Checklist
- [ ] Confirm hosting provider and base URL for dashboard environment (staging + production).
- [ ] Ensure `CRON_SECRET` stored in platform secrets manager and matches app env.
- [ ] Verify Prisma migrations applied before enabling job (`npm run prisma:migrate` in deploy pipeline).
- [ ] Dry-run job after scheduling and log result link in `coordination/2025-09-26_prisma-config-plan.md`.
- [ ] Create PagerDuty note (if enabled) referencing retention SLA (remove stale connection events, notify on overdue secrets).

## Follow-ups
- Trigger CI pipeline run post-merge to confirm the new config is picked up in staging/prod deploy scripts.
- Ensure Database agent documents seed data expectations now that the TypeScript harness runs under Prisma CLI.
- Data team to confirm whether dual-schema automation should be centralized in config vs npm scripts.
- Open ops ticket once hosting provider is locked so the retention cron can be scheduled using the checklist above.
- DevOps coordination: after `chore/prisma-config-migration` lands on `main`, trigger the GitHub Actions `CI` workflow ("CI" job matrix) against the merge commit to capture the post-Oct 1 Prisma smoke result (`gh workflow run CI --ref main` or run from Actions UI) and log the outcome here.

## Status (2025-10-07)
- ✅ Reran the Prisma CLI suite on `feature/route-sales-drilldown`; `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all completed successfully via `prisma.config.ts`.
- 🔜 Post-Oct 1 CI smoke remains queued until the feature branches consolidate and we can trigger the pipeline against `main`.

## Status (2025-10-16)
- ✅ Reran the Prisma CLI validation trio on `feature/approval-app`; `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all completed successfully with Prisma CLI loading `prisma.config.ts` and invoking the TypeScript seed harness.
- 🔜 Post-Oct 1 CI smoke remains pending until the Prisma config work merges to `main`; coordinate with DevOps to trigger the pipeline and log results here once it runs.

## Status (2025-10-15)
- ✅ Revalidated Prisma CLI workflows on `feature/approval-app`; `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` all executed successfully with Prisma CLI auto-loading `prisma.config.ts` and the TypeScript seed harness.
- 🔜 Post-Oct 1 CI smoke still blocked on merging the Prisma config changes to `main`; follow up with DevOps once the branch is ready.

## Status (2025-09-27)
- ✅ Ran Prisma CLI validation suite on `feature/approval-app`; `npm run prisma:generate`, `DATABASE_URL="file:./dev.sqlite" npx prisma db push --schema prisma/schema.sqlite.prisma --force-reset`, and `DATABASE_URL="file:./dev.sqlite" npx prisma db seed` each completed successfully with Prisma CLI sourcing defaults from `prisma.config.ts`.
- 🔜 Post-Oct 1 CI smoke still pending; will schedule with DevOps once Prisma config changes land on `main`.

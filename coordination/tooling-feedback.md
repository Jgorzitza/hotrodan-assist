# Tooling Agent Feedback Log

Use this note for requests affecting `prompts/tooling/prisma-config.md` or related automation. Do **not** edit the prompt directly without approval.

## 2025-09-27 Program Manager Directive
- Immediate focus: monitor Prisma config migration outcomes, record CI smoke status post-merge, coordinate with Database for seed expectations.
- Add proposals with rationale and dependencies here for review.

## 2025-10-15 DevOps Coordination Request
- **Request:** Schedule the post-Oct 1 Prisma CI smoke once `chore/prisma-config-migration` merges to `main` and share the run outcome so we can log it in the plan doc.
- **Prompt section:** `prompts/tooling/prisma-config.md` — Immediate Focus (CI smoke verification).
- **Dependencies:** Merge readiness for `chore/prisma-config-migration`; GitHub Actions `CI` workflow access (`gh workflow run CI --ref main`).
- **Rationale:** Need confirmation that Prisma CLI picks up `prisma.config.ts` via the production CI pipeline ahead of Prisma 7 upgrade.
- **Tooling 2025-09-27 18:32 MDT:** Prisma CLI suite revalidated on `feature/approval-app`; awaiting merge of `chore/prisma-config-migration` to `main`. Once the merge lands, please trigger the GitHub Actions `CI` workflow via `gh workflow run CI --ref main` (full matrix) and drop the run link so we can capture the smoke result in `coordination/2025-09-26_prisma-config-plan.md`.


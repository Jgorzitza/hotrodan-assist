# Decisions Log

## Canonicalization & realignment completed — 2025-10-02
**Decision**: Archived legacy handover/instruction files to `archive/legacy/`, established `docs/cleanup/inventory-20251002.md`, created supporting doc placeholders, and updated governance files (README, CODEOWNERS, workflows, PR template, agent launch GO gate).
**Reasoning**: Remove conflicting prompts and ensure all agents share a single source of truth before resuming high-velocity work.
**Impact**: Clear mapping between NORTH_STAR, backlog, and directions; policy-as-code guardrails block non-manager edits; employee agents remain paused until GO is posted with the canonicalization commit.
**Follow-ups**: 1) Manager to post GO with commit SHA after review/merge. 2) Continue normalizing coordination docs (`coordination/*`) as remaining backlog items progress. 3) Monitor CI gate outcomes once updated workflows run on next PR.

## Realignment sweep — 2025-10-03
**Decision**: Added `docs/cleanup/inventory-20251003.md`, archived stray backups/terminal artifacts to `archive/legacy/*`, fixed a duplicate backlog entry, and updated CI guard to accept any `inventory-*.md` instead of pinning a specific date.
**Reasoning**: Keep canonical surfaces uncluttered and ensure CI guardrails remain resilient to daily cleanup inventories.
**Impact**: Backlog normalized; archives contain non-canonical artifacts; CI checks won’t fail on date rollovers; no behavior changes to app code.
**Follow-ups**: 1) Periodically prune `archive/legacy/code_backups/`. 2) Consider normalizing coordination instruction files to stubs that defer to canonical directions.

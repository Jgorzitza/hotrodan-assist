# Decisions Log

## Canonicalization & realignment completed — 2025-10-02
**Decision**: Archived legacy handover/instruction files to `archive/legacy/`, established `docs/cleanup/inventory-20251002.md`, created supporting doc placeholders, and updated governance files (README, CODEOWNERS, workflows, PR template, agent launch GO gate).
**Reasoning**: Remove conflicting prompts and ensure all agents share a single source of truth before resuming high-velocity work.
**Impact**: Clear mapping between NORTH_STAR, backlog, and directions; policy-as-code guardrails block non-manager edits; employee agents remain paused until GO is posted with the canonicalization commit.
**Follow-ups**: 1) Manager to post GO with commit SHA after review/merge. 2) Continue normalizing coordination docs (`coordination/*`) as remaining backlog items progress. 3) Monitor CI gate outcomes once updated workflows run on next PR.

# Phase 3 Cleanup & Merge Playbook

## Purpose
Standardize the process for aligning the canonical branch (`chore/repo-canonical-layout`) with `main` while archiving legacy direction files. This playbook mirrors `commands/cleanup-and-merge.md` and adds guardrails for coordination.

## Prerequisites
- Run from the repository root (`~/llama_rag`).
- Ensure you have fetched latest remote refs and have no local work-in-progress that you cannot discard.
- Coordinate with each owning team so their worktree changes are committed or stashed; the merge must run on a clean tree.

## Procedure
1. **Fetch and prune remotes**
   ```bash
   git fetch --all --prune
   ```
2. **Checkout canonical branch**
   ```bash
   git checkout chore/repo-canonical-layout
   ```
3. **Verify README is conflict-free**
   ```bash
   grep -n '<<<<\|>>>>\|====' README.md || echo "README looks clean"
   ```
4. **Archive legacy handover files**
   ```bash
   mkdir -p archive/legacy
   git mv -f HANDOVER*.md archive/legacy/ 2>/dev/null || true
   git mv -f agents.md archive/legacy/ 2>/dev/null || true
   ```
5. **Stage archival moves**
   ```bash
   git add archive/legacy
   ```
6. **Commit archival change**
   ```bash
   git commit -m "chore(repo): archive legacy direction files under archive/legacy"
   ```
7. **Merge canonical into main**
   ```bash
   git checkout main
   git merge --no-ff chore/repo-canonical-layout -m "merge: adopt canonical repo layout"
   ```
8. **Push updated main**
   ```bash
   git push origin main
   ```
9. **(Optional) prune stale branches** once teammates confirm no open PRs depend on them.

## Verification
- `git status` should report a clean tree on both `main` and `chore/repo-canonical-layout`.
- `git log --oneline -5` should show the archival commit and merge commit.
- `git push --dry-run` before the real push if working in constrained environments.

## Coordination Notes
- If `git status` reports modified files outside archive moves, halt and ping the owning agent to land their work. Do **not** merge with unrelated changes staged.
- Record proof-of-work in `feedback/manager.md` and note the sweep in `coordination/inbox/manager/<date>-notes.md`.
- Integration agent expects a TSV artifact (`artifacts/phase3/integration/...`) after the merge to confirm health grid stability; schedule a sweep post-merge.

## Rollback
- If the merge introduces regressions, use `git reset --hard origin/main` (only if safe) or open a revert commit and coordinate with Release Ops before pushing.

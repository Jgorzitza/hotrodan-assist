# Cleanup & Merge (run from ~/llama_rag)

> Detailed playbook: `playbooks/phase3/cleanup.md` (mirror steps + guardrails).

git fetch --all --prune

# 1) Make the canonical branch current
git checkout chore/repo-canonical-layout

# 2) Verify README has no conflict markers
grep -n '<<<<\|>>>>\|====' README.md || echo "README looks clean"

# 3) Move obsolete direction/spec files to archive
mkdir -p archive/legacy
git mv -f HANDOVER*.md archive/legacy/ 2>/dev/null || true
git mv -f agents.md archive/legacy/ 2>/dev/null || true

# 4) Stage only the archival moves (stop if other files appear)
git add archive/legacy

# 5) Commit the archival move
git commit -m "chore(repo): archive legacy direction files under archive/legacy"

# 6) Merge canonical into main
git checkout main
git merge --no-ff chore/repo-canonical-layout -m "merge: adopt canonical repo layout"

# 7) Push
git push origin main

# 8) Post-merge: log proof-of-work in feedback/manager.md and coordination/inbox/manager/<date>-notes.md

# 9) (Optional) Delete stale branches on remote after confirming no open PRs depend on them
# git push origin --delete codex-sync-YYYYMMDD-HHMM feature/route-sales-drilldown feature/dashboard-setup

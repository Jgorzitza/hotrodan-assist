# Canonicalization Cleanup — PR Description Draft

**Summary**
- Archive legacy HANDOVER, AGENT_COMMANDS, and work-order files into `archive/legacy/`.
- Seed canonical doc shells (`docs/COMPONENTS.md`, `docs/PATTERNS.md`, `docs/TROUBLESHOOTING.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`).
- Update README, CODEOWNERS, CI guardrails, agent launch commands, and backlog to reflect the single source of truth.

**Tests**
```bash
python3 run_goldens.py
# ...
# All goldens passed.

npm test -- --run
# Test Files 4 passed (4)
# Tests 12 passed (12)

npx playwright test --list
# Total: 15 tests in 1 file
```

**GO when**
- ✅ Goldens pass (see output above)
- ✅ CI green on this PR (verify in GitHub checks)
- ✅ CODEOWNERS + verify-managed-files guard canonical paths (updated `.github/CODEOWNERS`, `.github/workflows/verify-managed-files.yml`)
- ✅ README, ledger, and backlog reviewed (`README.md`, `docs/cleanup/inventory-20251002.md`, `plans/tasks.backlog.yaml`, `.github/…` updates)

Paste this block into the PR description before requesting review.

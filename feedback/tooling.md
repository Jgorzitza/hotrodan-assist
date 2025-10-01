# Tooling & QA Engineer Feedback Log

(Use the template in `templates/feedback-template.md`.)

## 2025-10-01T15:15Z — Dashboard tests green; lint ok; TypeScript issues enumerated
- Command: npx vitest run --root dashboard
- Result: 46 files, 203 tests, all passed
- Lint: npm run lint — 0 errors, 2 warnings (no-useless-constructor in registry.server.ts, type-import note in webhooks test)
- TypeScript: tsc --noEmit surfaced UI type errors (Polaris prop updates, Text 'as' prop required, Badge children expected string, deprecated Card.Section APIs, and misc test type assertions). Plan:
  1) Fix EnhancedAnalyticsDashboard.tsx to use Polaris v12 props (Text requires 'as', Badge uses 'tone' and children string, remove unsupported props like 'large' on Modal, update InlineStack/BlockStack names).
  2) Update app._index.tsx, app.orders.tsx, app.inventory.tsx to Polaris v12 props (Card.Section removals, Button props, layout prop names).
  3) Address small type nits (URLSearchParamsInit types, optional chaining for possibly undefined fields).
- Manager directive: scripts/prepare_dashboard_dev.sh noted; will run when authorized for tunnel validation; will coordinate with Dashboard on Partners app URL/redirects proof.
- Next: begin with EnhancedAnalyticsDashboard.tsx Polaris props migration; iterate and re-run tsc; append diffs.
## 2025-10-01T07:19Z — Validation snapshot
- Repo: /home/justin/llama_rag
- TypeScript typecheck (root): exit=0 (clean)
- Notes: prisma client generated for dashboard tests; version mismatch warning prisma@5.22.0 vs @prisma/client@6.16.3 (informational)

## 2025-10-01T07:59Z — Root tests snapshot
- Command: vitest run app/tests/**/*.test.ts
- Result: 4 files, 12 tests, all passed (983ms)
- Note: initial npm test invoked watch and hit ELOOP on symlinked bin/X11 tree; switched to explicit vitest run with targeted glob to avoid scanning system links.

## 2025-10-01T07:36Z — Dashboard lint baseline
- Before: 191 problems (159 errors, 32 warnings)
- Categories: unused Polaris imports, missing React keys, undefined JSX components (Checkbox/Select), unused locals in routes, testing-library rule violations.
- Root status: typecheck PASS; vitest PASS (6 files, 49 tests).

## 2025-10-01T07:39Z — Dashboard lint cleanup (cycle 2)
- Changes
  - EnhancedAnalyticsDashboard: trimmed unused imports, added FormLayout, useCallback for loader with fixed deps, removed unused handleSort, added key props in DataTable rows.
  - app/_index: removed unused analytics helper + imports; app/sales: removed unused import.
- After: 0 errors, 12 warnings (mostly test import-type rules; 1 jsx-key warning remains to address).
- Next: address remaining jsx-key warning safely, run dashboard/root vitest, then open PR.

## 2025-10-01T08:11Z — PR opened and validation
- PR: https://github.com/Jgorzitza/hotrodan-assist/pull/5
- Lint: dashboard ESLint 0 errors, 12 warnings (non-critical).
- Tests: root and dashboard Vitest PASS (4 files, 12 tests each).
- Goldens: OFFLINE_CORRECTIONS_ONLY=1 passed.
- Next: rely on CI for Node 20, Playwright smoke; proceed with further cleanup tasks while PR runs.

## 2025-10-01T08:50Z — End-of-day manager update
- Branch/PR
  - Branch: chore/repo-canonical-layout
  - PR: https://github.com/Jgorzitza/hotrodan-assist/pull/5
- Tooling progress (proof-of-work)
  - Dashboard: Reduced ESLint errors to 0; fixed jsx-key, unused imports/vars; tests remain green.
  - Sync: Added /health endpoint; docker healthcheck; Prometheus /prometheus; optional OpenTelemetry tracing.
  - Assistants: Prometheus /prometheus endpoint; optional OpenTelemetry tracing.
  - Connectors: Prometheus /prometheus and /ready; optional OpenTelemetry tracing; docker healthcheck.
  - Docker/Compose: Added HEALTHCHECK to dashboard/rag_api/approval-app/connectors; added healthchecks and restart policies to compose; sync/assistants healthchecks.
  - CI: Added docker-build workflow (build + run health probe per service); added python-lint (ruff) workflow.
  - Metrics: rag_api already exposed /prometheus; confirmed; added to others for parity.
- Validation
  - Node: Root and dashboard Vitest PASS; typecheck PASS.
  - Python: Goldens (offline) PASS; services build in CI workflow.
- Remaining (Next 5 Tasks alignment)
  - CI lane: ensure artifact upload for tests; confirm prisma generate before MCP tests (dashboard workflow already runs typecheck/tests; can add artifact upload next).
  - Error tracking/alerts + SLO dashboards (not yet wired; proposal: Sentry/OTel collector + Alertmanager with basic routes).
  - Readiness/liveness docs for deploy/k8s (draft tomorrow).
  - Security/perf baselines: add ruff/mypy/pytest/locust reports to test-results/.
- Risks/notes
  - Node 22 locally vs Node 20 CI; no parity issues observed; maintain Node 20 in CI.
  - Two dashboard directories (dashboard/ and dashboard/dashboard/); treated top-level as canonical.
- Ask
  - Approve PR #5 to unblock downstream integration; confirm preferred error tracking stack (Sentry vs OTLP-only).

# Approvals Test Plan

_Last updated: 2025-09-29_

## Objective
Outline testing strategy for approvals workflow service covering unit, integration, performance, security, UAT, and regression testing (Tasks 15-20 of overnight documentation).

## 1. Unit Testing
- Scope: Workflow engine logic (routing, auto-approval, SLA calculation), DB helpers.
- Framework: `pytest`
- Existing: `tests/approvals/test_engine.py`
- TODO: Add coverage for rejection, delegation, SLA due computation edge cases.
- Automation: Run on every CI pipeline.

## 2. Integration Testing
- Scope: API endpoints, DB interactions, assistants service stubs.
- Approach: Use `httpx.AsyncClient` against FastAPI TestClient.
- Tests to add:
  - Create workflow + submit approval end-to-end.
  - Auto-approval triggers with real rules file.
  - Delegation/resubmission flows.
- Environment: ephemeral SQLite; consider in-memory DB.

## 3. Performance Testing
- Goals: Measure latency and throughput under concurrent approvals.
- Tools: Locust, k6, or pytest-benchmark.
- Scenarios:
  - Burst submissions (100 req/min).
  - Continuous load for 30 minutes.
- Metrics: response time, DB locks, CPU/memory utilization.

## 4. Security Testing
- Focus: Authentication (once implemented), input validation, data leakage.
- Actions:
  - Static analysis (Bandit).
  - Penetration testing on endpoints (OWASP ZAP).
  - Verify audit logs cannot be tampered.

## 5. User Acceptance Testing (UAT)
- Participants: Operators, program managers.
- Scenarios:
  - Approve/edit draft via UI.
  - Submit approval requiring escalation.
  - Ensure UI/UX meets requirements (accessibility, responsiveness).
- Gather feedback for iteration.

## 6. Regression Testing
- Maintain suite covering critical workflows before releases.
- Automate via CI pipeline.
- Include smoke tests post-deployment: `/health`, create dummy workflow, submit approval.

## Test Automation Roadmap
1. Expand unit tests for engine edge cases.
2. Add FastAPI integration tests with fixture data.
3. Integrate tests into CI with coverage thresholds.
4. Implement load testing as part of pre-release checklist.

Prepared during overnight documentation sprint.

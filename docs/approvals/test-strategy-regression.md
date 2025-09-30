# Regression Test Strategy

## Objective
Ensure existing functionality remains stable after changes.

## Components of Regression Suite
- Core workflow creation and listing
- Approval submission and action flows
- Auto-approval logic paths
- Draft UI interactions (smoke tests)
- Health check endpoint

## Process
1. Maintain automated regression suite (pytest + integration tests).
2. Run suite on each release candidate.
3. Include post-deployment smoke tests.

## Tooling
- pytest, pytest-xdist, FastAPI TestClient
- Optional: Selenium or Playwright for UI regression (future).

## Schedule
- Nightly regression run in CI.
- Additional runs triggered by high-risk changes.

Prepared during overnight documentation.

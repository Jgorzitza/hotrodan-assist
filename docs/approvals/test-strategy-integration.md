# Integration Test Strategy

## Objectives
Validate end-to-end interactions across API endpoints, database, and external services (assistants) using realistic scenarios.

## Test Types
1. API functional tests using FastAPI TestClient.
2. Contract tests ensuring request/response schemas remain stable.
3. Assisted mock tests simulating assistants service responses.

## Scenarios
- Create workflow, submit approval, perform approval action.
- Auto-approval triggered with rules file.
- Delegation flow to ensure stage remains pending until quorum met.
- Error handling (invalid workflow ID, missing action metadata).

## Environment Setup
- Spin up SQLite test DB in temporary directory.
- Use `pytest` fixtures to load sample workflows and rules.
- Stub assistants endpoints via `respx` or local mock server.

## Automation
- Integrate into CI pipeline; run on every merge request.
- Provide test reports and coverage metrics.

## Metrics
- Test duration (<2 min).
- Success/failure counts.

Prepared during overnight documentation.

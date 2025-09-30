# Unit Test Strategy

## Scope
- Workflow creation and retrieval
- Approval submission (with/without auto-rules)
- Action handling (approve, reject, delegate, withdraw)
- SLA calculation edge cases

## Existing Coverage
- `tests/approvals/test_engine.py`: basic workflow creation and approval scenarios

## Gaps & TODOs
- Add tests for rejection path
- Validate delegation requires assignee
- Confirm auto-approval toggles off when stage lacks `auto_rules`
- Edge case: invalid workflow ID / stage

## Tooling
- pytest, coverage.py
- Run via `python -m pytest tests/approvals`

## Success Criteria
- ≥80% coverage for engine module
- All critical paths validated before release

# Approvals Developer Guide

_Last updated: 2025-09-29_

## Purpose
Onboard engineers to the approvals workflow service architecture, development workflow, and contributing guidelines. No code changes should be attempted until repository cleanup is complete.

---

## Architecture Overview
- **FastAPI Application** (`app/approval_app/main.py`)
- **Workflow Engine** (`engine.py`)
- **Persistence Layer** (`db.py` with SQLite backend)
- **Templates** (`templates/`) for operator UI
- **Tests** (`tests/approvals/test_engine.py`)

### Data Flow
1. Client calls API endpoint.
2. Dependency injection provides `WorkflowEngine` instance.
3. Engine interacts with SQLite via `db.py` helpers.
4. Audit logs and events recorded for traceability.

### Key Modules
- `WorkflowEngine`: Business logic for workflow CRUD, approval submission, action handling.
- `AutoApprovalRules`: Loads rules from JSON file.
- `db.py`: Contains dataclasses and CRUD helpers.

---

## Development Environment Setup
1. `python3 -m venv .venv`
2. `. .venv/bin/activate`
3. `pip install -r app/approval_app/requirements.txt`
4. Set `PYTHONPATH` to repo root when running tests.
5. Launch uvicorn for local dev: `uvicorn app.approval_app.main:app --reload --port 8003`

> Ensure no repository modifications until cleanup completed.

## Testing
- Run unit tests: `python -m pytest tests/approvals/test_engine.py`
- Add new tests under `tests/approvals/` for workflow scenarios.

## Coding Guidelines
- Python 3.12, type hints required.
- Use dataclasses for DB records, Pydantic for API models.
- Enforce timezone-aware timestamps (`datetime.now(timezone.utc)`).
- Keep business logic in `engine.py`, avoid endpoint bloat.

## Logging & Observability
- Standard logging via `logging` (configure once code can change).
- Audit/event tables act as historical record.
- Plan for Prometheus metrics integration.

## Dependency Management
- `app/approval_app/requirements.txt` for service-specific deps.
- Root `requirements.txt` for project-wide dependencies.
- Pin versions once cleanup allows edits.

## Deployment Workflow
1. Update documentation & tests.
2. Run lint/tests.
3. Build Docker image and push.
4. Deploy via compose/Kubernetes per deployment guide.

## Future Work
- Implement authentication & RBAC.
- Migrate to PostgreSQL or use async DB driver.
- Introduce background worker for SLA escalations.
- Expand tests (integration, performance).

---

Prepared for extended documentation sprint.

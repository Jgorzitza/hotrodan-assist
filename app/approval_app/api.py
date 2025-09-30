"""FastAPI router providing approvals workflow endpoints."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from .engine import WorkflowEngine

router = APIRouter(prefix="/api/v1", tags=["approvals"])


def get_engine() -> WorkflowEngine:
    return WorkflowEngine()


@router.post("/workflows", status_code=status.HTTP_201_CREATED)
async def create_workflow(
    definition: Dict[str, Any], engine: WorkflowEngine = Depends(get_engine)
) -> Dict[str, Any]:
    return engine.create_workflow(definition)


@router.get("/workflows")
async def list_workflows(engine: WorkflowEngine = Depends(get_engine)) -> List[Dict[str, Any]]:
    return engine.list_workflows()


@router.get("/workflows/{workflow_id}")
async def get_workflow(
    workflow_id: str, engine: WorkflowEngine = Depends(get_engine)
) -> Dict[str, Any]:
    return engine.get_workflow(workflow_id)


@router.post("/approvals", status_code=status.HTTP_201_CREATED)
async def submit_approval(
    payload: Dict[str, Any], engine: WorkflowEngine = Depends(get_engine)
) -> JSONResponse:
    result = engine.submit_approval(**payload)
    return JSONResponse(result, status_code=status.HTTP_201_CREATED)


@router.get("/approvals")
async def list_approvals(
    status: Optional[str] = None, engine: WorkflowEngine = Depends(get_engine)
) -> List[Dict[str, Any]]:
    return engine.list_approvals(status=status)


@router.post("/approvals/{approval_id}/actions")
async def act_on_approval(
    approval_id: str,
    payload: Dict[str, Any],
    engine: WorkflowEngine = Depends(get_engine),
) -> Dict[str, Any]:
    return engine.act_on_approval(
        approval_id=approval_id,
        actor_id=payload["actor_id"],
        action=payload["action"],
        metadata=payload.get("metadata"),
    )

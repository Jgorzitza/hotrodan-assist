"""Approval App: production-grade approvals workflow service."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from fastapi import Depends, FastAPI, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

APP_ROOT = Path(__file__).resolve().parent
if str(APP_ROOT) not in sys.path:
    sys.path.insert(0, str(APP_ROOT))

from engine import WorkflowEngine  # pylint: disable=wrong-import-position

app = FastAPI(title="Approval App", version="0.4.0")
templates = Jinja2Templates(directory=str(APP_ROOT / "templates"))

ASSISTANTS_BASE = os.getenv("ASSISTANTS_BASE", "http://assistants:8002")


def get_engine() -> WorkflowEngine:
    return WorkflowEngine()


class WorkflowDefinition(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    version: Optional[str] = "1.0"
    description: Optional[str] = None
    stages: List[Dict[str, Any]]
    notifications: Optional[Dict[str, Any]] = None
    analytics: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None


class ApprovalSubmission(BaseModel):
    workflow_id: str
    target_entity: str
    payload: Dict[str, Any]
    requester_id: str


class ApprovalActionRequest(BaseModel):
    actor_id: str
    action: str
    metadata: Optional[Dict[str, Any]] = None


async def _assistants_get(path: str) -> Dict[str, Any]:
    url = f"{ASSISTANTS_BASE}{path}"
    resp = await app.state.http.get(url)
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


async def _assistants_post(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{ASSISTANTS_BASE}{path}"
    resp = await app.state.http.post(url, json=payload)
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@app.on_event("startup")
async def startup() -> None:
    app.state.http = httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=5.0))


@app.on_event("shutdown")
async def shutdown() -> None:
    await app.state.http.aclose()


@app.get("/", response_class=HTMLResponse)
async def index(request: Request, engine: WorkflowEngine = Depends(get_engine)):
    try:
        drafts = await _assistants_get("/assistants/drafts")
    except HTTPException:
        drafts = {"drafts": []}

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "drafts": drafts.get("drafts", []),
            "workflows": engine.list_workflows(),
        },
    )


@app.get("/drafts/{draft_id}", response_class=HTMLResponse)
async def view_draft(request: Request, draft_id: str):
    draft = await _assistants_get(f"/assistants/drafts/{draft_id}")
    return templates.TemplateResponse(
        "draft.html", {"request": request, "draft": draft}
    )


@app.post("/drafts/{draft_id}/approve")
async def approve_draft(draft_id: str, approver_user_id: str = Form(...)):
    await _assistants_post(
        "/assistants/approve",
        {"draft_id": draft_id, "approver_user_id": approver_user_id},
    )
    return RedirectResponse(
        f"/drafts/{draft_id}", status_code=status.HTTP_303_SEE_OTHER
    )


@app.post("/drafts/{draft_id}/edit")
async def edit_draft(
    draft_id: str,
    editor_user_id: str = Form(...),
    final_text: str = Form(...),
):
    await _assistants_post(
        "/assistants/edit",
        {
            "draft_id": draft_id,
            "editor_user_id": editor_user_id,
            "final_text": final_text,
        },
    )
    return RedirectResponse(
        f"/drafts/{draft_id}", status_code=status.HTTP_303_SEE_OTHER
    )


@app.post("/api/v1/workflows", response_model=Dict[str, Any])
async def create_workflow(
    definition: WorkflowDefinition,
    engine: WorkflowEngine = Depends(get_engine),
):
    result = engine.create_workflow(definition.model_dump())
    return JSONResponse(result, status_code=status.HTTP_201_CREATED)


@app.get("/api/v1/workflows", response_model=List[Dict[str, Any]])
async def list_workflows(engine: WorkflowEngine = Depends(get_engine)):
    return engine.list_workflows()


@app.get("/api/v1/workflows/{workflow_id}", response_model=Dict[str, Any])
async def get_workflow(workflow_id: str, engine: WorkflowEngine = Depends(get_engine)):
    return engine.get_workflow(workflow_id)


@app.post("/api/v1/approvals", response_model=Dict[str, Any])
async def submit_approval(
    payload: ApprovalSubmission,
    engine: WorkflowEngine = Depends(get_engine),
):
    result = engine.submit_approval(**payload.model_dump())
    return JSONResponse(result, status_code=status.HTTP_201_CREATED)


@app.get("/api/v1/approvals", response_model=List[Dict[str, Any]])
async def list_approvals(
    status_filter: Optional[str] = None,
    engine: WorkflowEngine = Depends(get_engine),
):
    return engine.list_approvals(status=status_filter)


@app.post("/api/v1/approvals/{approval_id}/actions", response_model=Dict[str, Any])
async def act_on_approval(
    approval_id: str,
    action: ApprovalActionRequest,
    engine: WorkflowEngine = Depends(get_engine),
):
    return engine.act_on_approval(
        approval_id=approval_id,
        actor_id=action.actor_id,
        action=action.action,
        metadata=action.metadata,
    )


@app.get("/health")
async def health():
    return {"status": "healthy", "version": app.version}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8003)

"""Approval App stub: lightweight operator UI backed by Assistants service."""
from __future__ import annotations

import os
from typing import Any, Dict

import httpx
from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates

app = FastAPI(title="Approval App", version="0.1.0")
templates = Jinja2Templates(directory="templates")

ASSISTANTS_BASE = os.getenv("ASSISTANTS_BASE", "http://assistants:8002")


@app.get("/health")
async def health() -> Dict[str, Any]:
    """App health probe.

    Attempts a quick call to assistants list endpoint with limit=1. If it
    fails or times out, report degraded status but keep endpoint responsive.
    """
    ok = True
    info: Dict[str, Any] = {"service": "approval-app"}
    try:
        resp = await app.state.http.get(f"{ASSISTANTS_BASE}/assistants/drafts", params={"limit": 1}, timeout=5.0)
        ok = ok and (resp.status_code < 400)
    except Exception as e:
        ok = False
        info["error"] = str(e.__class__.__name__)
    info["status"] = "ok" if ok else "degraded"
    info["timestamp"] = datetime.now(timezone.utc).isoformat()
    return info


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


@app.get("/")
async def index(request: Request):
    data = await _assistants_get("/assistants/drafts")
    return templates.TemplateResponse("index.html", {"request": request, "drafts": data.get("drafts", [])})


@app.get("/drafts/{draft_id}")
async def view_draft(request: Request, draft_id: str):
    draft = await _assistants_get(f"/assistants/drafts/{draft_id}")
    return templates.TemplateResponse("draft.html", {"request": request, "draft": draft})


@app.post("/drafts/{draft_id}/approve")
async def approve_draft(draft_id: str, approver_user_id: str = Form(...)):
    await _assistants_post("/assistants/approve", {"draft_id": draft_id, "approver_user_id": approver_user_id})
    return RedirectResponse(f"/drafts/{draft_id}", status_code=303)


@app.post("/drafts/{draft_id}/edit")
async def edit_draft(
    draft_id: str,
    editor_user_id: str = Form(...),
    final_text: str = Form(...),
):
    await _assistants_post(
        "/assistants/edit",
        {"draft_id": draft_id, "editor_user_id": editor_user_id, "final_text": final_text},
    )
    return RedirectResponse(f"/drafts/{draft_id}", status_code=303)

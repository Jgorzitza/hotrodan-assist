"""Approval App stub: lightweight operator UI backed by Assistants service."""
from __future__ import annotations

import os
from typing import Any, Dict
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send
import logging
import re

app = FastAPI(title="Approval App", version="0.1.0")
templates = Jinja2Templates(directory="templates")

# --- Audit logging + PII redaction middleware ---
EMAIL_RX = re.compile(r"([A-Za-z0-9._%+-])[^@\s]*(@[^\s]+)")
TOKEN_RX = re.compile(r"(?i)(authorization|bearer|api[_-]?key|token|secret|password)=([^&\s]+)")
PHONE_RX = re.compile(r"\b(\+?\d[\d\-\s]{6,}\d)\b")

logger = logging.getLogger("approval_app")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

def mask_pii(text: str) -> str:
    if not text:
        return text
    def mask_email(m: re.Match[str]) -> str:
        return f"{m.group(1)}***{m.group(2)}"
    text = EMAIL_RX.sub(mask_email, text)
    text = TOKEN_RX.sub(lambda m: f"{m.group(1)}=***", text)
    text = PHONE_RX.sub("<redacted>", text)
    return text

class AuditPIIMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        qs = request.url.query
        path = request.url.path
        safe_qs = mask_pii(qs)
        logger.info("request route=%s qs=%s", path, safe_qs)
        response = await call_next(request)
        logger.info("response route=%s status=%s", path, response.status_code)
        return response

app.add_middleware(AuditPIIMiddleware)

# --- Security headers / CSP hardening ---
class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        async def send_wrapper(event):
            if event.get("type") == "http.response.start":
                headers = event.setdefault("headers", [])
                def add(name: str, value: str):
                    headers.append((name.encode("latin-1"), value.encode("latin-1")))
                # Basic protections (tune as needed for dev)
                add("x-frame-options", "DENY")
                add("x-content-type-options", "nosniff")
                add("referrer-policy", "no-referrer")
                # CSP: allow self by default; expand in dev if needed
                csp = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
                add("content-security-policy", csp)
            await send(event)
        await self.app(scope, receive, send_wrapper)

app.add_middleware(SecurityHeadersMiddleware)

ASSISTANTS_BASE = os.getenv("ASSISTANTS_BASE", "http://assistants:8002")


@app.get("/health")
async def simple_health() -> Dict[str, Any]:
    """Lightweight liveness health check."""
    return {"status": "ok", "ts": datetime.now(timezone.utc).isoformat()}


@app.get("/ready")
async def ready() -> Dict[str, Any]:
    """Readiness check that verifies Assistants dependency is reachable (minimal call)."""
    ok = True
    info: Dict[str, Any] = {"service": "approval-app"}
    try:
        resp = await app.state.http.get(
            f"{ASSISTANTS_BASE}/assistants/drafts", params={"limit": 1}, timeout=5.0
        )
        ok = ok and (resp.status_code < 400)
    except Exception as e:
        ok = False
        info["error"] = str(e.__class__.__name__)
    info["ready"] = ok
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

"""Assistants API surfaces draft/approve/edit endpoints.
Relies on the dashboard Next.js app for persistence via internal APIs."""
import os
from datetime import datetime
from typing import Dict, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

DASHBOARD_API_URL = os.getenv("DASHBOARD_API_URL", "http://localhost:3000")
DEFAULT_MODEL_KEY = os.getenv("ASSISTANTS_MODEL", "gpt-4o-mini")
DEFAULT_PROMPT_VERSION = os.getenv("PROMPT_VERSION", "v1")

# keep small in-memory cache for placeholder drafts until RAG wiring is finished
DRAFTS: Dict[str, Dict] = {}


class DraftCreate(BaseModel):
    channel: str  # "email" | "chat"
    conversation_id: str
    incoming_text: str
    customer_email: Optional[str] = None
    context: Dict = {}


class Approve(BaseModel):
    draft_id: str
    approver_user_id: str


class Edit(BaseModel):
    draft_id: str
    editor_user_id: str
    final_text: str


async def dashboard_post(path: str, payload: Dict) -> Dict:
    url = f"{DASHBOARD_API_URL}{path}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, json=payload)
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@app.post("/assistants/draft")
async def draft(body: DraftCreate):
    # TODO: call RAG query pipeline; placeholder until wired
    suggested_text = "DRAFT_PLACEHOLDER"
    top_sources = body.context.get("top_sources", [])

    payload = {
        "conversationId": body.conversation_id,
        "modelKey": DEFAULT_MODEL_KEY,
        "promptVersion": DEFAULT_PROMPT_VERSION,
        "suggestedText": suggested_text,
        "topSources": top_sources,
    }

    result = await dashboard_post("/api/internal/drafts", payload)
    draft_id = result.get("draftId")
    if not draft_id:
        raise HTTPException(status_code=500, detail="dashboard did not return draftId")

    DRAFTS[draft_id] = {
        "text": suggested_text,
        "sources": top_sources,
        "created_at": datetime.utcnow().isoformat(),
        "conversation_id": body.conversation_id,
    }
    return {"draft_id": draft_id}


@app.post("/assistants/approve")
async def approve(body: Approve):
    draft_cache = DRAFTS.get(body.draft_id)
    final_text = draft_cache["text"] if draft_cache else ""

    payload = {
        "userId": body.approver_user_id,
        "type": "approve",
        "finalText": final_text,
        "status": "sent",
        "createOutbound": {
            "metadata": {"source": "assistants_api", "action": "approve"}
        },
    }
    await dashboard_post(f"/api/internal/drafts/{body.draft_id}/actions", payload)
    return {"sent_msg_id": "ext-approve-stub"}


@app.post("/assistants/edit")
async def edit(body: Edit):
    draft_cache = DRAFTS.get(body.draft_id)
    original_text = draft_cache["text"] if draft_cache else ""
    diff_json = {
        "operations": [
            {
                "op": "replace",
                "from": original_text,
                "to": body.final_text,
            }
        ]
    }

    payload = {
        "userId": body.editor_user_id,
        "type": "edit",
        "finalText": body.final_text,
        "status": "sent",
        "diffJson": diff_json,
        "createOutbound": {
            "metadata": {"source": "assistants_api", "action": "edit"}
        },
    }
    await dashboard_post(f"/api/internal/drafts/{body.draft_id}/actions", payload)
    DRAFTS[body.draft_id] = {
        **(draft_cache or {}),
        "text": body.final_text,
        "edited_at": datetime.utcnow().isoformat(),
    }
    return {"sent_msg_id": "ext-edit-stub"}

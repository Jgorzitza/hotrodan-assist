# FastAPI stub for drafts/approve/edit endpoints; Codex will wire DB + adapters.
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional, Any
from datetime import datetime

from app.dashboard import render_dashboard_home, render_dashboard_sales
app = FastAPI()
DRAFTS = {}; COUNTER = 0

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

class DashboardRequest(BaseModel):
    payload: Dict[str, Any]

@app.post("/assistants/draft")
def draft(body: DraftCreate):
    global COUNTER
    COUNTER += 1
    did = f"d{COUNTER}"
    DRAFTS[did] = {"text": "DRAFT_PLACEHOLDER", "sources": [], "channel": body.channel,
                   "conversation_id": body.conversation_id, "created_at": datetime.utcnow().isoformat()}
    return {"draft_id": did}

@app.post("/assistants/approve")
def approve(body: Approve):
    # Codex: send via ZohoEmailAdapter / ChatAdapter
    return {"sent_msg_id": "ext-approve-stub"}

@app.post("/assistants/edit")
def edit(body: Edit):
    # Codex: compute diff, learn, send via adapter
    return {"sent_msg_id": "ext-edit-stub"}


@app.post("/assistants/dashboard/home")
def dashboard_home(body: DashboardRequest):
    if not isinstance(body.payload, dict):
        raise HTTPException(status_code=400, detail="payload must be an object")
    result = render_dashboard_home(body.payload)
    return result


@app.post("/assistants/dashboard/sales")
def dashboard_sales(body: DashboardRequest):
    if not isinstance(body.payload, dict):
        raise HTTPException(status_code=400, detail="payload must be an object")
    result = render_dashboard_sales(body.payload)
    return result

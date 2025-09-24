# FastAPI stub for drafts/approve/edit endpoints; Codex will wire DB + adapters.
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime
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

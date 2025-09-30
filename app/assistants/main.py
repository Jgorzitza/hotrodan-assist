"""Assistants service — persists drafts and approvals via the data layer."""
from __future__ import annotations

import uuid
from dataclasses import asdict
from datetime import datetime
from typing import Dict, Generator, Optional

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from data import (
    ConversationRepository,
    CustomerSummary,
    DraftRepository,
    SessionLocal,
    get_customer_summary,
)


_get_customer_summary = get_customer_summary

app = FastAPI()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _parse_uuid(value: str) -> Optional[uuid.UUID]:
    try:
        return uuid.UUID(value)
    except (ValueError, TypeError):
        return None


class DraftCreate(BaseModel):
    channel: str  # "email" | "chat"
    conversation_id: str  # UUID or external thread id
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
def create_draft(body: DraftCreate, db: Session = Depends(get_db)):
    convo_repo = ConversationRepository(db)
    draft_repo = DraftRepository(db)

    conversation_id = _parse_uuid(body.conversation_id)
    if conversation_id:
        conversation = convo_repo.get(conversation_id)
    else:
        conversation = convo_repo.get_by_external(body.channel, body.conversation_id)
    if conversation is None:
        subject = body.context.get("subject") if isinstance(body.context, dict) else None
        conversation = convo_repo.upsert(
            channel=body.channel,
            external_thread_id=body.conversation_id,
            subject=subject,
        )

    convo_repo.add_message(
        conversation,
        direction="inbound",
        body=body.incoming_text,
        customer_email=body.customer_email,
        sent_at=datetime.utcnow(),
        raw_payload=body.context if isinstance(body.context, dict) else None,
    )

    draft = draft_repo.create(
        conversation_id=conversation.id,
        body="DRAFT_PLACEHOLDER",
        confidence=None,
    )
    return {"draft_id": str(draft.id)}


@app.post("/assistants/approve")
def approve_draft(body: Approve, db: Session = Depends(get_db)):
    draft_repo = DraftRepository(db)
    draft_id = _parse_uuid(body.draft_id)
    if not draft_id:
        raise HTTPException(status_code=400, detail="Invalid draft_id")
    draft = draft_repo.get(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft_repo.update_status(draft, "approved")
    draft_repo.add_approval(
        draft,
        approver_user_id=body.approver_user_id,
        action="approve",
        final_text=draft.body,
    )
    return {"sent_msg_id": "ext-approve-stub", "draft_id": str(draft.id)}


@app.post("/assistants/edit")
def edit_draft(body: Edit, db: Session = Depends(get_db)):
    draft_repo = DraftRepository(db)
    draft_id = _parse_uuid(body.draft_id)
    if not draft_id:
        raise HTTPException(status_code=400, detail="Invalid draft_id")
    draft = draft_repo.get(draft_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft.body = body.final_text
    draft_repo.update_status(draft, "sent")
    draft_repo.add_approval(
        draft,
        approver_user_id=body.editor_user_id,
        action="edit",
        final_text=body.final_text,
        diff="",  # TODO: compute diff for learning loop
    )
    return {"sent_msg_id": "ext-edit-stub", "draft_id": str(draft.id)}


@app.get("/customer_summary")
def customer_summary(
    email: Optional[str] = None,
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    try:
        summary: CustomerSummary = _get_customer_summary(
            db, email=email, customer_id=customer_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"customer": asdict(summary)}

"""Assistants service: manage drafts with persistent storage and channel delivery."""
from __future__ import annotations

import os
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, String, Text, select, func
from sqlalchemy import JSON
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------

def _database_url() -> str:
    raw = os.getenv("POSTGRES_URL", "sqlite+aiosqlite:///./assistants.db")
    if raw.startswith("postgresql+psycopg2://"):
        return raw.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    if raw.startswith("postgresql://"):
        return raw.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw


DATABASE_URL = _database_url()
ENGINE = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
SESSION: async_sessionmaker[AsyncSession] = async_sessionmaker(
    ENGINE, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


class Draft(Base):
    __tablename__ = "drafts"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    channel: Mapped[str] = mapped_column(String(16), nullable=False)
    conversation_id: Mapped[str] = mapped_column(String(255), nullable=False)
    incoming_text: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_text: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[List[str]] = mapped_column(JSON, default=list)
    customer_email: Mapped[Optional[str]] = mapped_column(String(255))
    context: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(24), default="draft", nullable=False)
    final_text: Mapped[Optional[str]] = mapped_column(Text)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    approved_by: Mapped[Optional[str]] = mapped_column(String(64))
    edited_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    edited_by: Mapped[Optional[str]] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    audit_trail: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    delivery_status: Mapped[str] = mapped_column(String(24), default="pending", nullable=False)
    delivery_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    delivery_error: Mapped[Optional[str]] = mapped_column(Text)


# ---------------------------------------------------------------------------
# Pydantic representations
# ---------------------------------------------------------------------------


class DraftCreate(BaseModel):
    channel: str = Field(..., pattern="^(email|chat)$")
    conversation_id: str
    incoming_text: str
    customer_email: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    top_k: Optional[int] = None


class DraftRecord(BaseModel):
    id: str
    channel: str
    conversation_id: str
    incoming_text: str
    suggested_text: str
    sources: List[str]
    customer_email: Optional[str]
    context: Dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime
    final_text: Optional[str]
    approved_at: Optional[datetime]
    approved_by: Optional[str]
    edited_at: Optional[datetime]
    edited_by: Optional[str]
    delivery_status: str
    delivery_metadata: Dict[str, Any]
    delivery_error: Optional[str]
    audit_trail: List[Dict[str, Any]]


class DraftListResponse(BaseModel):
    drafts: List[DraftRecord]


class Approve(BaseModel):
    draft_id: str
    approver_user_id: str


class Edit(BaseModel):
    draft_id: str
    editor_user_id: str
    final_text: str


@dataclass
class DeliveryResult:
    status: str
    metadata: Dict[str, Any]
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Channel adapters
# ---------------------------------------------------------------------------


class ZohoOAuthClient:
    def __init__(self, http: httpx.AsyncClient) -> None:
        self._http = http
        self._client_id = os.getenv("ZOHO_CLIENT_ID")
        self._client_secret = os.getenv("ZOHO_CLIENT_SECRET")
        self._refresh_token = os.getenv("ZOHO_REFRESH_TOKEN")
        self._auth_base = os.getenv("ZOHO_AUTH_BASE", "https://accounts.zoho.com")
        self._token: Optional[str] = None
        self._expiry_ts: float = 0.0

    def configured(self) -> bool:
        return bool(self._client_id and self._client_secret and self._refresh_token)

    async def access_token(self) -> Optional[str]:
        if not self.configured():
            return None
        now = time.time()
        if self._token and now < self._expiry_ts - 60:
            return self._token
        url = f"{self._auth_base}/oauth/v2/token"
        data = {
            "refresh_token": self._refresh_token,
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "grant_type": "refresh_token",
        }
        resp = await self._http.post(url, data=data, timeout=15.0)
        resp.raise_for_status()
        payload = resp.json()
        self._token = payload.get("access_token")
        expires_in = payload.get("expires_in", 3600)
        self._expiry_ts = now + float(expires_in)
        return self._token


class ZohoMailAdapter:
    def __init__(self, http: httpx.AsyncClient, oauth_client: ZohoOAuthClient) -> None:
        self._http = http
        self._oauth = oauth_client
        self._account_id = os.getenv("ZOHO_ACCOUNT_ID")
        self._default_from = os.getenv("ZOHO_DEFAULT_FROM")
        self._mail_base = os.getenv("ZOHO_MAIL_BASE", "https://www.mail.zoho.com").rstrip("/")

    def configured(self) -> bool:
        return bool(self._account_id and self._oauth.configured())

    async def send_email(
        self,
        to_address: str,
        subject: str,
        body: str,
        conversation_id: Optional[str] = None,
        ccaddresses: Optional[List[str]] = None,
        bccaddresses: Optional[List[str]] = None,
    ) -> DeliveryResult:
        if not self.configured():
            return DeliveryResult("skipped", {"reason": "Zoho configuration incomplete"})
        token = await self._oauth.access_token()
        if not token:
            return DeliveryResult("queued", {"reason": "unable to obtain Zoho token"}, error="token")
        endpoint = f"{self._mail_base}/api/accounts/{self._account_id}/messages"
        from_address = self._default_from or to_address
        payload = {
            "fromAddress": from_address,
            "toAddress": to_address,
            "subject": subject or "Hot Rod AN Support",
            "content": body,
        }
        if ccaddresses:
            payload["ccAddress"] = ",".join(ccaddresses)
        if bccaddresses:
            payload["bccAddress"] = ",".join(bccaddresses)
        if conversation_id:
            payload["inReplyTo"] = conversation_id
        headers = {"Authorization": f"Zoho-oauthtoken {token}"}
        try:
            resp = await self._http.post(endpoint, json=payload, headers=headers, timeout=20.0)
            if resp.status_code >= 400:
                return DeliveryResult(
                    "failed",
                    {"request_id": resp.headers.get("x-request-id")},
                    error=resp.text,
                )
            data = resp.json()
            return DeliveryResult("sent", data)
        except httpx.HTTPError as exc:
            return DeliveryResult("failed", {}, error=str(exc))


class ShopifyChatAdapter:
    def __init__(self, http: httpx.AsyncClient) -> None:
        self._http = http
        self._shop = os.getenv("SHOPIFY_SHOP")
        self._token = os.getenv("SHOPIFY_ACCESS_TOKEN")
        version = os.getenv("SHOPIFY_API_VERSION", "2024-10")
        if self._shop:
            self._endpoint = f"https://{self._shop}/admin/api/{version}/graphql.json"
        else:
            self._endpoint = None

    def configured(self) -> bool:
        return bool(self._endpoint and self._token)

    async def send_message(self, conversation_id: str, body: str) -> DeliveryResult:
        if not self.configured():
            return DeliveryResult("skipped", {"reason": "Shopify configuration incomplete"})
        mutation = (
            "mutation conversationReply($conversationId: ID!, $message: String!) {"
            "  conversationReply(conversationId: $conversationId, message: { body: $message }) {"
            "    reply { id }"
            "    userErrors { field message }"
            "  }"
            "}"
        )
        variables = {"conversationId": conversation_id, "message": body}
        headers = {
            "X-Shopify-Access-Token": self._token,
            "Content-Type": "application/json",
        }
        try:
            resp = await self._http.post(
                self._endpoint,
                json={"query": mutation, "variables": variables},
                headers=headers,
                timeout=20.0,
            )
            data = resp.json()
            errors = data.get("errors")
            user_errors = (
                data.get("data", {})
                .get("conversationReply", {})
                .get("userErrors", [])
            )
            if resp.status_code >= 400 or errors or user_errors:
                return DeliveryResult(
                    "failed",
                    {"errors": errors, "userErrors": user_errors},
                    error=resp.text,
                )
            reply = data.get("data", {}).get("conversationReply", {}).get("reply", {})
            return DeliveryResult("sent", reply or {})
        except httpx.HTTPError as exc:
            return DeliveryResult("failed", {}, error=str(exc))


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------


app = FastAPI(title="Assistants Service", version="0.2.0")
RAG_API_URL = os.getenv("RAG_API_URL", "http://rag-api:8001/query")
DEFAULT_TOP_K = int(os.getenv("RAG_TOP_K", "10"))


def _serialize(draft: Draft) -> DraftRecord:
    return DraftRecord(
        id=draft.id,
        channel=draft.channel,
        conversation_id=draft.conversation_id,
        incoming_text=draft.incoming_text,
        suggested_text=draft.suggested_text,
        sources=list(draft.sources or []),
        customer_email=draft.customer_email,
        context=dict(draft.context or {}),
        status=draft.status,
        created_at=draft.created_at,
        updated_at=draft.updated_at,
        final_text=draft.final_text,
        approved_at=draft.approved_at,
        approved_by=draft.approved_by,
        edited_at=draft.edited_at,
        edited_by=draft.edited_by,
        delivery_status=draft.delivery_status,
        delivery_metadata=dict(draft.delivery_metadata or {}),
        delivery_error=draft.delivery_error,
        audit_trail=list(draft.audit_trail or []),
    )


async def _fetch_rag_answer(http: httpx.AsyncClient, question: str, top_k: int) -> Dict[str, Any]:
    payload = {"question": question, "top_k": top_k}
    try:
        resp = await http.post(RAG_API_URL, json=payload, timeout=20.0)
        resp.raise_for_status()
        data = resp.json()
        return {
            "answer": data.get("answer", ""),
            "sources": data.get("sources", []),
        }
    except httpx.HTTPError as exc:
        return {
            "answer": "Draft queued for human review; retrieval unavailable.",
            "sources": [],
            "error": str(exc),
        }


async def _dispatch_delivery(record: DraftRecord) -> DeliveryResult:
    if record.channel == "email":
        if not record.customer_email:
            return DeliveryResult("failed", {}, error="missing customer_email")
        subject = record.context.get("subject") if record.context else ""
        return await app.state.zoho_adapter.send_email(
            to_address=record.customer_email,
            subject=subject or "Hot Rod AN Support",
            body=record.final_text or record.suggested_text,
            conversation_id=record.conversation_id,
        )
    if record.channel == "chat":
        return await app.state.shopify_adapter.send_message(
            conversation_id=record.conversation_id,
            body=record.final_text or record.suggested_text,
        )
    return DeliveryResult("skipped", {"reason": f"unknown channel {record.channel}"})


@app.on_event("startup")
async def startup() -> None:
    async with ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.state.http = httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0))
    oauth_client = ZohoOAuthClient(app.state.http)
    app.state.zoho_adapter = ZohoMailAdapter(app.state.http, oauth_client)
    app.state.shopify_adapter = ShopifyChatAdapter(app.state.http)


@app.on_event("shutdown")
async def shutdown() -> None:
    await app.state.http.aclose()
    await ENGINE.dispose()


@app.get("/assistants/drafts", response_model=DraftListResponse)
async def list_drafts() -> DraftListResponse:
    async with SESSION() as session:
        result = await session.execute(select(Draft).order_by(Draft.created_at.desc()).limit(200))
        drafts = [_serialize(d) for d in result.scalars().all()]
        return DraftListResponse(drafts=drafts)


@app.get("/assistants/drafts/{draft_id}", response_model=DraftRecord)
async def get_draft(draft_id: str) -> DraftRecord:
    async with SESSION() as session:
        draft = await session.get(Draft, draft_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        return _serialize(draft)


@app.post("/assistants/draft", response_model=DraftRecord)
async def draft(body: DraftCreate) -> DraftRecord:
    top_k = body.top_k or DEFAULT_TOP_K
    rag_data = await _fetch_rag_answer(app.state.http, body.incoming_text, top_k)
    now = datetime.utcnow()
    draft_id = f"d-{uuid4().hex[:10]}"
    audit = [{"event": "created", "timestamp": now.isoformat()}]
    if rag_data.get("error"):
        audit.append({"event": "rag_error", "detail": rag_data["error"], "timestamp": now.isoformat()})
    new_draft = Draft(
        id=draft_id,
        channel=body.channel,
        conversation_id=body.conversation_id,
        incoming_text=body.incoming_text,
        suggested_text=rag_data.get("answer", ""),
        sources=list(rag_data.get("sources", [])),
        customer_email=body.customer_email,
        context=body.context,
        status="draft",
        audit_trail=audit,
        delivery_status="pending",
    )
    async with SESSION() as session:
        session.add(new_draft)
        await session.commit()
        await session.refresh(new_draft)
        return _serialize(new_draft)


@app.post("/assistants/approve", response_model=DraftRecord)
async def approve(body: Approve) -> DraftRecord:
    async with SESSION() as session:
        draft = await session.get(Draft, body.draft_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        now = datetime.utcnow()
        final_text = draft.suggested_text
        draft.status = "approved"
        draft.final_text = final_text
        draft.approved_at = now
        draft.approved_by = body.approver_user_id
        draft.updated_at = now
        draft.delivery_status = "pending"
        trail = list(draft.audit_trail or [])
        trail.append({"event": "approved", "user": body.approver_user_id, "timestamp": now.isoformat()})
        draft.audit_trail = trail
        await session.commit()
        await session.refresh(draft)
        record = _serialize(draft)
    delivery = await _dispatch_delivery(record)
    async with SESSION() as session:
        draft = await session.get(Draft, body.draft_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found after approval")
        trail = list(draft.audit_trail or [])
        trail.append(
            {
                "event": "delivery",
                "channel": draft.channel,
                "status": delivery.status,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        draft.delivery_status = delivery.status
        draft.delivery_metadata = delivery.metadata
        draft.delivery_error = delivery.error
        draft.audit_trail = trail
        draft.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(draft)
        return _serialize(draft)


@app.post("/assistants/edit", response_model=DraftRecord)
async def edit(body: Edit) -> DraftRecord:
    async with SESSION() as session:
        draft = await session.get(Draft, body.draft_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        now = datetime.utcnow()
        draft.status = "edited"
        draft.final_text = body.final_text
        draft.edited_at = now
        draft.edited_by = body.editor_user_id
        draft.updated_at = now
        draft.delivery_status = "pending"
        trail = list(draft.audit_trail or [])
        trail.append(
            {
                "event": "edited",
                "user": body.editor_user_id,
                "timestamp": now.isoformat(),
            }
        )
        draft.audit_trail = trail
        await session.commit()
        await session.refresh(draft)
        record = _serialize(draft)
    delivery = await _dispatch_delivery(record)
    async with SESSION() as session:
        draft = await session.get(Draft, body.draft_id)
        if not draft:
            raise HTTPException(status_code=404, detail="Draft not found after edit")
        trail = list(draft.audit_trail or [])
        trail.append(
            {
                "event": "delivery",
                "channel": draft.channel,
                "status": delivery.status,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        draft.delivery_status = delivery.status
        draft.delivery_metadata = delivery.metadata
        draft.delivery_error = delivery.error
        draft.audit_trail = trail
        draft.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(draft)
        return _serialize(draft)

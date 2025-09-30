"""Sync service receives external webhooks and pushes them into the dashboard database via internal APIs."""
import os
from typing import Any, Dict, Optional

import httpx
from fastapi import FastAPI, HTTPException, Request

app = FastAPI()

DASHBOARD_API_URL = os.getenv("DASHBOARD_API_URL", "http://localhost:3000")
DEFAULT_ACCOUNT_ID = os.getenv("DEFAULT_ACCOUNT_ID", "seed-hotrodan")
ZOHO_CHANNEL_EXTERNAL_ID = os.getenv("ZOHO_CHANNEL_EXTERNAL_ID", "zoho-mailbox-hotrodan")
ZOHO_CHANNEL_TYPE = os.getenv("ZOHO_CHANNEL_TYPE", "email")
SHOPIFY_CHANNEL_EXTERNAL_ID = os.getenv("SHOPIFY_CHANNEL_EXTERNAL_ID", "shopify-support-hotrodan")
SHOPIFY_CHANNEL_TYPE = os.getenv("SHOPIFY_CHANNEL_TYPE", "shopify")


async def dashboard_post(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{DASHBOARD_API_URL}{path}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, json=payload)
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


def _get_conversation_external_id(payload: Dict[str, Any], fallback_prefix: str) -> str:
    candidate_keys = [
        "conversation_id",
        "conversationId",
        "ticketId",
        "threadId",
        "id",
        "messageId",
    ]
    for key in candidate_keys:
        value = payload.get(key)
        if value:
            return str(value)
    return f"{fallback_prefix}-{payload.get('uuid', payload.get('reference', 'unknown'))}"


def _extract_body(payload: Dict[str, Any]) -> str:
    for key in ("body", "bodyText", "content", "message"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return ""


def _extract_subject(payload: Dict[str, Any]) -> Optional[str]:
    for key in ("subject", "topic", "title"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def _extract_customer_email(payload: Dict[str, Any]) -> Optional[str]:
    for key in ("customerEmail", "from", "email", "customer_email"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


@app.post("/zoho/incoming")
async def zoho_incoming(req: Request):
    payload = await req.json()
    conversation_external_id = _get_conversation_external_id(payload, "zoho")
    body_text = _extract_body(payload)

    if not body_text:
        raise HTTPException(status_code=400, detail="Zoho payload missing body text")

    message_payload = {
        "accountId": DEFAULT_ACCOUNT_ID,
        "channelExternalId": ZOHO_CHANNEL_EXTERNAL_ID,
        "channelType": ZOHO_CHANNEL_TYPE,
        "channelName": payload.get("mailboxName"),
        "channelMetadata": payload.get("channelMetadata"),
        "externalId": payload.get("messageId"),
        "subject": _extract_subject(payload),
        "customerEmail": _extract_customer_email(payload),
        "customerName": payload.get("customerName"),
        "direction": "inbound",
        "bodyText": body_text,
        "bodyHtml": payload.get("bodyHtml"),
        "metadata": payload,
        "sentAt": payload.get("createdAt"),
    }

    await dashboard_post(
        f"/api/internal/conversations/{conversation_external_id}/messages", message_payload
    )
    return {"ok": True}


@app.post("/shopify/webhook")
async def shopify_webhook(req: Request):
    payload = await req.json()
    conversation_external_id = _get_conversation_external_id(payload, "shopify")
    body_text = _extract_body(payload)

    if not body_text:
        raise HTTPException(status_code=400, detail="Shopify payload missing body text")

    message_payload = {
        "accountId": DEFAULT_ACCOUNT_ID,
        "channelExternalId": SHOPIFY_CHANNEL_EXTERNAL_ID,
        "channelType": SHOPIFY_CHANNEL_TYPE,
        "channelName": payload.get("channelName", "Shopify"),
        "channelMetadata": payload.get("channelMetadata"),
        "externalId": payload.get("messageId"),
        "subject": _extract_subject(payload),
        "customerEmail": _extract_customer_email(payload),
        "customerName": payload.get("customerName"),
        "direction": payload.get("direction", "inbound"),
        "bodyText": body_text,
        "metadata": payload,
        "sentAt": payload.get("createdAt"),
    }

    await dashboard_post(
        f"/api/internal/conversations/{conversation_external_id}/messages", message_payload
    )
    return {"ok": True}

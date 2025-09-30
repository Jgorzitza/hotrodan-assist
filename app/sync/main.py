"""Sync service: handles webhooks and ingestion fan-out."""
from __future__ import annotations

import hmac
import json
import os
from hashlib import sha256
from typing import Any, Dict, Generator

from fastapi import Depends, FastAPI, HTTPException, Request
from sqlalchemy.orm import Session

from data import SessionLocal
from sync.shopify_ingest import (
    enqueue_shopify_event,
    process_customer_payload,
    process_inventory_payload,
    process_order_payload,
)
from sync.zoho_ingest import enqueue_incoming_email, process_incoming_email

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


def _queue_enabled() -> bool:
    return os.getenv("SYNC_USE_CELERY", "1") not in {"0", "false", "False"}


@app.post("/zoho/incoming")
async def zoho_incoming(req: Request, db: Session = Depends(get_db)) -> Dict[str, Any]:
    payload = await req.json()
    if _queue_enabled():
        enqueue_incoming_email(payload)
        return {"queued": True}
    result = process_incoming_email(db, payload)
    return {"processed": True, **result}


@app.post("/shopify/webhook")
async def shopify_webhook(req: Request, db: Session = Depends(get_db)) -> Dict[str, Any]:
    body = await req.body()
    _verify_shopify_hmac(req.headers, body)
    payload = json.loads(body)
    topic = req.headers.get("X-Shopify-Topic", "").split("/")
    event = topic[-1] if topic else ""

    if _queue_enabled():
        enqueue_shopify_event(event or "unknown", payload)
        return {"queued": True, "event": event}

    if event == "customers":
        result = process_customer_payload(db, payload)
    elif event == "orders":
        result = process_order_payload(db, payload)
    elif event in {"inventory_levels", "products"}:
        result = process_inventory_payload(db, payload)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported Shopify topic: {event}")
    return {"processed": True, **result}


def _verify_shopify_hmac(headers: Dict[str, str], body: bytes) -> None:
    secret = os.getenv("SHOPIFY_WEBHOOK_SECRET")
    if not secret:
        return
    hmac_header = headers.get("X-Shopify-Hmac-Sha256")
    if not hmac_header:
        raise HTTPException(status_code=401, detail="Missing HMAC header")
    digest = hmac.new(secret.encode(), body, sha256).hexdigest()
    if not hmac.compare_digest(digest, hmac_header):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

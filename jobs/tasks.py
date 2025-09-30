"""Celery task definitions."""
from __future__ import annotations

from typing import Any, Dict

from jobs.celery_app import celery_app


@celery_app.task(name="jobs.tasks.process_incoming_email_task")
def process_incoming_email_task(payload: Dict[str, Any]) -> Dict[str, Any]:
    from data import get_session
    from sync.zoho_ingest import process_incoming_email

    with get_session() as session:
        result = process_incoming_email(session, payload)
    return result


@celery_app.task(name="jobs.tasks.process_shopify_event_task")
def process_shopify_event_task(event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    from data import get_session
    from sync import shopify_ingest

    with get_session() as session:
        if event_type == "customer":
            result = shopify_ingest.process_customer_payload(session, payload)
        elif event_type == "order":
            result = shopify_ingest.process_order_payload(session, payload)
        elif event_type == "inventory":
            result = shopify_ingest.process_inventory_payload(session, payload)
        else:
            raise ValueError(f"Unsupported Shopify event type: {event_type}")
    return result

"""Celery configuration."""
from __future__ import annotations

import os

from celery import Celery

BROKER_URL = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", BROKER_URL)

celery_app = Celery("hotrodan", broker=BROKER_URL, backend=RESULT_BACKEND)
celery_app.conf.update(
    task_default_queue="default",
    task_routes={
        "jobs.tasks.process_incoming_email_task": {"queue": "ingest"},
        "jobs.tasks.process_shopify_event_task": {"queue": "ingest"},
    },
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

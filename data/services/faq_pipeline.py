"""FAQ proposal and publishing helpers."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from data.models import FaqEntry


class FaqPipelineService:
    """Encapsulates logic for proposing and publishing FAQ entries."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def propose(
        self,
        *,
        question: str,
        answer: str,
        source_intent: str | None = None,
    ) -> FaqEntry:
        entry = FaqEntry(
            question=question,
            answer=answer,
            source_intent=source_intent,
        )
        self.session.add(entry)
        return entry

    def publish(self, faq_id: uuid.UUID, *, published_at: Optional[datetime] = None) -> FaqEntry:
        entry = self.session.get(FaqEntry, faq_id)
        if entry is None:
            raise ValueError(f"FAQ entry {faq_id} not found")
        entry.status = "published"
        entry.published_at = published_at or datetime.utcnow()
        return entry

    def list_candidates(self, limit: int = 20) -> list[FaqEntry]:
        stmt = select(FaqEntry).where(FaqEntry.status == "draft").order_by(FaqEntry.created_at.desc()).limit(limit)
        return list(self.session.execute(stmt).scalars())

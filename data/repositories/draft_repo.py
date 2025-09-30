"""Draft persistence helpers."""
from __future__ import annotations

import uuid
from typing import Iterable, Optional, Sequence

from sqlalchemy import select

from data.models import Approval, Draft, ModelRun

from .base import Repository


class DraftRepository(Repository):
    """CRUD helpers for drafts and approvals."""

    def get(self, draft_id: uuid.UUID) -> Optional[Draft]:
        return self.session.get(Draft, draft_id)

    def create(
        self,
        *,
        conversation_id: uuid.UUID,
        body: str,
        confidence: Optional[float] = None,
        sources: Optional[Sequence[str]] = None,
        corrections_applied: Optional[Sequence[str]] = None,
    ) -> Draft:
        draft = Draft(
            conversation_id=conversation_id,
            body=body,
            confidence=confidence,
            sources=list(sources or []),
            corrections_applied=list(corrections_applied or []),
        )
        self.session.add(draft)
        return draft

    def attach_model_run(
        self,
        draft: Draft,
        *,
        model_slug: str,
        prompt_hash: str | None,
        temperature: float | None,
        tokens_in: int,
        tokens_out: int,
        cost_cents: int | None = None,
        sources: Iterable[str] = (),
        extra: dict | None = None,
    ) -> ModelRun:
        run = ModelRun(
            model_slug=model_slug,
            prompt_hash=prompt_hash,
            temperature=temperature,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_cents=cost_cents,
            sources=list(sources),
            extra=extra or {},
        )
        draft.model_run = run
        self.session.add(run)
        return run

    def update_status(self, draft: Draft, status: str) -> Draft:
        draft.status = status
        return draft

    def add_approval(
        self,
        draft: Draft,
        *,
        approver_user_id: str,
        action: str,
        final_text: str | None = None,
        diff: str | None = None,
    ) -> Approval:
        approval = Approval(
            draft=draft,
            approver_user_id=approver_user_id,
            action=action,
            final_text=final_text,
            diff=diff,
        )
        self.session.add(approval)
        return approval

    def list_pending(self, limit: int = 50) -> list[Draft]:
        stmt = select(Draft).where(Draft.status == "pending").order_by(Draft.created_at.asc()).limit(limit)
        return list(self.session.execute(stmt).scalars())


__all__ = ["DraftRepository"]

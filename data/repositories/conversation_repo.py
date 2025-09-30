"""Conversation + message persistence helpers."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from data.models import Conversation, Message

from .base import Repository


class ConversationRepository(Repository):
    """Persistence operations for conversations and messages."""

    def get(self, conversation_id: uuid.UUID) -> Optional[Conversation]:
        return self.session.get(Conversation, conversation_id)

    def get_by_external(self, channel: str, external_thread_id: str) -> Optional[Conversation]:
        stmt = select(Conversation).where(
            Conversation.channel == channel,
            Conversation.external_thread_id == external_thread_id,
        )
        return self.session.execute(stmt).scalars().first()

    def upsert(
        self,
        *,
        channel: str,
        external_thread_id: str,
        subject: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Conversation:
        conversation = self.get_by_external(channel, external_thread_id)
        if conversation is None:
            conversation = Conversation(
                channel=channel,
                external_thread_id=external_thread_id,
                subject=subject,
            )
            if status:
                conversation.status = status
            self.session.add(conversation)
        else:
            if subject:
                conversation.subject = subject
            if status:
                conversation.status = status
        return conversation

    def add_message(
        self,
        conversation: Conversation,
        *,
        direction: str,
        body: str,
        sent_at: Optional[datetime] = None,
        external_msg_id: Optional[str] = None,
        customer_email: Optional[str] = None,
        raw_payload: Optional[dict[str, Any]] = None,
    ) -> Message:
        message = Message(
            conversation=conversation,
            direction=direction,
            body=body,
            sent_at=sent_at,
            external_msg_id=external_msg_id,
            customer_email=customer_email,
            raw_payload=raw_payload or {},
        )
        conversation.last_message_at = sent_at or datetime.utcnow()
        self.session.add(message)
        return message

    def set_status(self, conversation: Conversation, status: str) -> Conversation:
        conversation.status = status
        return conversation


__all__ = ["ConversationRepository"]

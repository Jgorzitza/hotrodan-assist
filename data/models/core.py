"""ORM models for the Hot Rod AN data layer."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.mutable import MutableDict, MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


message_direction_enum = Enum(
    "inbound",
    "outbound",
    name="message_direction",
)

draft_status_enum = Enum(
    "pending",
    "approved",
    "sent",
    "superseded",
    name="draft_status",
)

approval_action_enum = Enum(
    "approve",
    "edit",
    "reject",
    name="approval_action",
)

faq_status_enum = Enum(
    "draft",
    "published",
    name="faq_status",
)


class Conversation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "conversations"
    __table_args__ = (
        Index("ix_conversation_external", "channel", "external_thread_id", unique=True),
    )

    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    external_thread_id: Mapped[Optional[str]] = mapped_column(String(255))
    subject: Mapped[Optional[str]] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="open", nullable=False)
    last_message_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", order_by="Message.sent_at"
    )
    drafts: Mapped[list["Draft"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )
    product_requests: Mapped[list["ProductRequest"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )


class Message(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_conversation", "conversation_id", "sent_at"),
    )

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    direction: Mapped[str] = mapped_column(message_direction_enum, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    external_msg_id: Mapped[Optional[str]] = mapped_column(String(255))
    sent_at: Mapped[Optional[datetime]] = mapped_column(index=True)
    customer_email: Mapped[Optional[str]] = mapped_column(String(255))
    raw_payload: Mapped[dict[str, Any]] = mapped_column(
        MutableDict.as_mutable(JSONB), default=dict, nullable=False
    )

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class ModelRun(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "model_runs"

    model_slug: Mapped[str] = mapped_column(String(64), nullable=False)
    prompt_hash: Mapped[Optional[str]] = mapped_column(String(128))
    temperature: Mapped[Optional[float]] = mapped_column(Numeric(4, 3))
    tokens_in: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cost_cents: Mapped[Optional[int]] = mapped_column(Integer)
    sources: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSONB), default=list, nullable=False
    )
    extra: Mapped[dict[str, Any]] = mapped_column(
        MutableDict.as_mutable(JSONB), default=dict, nullable=False
    )

    drafts: Mapped[list["Draft"]] = relationship(back_populates="model_run")


class Draft(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "drafts"
    __table_args__ = (
        Index("ix_drafts_conversation", "conversation_id", "created_at"),
    )

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    model_run_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("model_runs.id", ondelete="SET NULL"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Numeric(4, 3))
    status: Mapped[str] = mapped_column(draft_status_enum, default="pending", nullable=False)
    sources: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSONB), default=list, nullable=False
    )
    corrections_applied: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSONB), default=list, nullable=False
    )

    conversation: Mapped[Conversation] = relationship(back_populates="drafts")
    model_run: Mapped[Optional[ModelRun]] = relationship(back_populates="drafts")
    approvals: Mapped[list["Approval"]] = relationship(
        back_populates="draft", cascade="all, delete-orphan"
    )


class Approval(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "approvals"
    __table_args__ = (
        Index("ix_approvals_draft", "draft_id", "taken_at"),
    )

    draft_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("drafts.id", ondelete="CASCADE"), nullable=False
    )
    approver_user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(approval_action_enum, nullable=False)
    final_text: Mapped[Optional[str]] = mapped_column(Text)
    diff: Mapped[Optional[str]] = mapped_column(Text)
    taken_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)

    draft: Mapped[Draft] = relationship(back_populates="approvals")


class StyleProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "style_profiles"
    __table_args__ = (
        UniqueConstraint("owner_user_id", name="uq_style_profile_owner"),
    )

    owner_user_id: Mapped[str] = mapped_column(String(64), nullable=False)
    tone_config: Mapped[dict[str, Any]] = mapped_column(
        MutableDict.as_mutable(JSONB), default=dict, nullable=False
    )
    last_applied_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)


class Customer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "customers"
    __table_args__ = (
        UniqueConstraint("email", name="uq_customer_email"),
        UniqueConstraint("shopify_id", name="uq_customer_shopify_id"),
    )

    email: Mapped[Optional[str]] = mapped_column(String(255))
    shopify_id: Mapped[Optional[str]] = mapped_column(String(64))
    name: Mapped[Optional[str]] = mapped_column(String(255))
    lifetime_value: Mapped[Optional[int]] = mapped_column(Integer)
    segment: Mapped[Optional[str]] = mapped_column(String(64))
    shipping_addresses: Mapped[list[dict[str, Any]]] = mapped_column(
        MutableList.as_mutable(JSONB), default=list, nullable=False
    )

    orders: Mapped[list["Order"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )
    product_requests: Mapped[list["ProductRequest"]] = relationship(back_populates="customer")


class Order(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint("shopify_id", name="uq_order_shopify_id"),
        Index("ix_orders_customer", "customer_id"),
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    shopify_id: Mapped[Optional[str]] = mapped_column(String(64))
    status: Mapped[Optional[str]] = mapped_column(String(64))
    subtotal_cents: Mapped[Optional[int]] = mapped_column(Integer)
    total_cents: Mapped[Optional[int]] = mapped_column(Integer)
    currency: Mapped[Optional[str]] = mapped_column(String(3))
    tracking_numbers: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSONB), default=list, nullable=False
    )
    last_event_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    customer: Mapped[Optional[Customer]] = relationship(back_populates="orders")


class InventoryItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "inventory_items"
    __table_args__ = (
        UniqueConstraint("sku", name="uq_inventory_sku"),
        UniqueConstraint("shopify_id", name="uq_inventory_shopify_id"),
    )

    sku: Mapped[str] = mapped_column(String(64), nullable=False)
    shopify_id: Mapped[Optional[str]] = mapped_column(String(64))
    title: Mapped[Optional[str]] = mapped_column(String(255))
    quantity_available: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    lead_time_days: Mapped[Optional[int]] = mapped_column(Integer)
    price_cents: Mapped[Optional[int]] = mapped_column(Integer)
    currency: Mapped[Optional[str]] = mapped_column(String(3))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class FaqEntry(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "faq_entries"

    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(faq_status_enum, default="draft", nullable=False)
    source_intent: Mapped[Optional[str]] = mapped_column(String(255))
    published_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)


class Correction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "corrections"

    pattern: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[list[str]] = mapped_column(
        MutableList.as_mutable(JSONB), default=list, nullable=False
    )
    last_verified: Mapped[Optional[datetime]] = mapped_column(nullable=True)


class ProductRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_requests"
    __table_args__ = (
        Index("ix_product_request_trend", "trend_score"),
    )

    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True
    )
    conversation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    trend_score: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))

    customer: Mapped[Optional[Customer]] = relationship(back_populates="product_requests")
    conversation: Mapped[Optional[Conversation]] = relationship(back_populates="product_requests")


class AuditLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("ix_audit_log_event", "event_type", "created_at"),
    )

    event_type: Mapped[str] = mapped_column(String(128), nullable=False)
    actor: Mapped[Optional[str]] = mapped_column(String(64))
    payload: Mapped[dict[str, Any]] = mapped_column(
        MutableDict.as_mutable(JSONB), default=dict, nullable=False
    )
    correlation_id: Mapped[Optional[str]] = mapped_column(String(64))


class ShopifyCursor(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "shopify_cursors"
    __table_args__ = (
        UniqueConstraint("resource", name="uq_shopify_cursor_resource"),
    )

    resource: Mapped[str] = mapped_column(String(64), nullable=False)
    cursor: Mapped[Optional[str]] = mapped_column(String(255))
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

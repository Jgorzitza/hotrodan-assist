"""Customer summary read model."""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from data.repositories import CustomerRepository


@dataclass
class CustomerSummary:
    customer_id: str
    name: Optional[str]
    email: Optional[str]
    segment: Optional[str]
    lifetime_value_cents: Optional[int]
    shipping_addresses: list[dict]
    recent_order: Optional[dict]


def get_customer_summary(
    session: Session,
    *,
    email: Optional[str] = None,
    customer_id: Optional[str] = None,
) -> CustomerSummary:
    """Return a normalized customer summary for prompts/dashboard consumption."""

    if not email and not customer_id:
        raise ValueError("email or customer_id must be provided")

    repo = CustomerRepository(session)

    customer = None
    if customer_id:
        try:
            customer_uuid = uuid.UUID(customer_id)
        except ValueError as exc:
            raise ValueError("customer_id must be a valid UUID") from exc
        customer = repo.get(customer_uuid)
    if customer is None and email:
        customer = repo.get_by_email(email)

    if customer is None:
        raise LookupError("Customer not found")

    payload = repo.build_customer_summary(customer)
    return CustomerSummary(
        customer_id=payload["customer_id"],
        name=payload.get("name"),
        email=payload.get("email"),
        segment=payload.get("segment"),
        lifetime_value_cents=payload.get("lifetime_value_cents"),
        shipping_addresses=payload.get("shipping_addresses", []),
        recent_order=payload.get("recent_order"),
    )

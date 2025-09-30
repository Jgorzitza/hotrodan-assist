"""Customer, order, and inventory helpers."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select

from data.models import Customer, InventoryItem, Order

from .base import Repository


class CustomerRepository(Repository):
    """CRUD helpers for customer-centric data."""

    def get(self, customer_id: uuid.UUID) -> Optional[Customer]:
        return self.session.get(Customer, customer_id)

    def get_by_email(self, email: str) -> Optional[Customer]:
        stmt = select(Customer).where(Customer.email == email)
        return self.session.execute(stmt).scalars().first()

    def upsert_shopify_customer(
        self,
        *,
        email: str | None,
        shopify_id: str | None,
        name: str | None,
        lifetime_value: int | None,
        segment: str | None,
        shipping_addresses: list[dict[str, Any]] | None,
    ) -> Customer:
        customer: Optional[Customer] = None
        if shopify_id:
            stmt = select(Customer).where(Customer.shopify_id == shopify_id)
            customer = self.session.execute(stmt).scalars().first()
        if customer is None and email:
            stmt = select(Customer).where(Customer.email == email)
            customer = self.session.execute(stmt).scalars().first()
        if customer is None:
            customer = Customer()
            self.session.add(customer)

        customer.email = email or customer.email
        customer.shopify_id = shopify_id or customer.shopify_id
        customer.name = name or customer.name
        if lifetime_value is not None:
            customer.lifetime_value = lifetime_value
        if segment is not None:
            customer.segment = segment
        if shipping_addresses is not None:
            customer.shipping_addresses = shipping_addresses
        return customer

    def upsert_order(
        self,
        *,
        shopify_id: str,
        customer: Customer | None,
        status: str | None,
        subtotal_cents: int | None,
        total_cents: int | None,
        currency: str | None,
        tracking_numbers: list[str] | None,
        last_event_at: datetime | None,
    ) -> Order:
        stmt = select(Order).where(Order.shopify_id == shopify_id)
        existing = self.session.execute(stmt).scalars().first()
        if existing is None:
            existing = Order(shopify_id=shopify_id)
            self.session.add(existing)
        existing.customer = customer
        if status is not None:
            existing.status = status
        if subtotal_cents is not None:
            existing.subtotal_cents = subtotal_cents
        if total_cents is not None:
            existing.total_cents = total_cents
        if currency:
            existing.currency = currency
        if tracking_numbers is not None:
            existing.tracking_numbers = tracking_numbers
        if last_event_at is not None:
            existing.last_event_at = last_event_at
        return existing

    def upsert_inventory_item(
        self,
        *,
        sku: str,
        shopify_id: str | None,
        title: str | None,
        quantity_available: int | None,
        lead_time_days: int | None,
        price_cents: int | None,
        currency: str | None,
        is_active: bool | None = None,
    ) -> InventoryItem:
        stmt = select(InventoryItem).where(InventoryItem.sku == sku)
        item = self.session.execute(stmt).scalars().first()
        if item is None and shopify_id:
            stmt = select(InventoryItem).where(InventoryItem.shopify_id == shopify_id)
            item = self.session.execute(stmt).scalars().first()
        if item is None:
            item = InventoryItem(sku=sku)
            self.session.add(item)
        item.shopify_id = shopify_id or item.shopify_id
        if title is not None:
            item.title = title
        if quantity_available is not None:
            item.quantity_available = quantity_available
        if lead_time_days is not None:
            item.lead_time_days = lead_time_days
        if price_cents is not None:
            item.price_cents = price_cents
        if currency is not None:
            item.currency = currency
        if is_active is not None:
            item.is_active = is_active
        return item

    def build_customer_summary(self, customer: Customer) -> dict[str, Any]:
        latest_order = None
        if customer.orders:
            latest_order = max(
                customer.orders,
                key=lambda o: o.last_event_at or o.created_at,
            )
        return {
            "customer_id": str(customer.id),
            "name": customer.name,
            "email": customer.email,
            "segment": customer.segment,
            "lifetime_value_cents": customer.lifetime_value,
            "shipping_addresses": customer.shipping_addresses,
            "recent_order": self._serialize_order(latest_order) if latest_order else None,
        }

    @staticmethod
    def _serialize_order(order: Order | None) -> dict[str, Any] | None:
        if order is None:
            return None
        return {
            "order_id": str(order.id),
            "shopify_id": order.shopify_id,
            "status": order.status,
            "total_cents": order.total_cents,
            "currency": order.currency,
            "tracking_numbers": order.tracking_numbers,
            "last_event_at": order.last_event_at.isoformat() if order.last_event_at else None,
        }


__all__ = ["CustomerRepository"]

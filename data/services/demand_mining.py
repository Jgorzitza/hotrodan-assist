"""Demand mining report helpers."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from data.models import ProductRequest


class DemandMiningService:
    """Aggregates product requests to spot demand trends."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def top_requests(
        self,
        *,
        since: datetime | None = None,
        limit: int = 20,
    ) -> list[dict[str, object]]:
        since = since or datetime.utcnow() - timedelta(days=7)
        stmt = (
            select(
                ProductRequest.description,
                func.sum(ProductRequest.count).label("total_count"),
                func.max(ProductRequest.trend_score).label("max_trend"),
            )
            .where(ProductRequest.created_at >= since)
            .group_by(ProductRequest.description)
            .order_by(func.sum(ProductRequest.count).desc())
            .limit(limit)
        )
        rows = self.session.execute(stmt).all()
        return [
            {
                "description": row.description,
                "total_count": int(row.total_count or 0),
                "max_trend": float(row.max_trend) if row.max_trend is not None else None,
            }
            for row in rows
        ]

    def record_request(
        self,
        *,
        description: str,
        customer_id: str | None = None,
        conversation_id: str | None = None,
        trend_score: float | None = None,
    ) -> ProductRequest:
        request = ProductRequest(
            description=description,
            customer_id=customer_id,
            conversation_id=conversation_id,
            trend_score=trend_score,
        )
        self.session.add(request)
        return request

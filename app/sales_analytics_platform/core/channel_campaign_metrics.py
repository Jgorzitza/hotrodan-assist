from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Tuple

@dataclass
class ChannelCampaignAggregate:
    channel: str
    campaign: str
    revenue: float
    orders: int
    sessions: int
    conversions: int

    @property
    def aov(self) -> float:
        return round(self.revenue / max(self.orders, 1), 2)

    @property
    def conversion_rate(self) -> float:
        numerator = self.conversions if self.conversions > 0 else self.orders
        return round((numerator / max(self.sessions, 1)) * 100.0, 4)

def _normalize_record(record: Dict[str, Any]) -> Tuple[str, str, float, int, int, int]:
    channel = str(record.get("channel") or record.get("source") or record.get("medium") or "unknown").strip().lower()
    campaign = str(record.get("campaign") or record.get("campaign_name") or record.get("utm_campaign") or "(not set)").strip().lower()
    def _to_float(v: Any) -> float:
        try: return float(v)
        except Exception: return 0.0
    def _to_int(v: Any) -> int:
        try: return int(v)
        except Exception: return 0
    revenue = _to_float(record.get("revenue", record.get("value", record.get("amount", 0))))
    orders = _to_int(record.get("orders", record.get("transactions", record.get("purchases", 0))))
    sessions = _to_int(record.get("sessions", record.get("visits", 0)))
    conversions = _to_int(record.get("conversions", record.get("transactions", record.get("purchases", 0))))
    return channel, campaign, revenue, orders, sessions, conversions

def compute_channel_campaign_metrics(records: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    aggregates: Dict[Tuple[str, str], ChannelCampaignAggregate] = {}
    for record in records or []:
        channel, campaign, revenue, orders, sessions, conversions = _normalize_record(record)
        key = (channel, campaign)
        if key not in aggregates:
            aggregates[key] = ChannelCampaignAggregate(channel, campaign, 0.0, 0, 0, 0)
        agg = aggregates[key]
        agg.revenue += revenue
        agg.orders += orders
        agg.sessions += sessions
        agg.conversions += conversions
    results: List[Dict[str, Any]] = [
        {
            "channel": agg.channel,
            "campaign": agg.campaign,
            "revenue": round(agg.revenue, 2),
            "orders": int(agg.orders),
            "sessions": int(agg.sessions),
            "conversions": int(agg.conversions),
            "aov": agg.aov,
            "conversion_rate_pct": agg.conversion_rate,
        }
        for agg in aggregates.values()
    ]
    results.sort(key=lambda r: r["revenue"], reverse=True)
    return results

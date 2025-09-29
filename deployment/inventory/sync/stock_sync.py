"""
Multi-location stock synchronization with conflict resolution.

Conflict resolution rules (in order):
1) Newer timestamp wins
2) If timestamps are equal or missing, higher source priority wins
3) If still tied, prefer the greater inventory quantity to avoid stockouts
"""
from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

@dataclass
class SourcePriority:
    name: str
    priority: int  # higher means more trusted

@dataclass
class LocationStock:
    location_id: str
    available: int
    updated_at: str  # ISO timestamp
    source: str
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class SkuStockState:
    sku: str
    locations: Dict[str, LocationStock] = field(default_factory=dict)

@dataclass
class MergeDecision:
    sku: str
    location_id: str
    before: Optional[LocationStock]
    after: LocationStock
    reason: str

class ConflictResolver:
    def __init__(self, source_priorities: List[SourcePriority]):
        self._priority_by_source: Dict[str, int] = {sp.name: sp.priority for sp in source_priorities}

    def _timestamp(self, ts: Optional[str]) -> Optional[datetime]:
        if not ts:
            return None
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            return None

    def _priority(self, source: Optional[str]) -> int:
        if not source:
            return 0
        return self._priority_by_source.get(source, 0)

    def choose(self, current: Optional[LocationStock], incoming: LocationStock) -> Tuple[LocationStock, str]:
        if current is None:
            return incoming, "no-current"
        ct = self._timestamp(current.updated_at)
        it = self._timestamp(incoming.updated_at)
        if ct and it and it > ct:
            return incoming, "newer-timestamp"
        if ct and it and it < ct:
            return current, "older-timestamp"
        cp = self._priority(current.source)
        ip = self._priority(incoming.source)
        if ip > cp:
            return incoming, "higher-priority-source"
        if ip < cp:
            return current, "lower-priority-source"
        if incoming.available > current.available:
            return incoming, "greater-available-tiebreak"
        if incoming.available < current.available:
            return current, "lesser-available-tiebreak"
        return current, "no-change"

class MultiLocationStockSync:
    def __init__(self, source_priorities: Optional[List[SourcePriority]] = None):
        self.resolver = ConflictResolver(source_priorities or [
            SourcePriority(name="shopify", priority=50),
            SourcePriority(name="pos", priority=60),
            SourcePriority(name="wms", priority=80),
            SourcePriority(name="manual", priority=40),
        ])

    def merge(self, current: Dict[str, SkuStockState], updates: List[Dict[str, Any]]) -> Tuple[Dict[str, SkuStockState], List[MergeDecision]]:
        decisions: List[MergeDecision] = []
        state: Dict[str, SkuStockState] = { sku: SkuStockState(sku=sku, locations=dict(v.locations)) for sku, v in current.items() }
        for upd in updates:
            sku = upd.get("sku", "").strip()
            location_id = upd.get("location_id", "").strip()
            available = int(upd.get("available", 0))
            updated_at = upd.get("updated_at") or datetime.utcnow().isoformat() + "Z"
            source = upd.get("source", "")
            metadata = upd.get("metadata", {}) or {}
            if not sku or not location_id:
                continue
            if sku not in state:
                state[sku] = SkuStockState(sku=sku)
            incoming = LocationStock(
                location_id=location_id,
                available=available,
                updated_at=updated_at,
                source=source,
                metadata=metadata,
            )
            current_loc = state[sku].locations.get(location_id)
            chosen, reason = self.resolver.choose(current_loc, incoming)
            if current_loc is None or chosen is incoming:
                state[sku].locations[location_id] = chosen
                decisions.append(MergeDecision(sku=sku, location_id=location_id, before=current_loc, after=chosen, reason=reason))
            else:
                decisions.append(MergeDecision(sku=sku, location_id=location_id, before=current_loc, after=current_loc, reason=reason))
        return state, decisions

    @staticmethod
    def serialize_state(state: Dict[str, SkuStockState]) -> Dict[str, Any]:
        return {
            sku: {
                "sku": data.sku,
                "locations": { lid: asdict(loc) for lid, loc in data.locations.items() }
            }
            for sku, data in state.items()
        }

    @staticmethod
    def decisions_summary(decisions: List[MergeDecision]) -> Dict[str, int]:
        summary: Dict[str, int] = {}
        for d in decisions:
            summary[d.reason] = summary.get(d.reason, 0) + 1
        return summary

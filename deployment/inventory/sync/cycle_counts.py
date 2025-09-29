"""
Cycle counts workflow integration for inventory management.

Features:
- Scheduled cycle count plans
- Count execution and validation
- Variance analysis and adjustments
- Integration with inventory systems
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum


class CountStatus(Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class VarianceAction(Enum):
    ACCEPT = "accept"
    RECOUNT = "recount"
    INVESTIGATE = "investigate"
    ADJUST = "adjust"


@dataclass
class CycleCountPlan:
    plan_id: str
    location_id: str
    skus: List[str]
    scheduled_date: datetime
    assigned_to: str
    priority: str = "normal"  # low, normal, high
    notes: Optional[str] = None


@dataclass
class CountItem:
    sku: str
    location_id: str
    expected_quantity: int
    counted_quantity: Optional[int] = None
    variance: Optional[int] = None
    variance_percent: Optional[float] = None
    counted_by: Optional[str] = None
    counted_at: Optional[datetime] = None
    notes: Optional[str] = None


@dataclass
class CycleCount:
    count_id: str
    plan_id: str
    status: CountStatus
    items: List[CountItem]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_items: int = 0
    counted_items: int = 0
    variance_threshold: float = 5.0  # 5% variance threshold


class CycleCountManager:
    def __init__(self):
        self.counts: Dict[str, CycleCount] = {}
        self.plans: Dict[str, CycleCountPlan] = {}
    
    def create_plan(self, plan: CycleCountPlan) -> str:
        """Create a new cycle count plan."""
        self.plans[plan.plan_id] = plan
        return plan.plan_id
    
    def start_count(self, plan_id: str, count_id: str) -> CycleCount:
        """Start a cycle count based on a plan."""
        if plan_id not in self.plans:
            raise ValueError(f"Plan {plan_id} not found")
        
        plan = self.plans[plan_id]
        
        # Create count items
        items = []
        for sku in plan.skus:
            # In production, would fetch expected quantity from inventory system
            expected_qty = self._get_expected_quantity(sku, plan.location_id)
            items.append(CountItem(
                sku=sku,
                location_id=plan.location_id,
                expected_quantity=expected_qty
            ))
        
        count = CycleCount(
            count_id=count_id,
            plan_id=plan_id,
            status=CountStatus.IN_PROGRESS,
            items=items,
            started_at=datetime.now(),
            total_items=len(items)
        )
        
        self.counts[count_id] = count
        return count
    
    def record_count(self, count_id: str, sku: str, counted_quantity: int, counted_by: str, notes: Optional[str] = None) -> bool:
        """Record a count for a specific SKU."""
        if count_id not in self.counts:
            return False
        
        count = self.counts[count_id]
        if count.status != CountStatus.IN_PROGRESS:
            return False
        
        # Find the item
        for item in count.items:
            if item.sku == sku:
                item.counted_quantity = counted_quantity
                item.counted_by = counted_by
                item.counted_at = datetime.now()
                item.notes = notes
                
                # Calculate variance
                item.variance = counted_quantity - item.expected_quantity
                if item.expected_quantity > 0:
                    item.variance_percent = (item.variance / item.expected_quantity) * 100
                else:
                    item.variance_percent = 0.0
                
                count.counted_items += 1
                return True
        
        return False
    
    def complete_count(self, count_id: str) -> CycleCount:
        """Complete a cycle count and analyze variances."""
        if count_id not in self.counts:
            raise ValueError(f"Count {count_id} not found")
        
        count = self.counts[count_id]
        count.status = CountStatus.COMPLETED
        count.completed_at = datetime.now()
        
        # Analyze variances
        self._analyze_variances(count)
        
        return count
    
    def _analyze_variances(self, count: CycleCount):
        """Analyze variances and suggest actions."""
        for item in count.items:
            if item.counted_quantity is None:
                continue
            
            abs_variance_percent = abs(item.variance_percent or 0)
            
            if abs_variance_percent <= count.variance_threshold:
                item.notes = (item.notes or "") + f" [Variance within threshold: {abs_variance_percent:.1f}%]"
            elif abs_variance_percent <= count.variance_threshold * 2:
                item.notes = (item.notes or "") + f" [Variance moderate: {abs_variance_percent:.1f}% - Consider recount]"
            else:
                item.notes = (item.notes or "") + f" [Variance high: {abs_variance_percent:.1f}% - Investigate required]"
    
    def get_count_summary(self, count_id: str) -> Dict[str, Any]:
        """Get summary of a completed count."""
        if count_id not in self.counts:
            return {}
        
        count = self.counts[count_id]
        
        if count.status != CountStatus.COMPLETED:
            return {"status": count.status.value, "message": "Count not completed"}
        
        total_variance = sum(item.variance or 0 for item in count.items if item.counted_quantity is not None)
        high_variance_items = [item for item in count.items if item.counted_quantity is not None and abs(item.variance_percent or 0) > count.variance_threshold]
        
        return {
            "count_id": count_id,
            "plan_id": count.plan_id,
            "status": count.status.value,
            "total_items": count.total_items,
            "counted_items": count.counted_items,
            "completion_rate": (count.counted_items / count.total_items * 100) if count.total_items > 0 else 0,
            "total_variance": total_variance,
            "high_variance_items": len(high_variance_items),
            "variance_threshold": count.variance_threshold,
            "started_at": count.started_at.isoformat() if count.started_at else None,
            "completed_at": count.completed_at.isoformat() if count.completed_at else None
        }
    
    def _get_expected_quantity(self, sku: str, location_id: str) -> int:
        """Get expected quantity from inventory system (mock implementation)."""
        # In production, would query actual inventory system
        return 100  # Mock value
    
    def get_pending_counts(self) -> List[CycleCount]:
        """Get all counts in progress."""
        return [count for count in self.counts.values() if count.status == CountStatus.IN_PROGRESS]
    
    def get_overdue_counts(self) -> List[CycleCount]:
        """Get counts that are overdue (started more than 24 hours ago)."""
        cutoff = datetime.now() - timedelta(hours=24)
        return [
            count for count in self.counts.values()
            if count.status == CountStatus.IN_PROGRESS and count.started_at and count.started_at < cutoff
        ]

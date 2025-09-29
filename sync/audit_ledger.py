"""
Audit ledger for inventory adjustments.

Features:
- Track all inventory changes
- Adjustment reasons and approvals
- User activity logging
- Compliance reporting
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class AdjustmentType(Enum):
    RECEIPT = "receipt"
    SHIPMENT = "shipment"
    ADJUSTMENT = "adjustment"
    CYCLE_COUNT = "cycle_count"
    DAMAGE = "damage"
    THEFT = "theft"
    TRANSFER = "transfer"
    RETURN = "return"


class AdjustmentStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"


@dataclass
class AuditEntry:
    entry_id: str
    sku: str
    location_id: str
    adjustment_type: AdjustmentType
    quantity_change: int  # Positive for increases, negative for decreases
    previous_quantity: int
    new_quantity: int
    reason: str
    user_id: str
    timestamp: datetime
    status: AdjustmentStatus = AdjustmentStatus.PENDING
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class AuditLedger:
    def __init__(self):
        self.entries: List[AuditEntry] = []
        self.entry_counter = 0
    
    def create_adjustment(self, sku: str, location_id: str, adjustment_type: AdjustmentType,
                         quantity_change: int, previous_quantity: int, reason: str, user_id: str,
                         reference_number: Optional[str] = None, notes: Optional[str] = None) -> str:
        """Create a new inventory adjustment entry."""
        self.entry_counter += 1
        entry_id = f"ADJ_{self.entry_counter:06d}"
        
        new_quantity = previous_quantity + quantity_change
        
        entry = AuditEntry(
            entry_id=entry_id,
            sku=sku,
            location_id=location_id,
            adjustment_type=adjustment_type,
            quantity_change=quantity_change,
            previous_quantity=previous_quantity,
            new_quantity=new_quantity,
            reason=reason,
            user_id=user_id,
            timestamp=datetime.now(),
            reference_number=reference_number,
            notes=notes
        )
        
        self.entries.append(entry)
        return entry_id
    
    def approve_adjustment(self, entry_id: str, approved_by: str) -> bool:
        """Approve a pending adjustment."""
        for entry in self.entries:
            if entry.entry_id == entry_id and entry.status == AdjustmentStatus.PENDING:
                entry.status = AdjustmentStatus.APPROVED
                entry.approved_by = approved_by
                entry.approved_at = datetime.now()
                return True
        return False
    
    def reject_adjustment(self, entry_id: str, rejected_by: str, reason: str) -> bool:
        """Reject a pending adjustment."""
        for entry in self.entries:
            if entry.entry_id == entry_id and entry.status == AdjustmentStatus.PENDING:
                entry.status = AdjustmentStatus.REJECTED
                entry.approved_by = rejected_by
                entry.approved_at = datetime.now()
                entry.notes = (entry.notes or "") + f" [REJECTED: {reason}]"
                return True
        return False
    
    def complete_adjustment(self, entry_id: str) -> bool:
        """Mark an approved adjustment as completed."""
        for entry in self.entries:
            if entry.entry_id == entry_id and entry.status == AdjustmentStatus.APPROVED:
                entry.status = AdjustmentStatus.COMPLETED
                return True
        return False
    
    def get_entries_by_sku(self, sku: str, location_id: Optional[str] = None) -> List[AuditEntry]:
        """Get all entries for a specific SKU and optionally location."""
        entries = [entry for entry in self.entries if entry.sku == sku]
        if location_id:
            entries = [entry for entry in entries if entry.location_id == location_id]
        return sorted(entries, key=lambda e: e.timestamp, reverse=True)
    
    def get_entries_by_user(self, user_id: str) -> List[AuditEntry]:
        """Get all entries created by a specific user."""
        return [entry for entry in self.entries if entry.user_id == user_id]
    
    def get_pending_approvals(self) -> List[AuditEntry]:
        """Get all pending adjustments requiring approval."""
        return [entry for entry in self.entries if entry.status == AdjustmentStatus.PENDING]
    
    def get_entries_by_type(self, adjustment_type: AdjustmentType) -> List[AuditEntry]:
        """Get all entries of a specific adjustment type."""
        return [entry for entry in self.entries if entry.adjustment_type == adjustment_type]
    
    def get_entries_by_date_range(self, start_date: datetime, end_date: datetime) -> List[AuditEntry]:
        """Get all entries within a date range."""
        return [entry for entry in self.entries if start_date <= entry.timestamp <= end_date]
    
    def get_adjustment_summary(self, sku: str, location_id: str, start_date: Optional[datetime] = None, 
                              end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Get summary of adjustments for a SKU/location."""
        entries = self.get_entries_by_sku(sku, location_id)
        
        if start_date and end_date:
            entries = [entry for entry in entries if start_date <= entry.timestamp <= end_date]
        
        total_increases = sum(entry.quantity_change for entry in entries if entry.quantity_change > 0)
        total_decreases = sum(abs(entry.quantity_change) for entry in entries if entry.quantity_change < 0)
        
        by_type = {}
        for entry in entries:
            adj_type = entry.adjustment_type.value
            if adj_type not in by_type:
                by_type[adj_type] = {"count": 0, "total_change": 0}
            by_type[adj_type]["count"] += 1
            by_type[adj_type]["total_change"] += entry.quantity_change
        
        return {
            "sku": sku,
            "location_id": location_id,
            "total_entries": len(entries),
            "total_increases": total_increases,
            "total_decreases": total_decreases,
            "net_change": total_increases - total_decreases,
            "by_type": by_type,
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None
            }
        }
    
    def get_compliance_report(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Generate compliance report for audit purposes."""
        entries = self.get_entries_by_date_range(start_date, end_date)
        
        total_adjustments = len(entries)
        pending_count = len([e for e in entries if e.status == AdjustmentStatus.PENDING])
        approved_count = len([e for e in entries if e.status == AdjustmentStatus.APPROVED])
        completed_count = len([e for e in entries if e.status == AdjustmentStatus.COMPLETED])
        rejected_count = len([e for e in entries if e.status == AdjustmentStatus.REJECTED])
        
        # Group by user
        by_user = {}
        for entry in entries:
            user = entry.user_id
            if user not in by_user:
                by_user[user] = {"adjustments": 0, "total_value": 0}
            by_user[user]["adjustments"] += 1
            by_user[user]["total_value"] += abs(entry.quantity_change)
        
        return {
            "report_period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "summary": {
                "total_adjustments": total_adjustments,
                "pending": pending_count,
                "approved": approved_count,
                "completed": completed_count,
                "rejected": rejected_count
            },
            "by_user": by_user,
            "compliance_score": (completed_count / total_adjustments * 100) if total_adjustments > 0 else 0
        }

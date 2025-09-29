# Audit Ledger for Inventory Adjustments

This document describes the audit ledger system for tracking all inventory changes.

## Features

### Adjustment Tracking
- All inventory changes logged with full audit trail
- User attribution and timestamps
- Approval workflow for sensitive adjustments
- Reference number linking

### Adjustment Types
- **RECEIPT**: Goods received
- **SHIPMENT**: Goods shipped
- **ADJUSTMENT**: Manual adjustments
- **CYCLE_COUNT**: Cycle count corrections
- **DAMAGE**: Damaged goods write-offs
- **THEFT**: Theft/loss adjustments
- **TRANSFER**: Location transfers
- **RETURN**: Customer returns

### Status Workflow
1. **PENDING**: Awaiting approval
2. **APPROVED**: Approved by manager
3. **COMPLETED**: Adjustment executed
4. **REJECTED**: Rejected with reason

## Usage

### 1. Create Adjustment
```python
from sync.audit_ledger import AuditLedger, AdjustmentType

ledger = AuditLedger()
entry_id = ledger.create_adjustment(
    sku="SKU1",
    location_id="LOC1",
    adjustment_type=AdjustmentType.RECEIPT,
    quantity_change=50,
    previous_quantity=100,
    reason="Received new shipment",
    user_id="USER1",
    reference_number="PO123"
)
```

### 2. Approve Adjustment
```python
ledger.approve_adjustment(entry_id, "MANAGER1")
ledger.complete_adjustment(entry_id)
```

### 3. Query Entries
```python
# Get entries for SKU
entries = ledger.get_entries_by_sku("SKU1", "LOC1")

# Get pending approvals
pending = ledger.get_pending_approvals()

# Get adjustment summary
summary = ledger.get_adjustment_summary("SKU1", "LOC1")
```

### 4. Compliance Reporting
```python
from datetime import datetime, timedelta

start_date = datetime.now() - timedelta(days=30)
end_date = datetime.now()
report = ledger.get_compliance_report(start_date, end_date)
```

## Audit Trail Fields

### AuditEntry
- `entry_id`: Unique identifier
- `sku`, `location_id`: Item and location
- `adjustment_type`: Type of adjustment
- `quantity_change`: Amount changed (+/-)
- `previous_quantity`, `new_quantity`: Before/after quantities
- `reason`: Business reason for adjustment
- `user_id`: Who made the adjustment
- `timestamp`: When adjustment was created
- `status`: Current approval status
- `approved_by`, `approved_at`: Approval details
- `reference_number`: External reference (PO, etc.)
- `notes`: Additional information

## Compliance Features

### Approval Workflow
- All adjustments require approval by default
- Manager can approve/reject with reasons
- Completed adjustments are immutable

### Reporting
- Adjustment summaries by SKU/location
- User activity tracking
- Compliance score calculation
- Date range filtering

## Testing
```bash
. .venv/bin/activate
python -m pytest -q test_audit_ledger.py
```

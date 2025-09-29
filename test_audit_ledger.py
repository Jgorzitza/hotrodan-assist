from datetime import datetime, timedelta
from sync.audit_ledger import AuditLedger, AdjustmentType, AdjustmentStatus

def test_create_adjustment():
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
    
    assert entry_id.startswith("ADJ_")
    assert len(ledger.entries) == 1
    
    entry = ledger.entries[0]
    assert entry.sku == "SKU1"
    assert entry.quantity_change == 50
    assert entry.new_quantity == 150
    assert entry.status == AdjustmentStatus.PENDING

def test_approve_adjustment():
    ledger = AuditLedger()
    entry_id = ledger.create_adjustment(
        sku="SKU1",
        location_id="LOC1",
        adjustment_type=AdjustmentType.ADJUSTMENT,
        quantity_change=-10,
        previous_quantity=100,
        reason="Damaged goods",
        user_id="USER1"
    )
    
    success = ledger.approve_adjustment(entry_id, "MANAGER1")
    assert success == True
    
    entry = ledger.entries[0]
    assert entry.status == AdjustmentStatus.APPROVED
    assert entry.approved_by == "MANAGER1"
    assert entry.approved_at is not None

def test_reject_adjustment():
    ledger = AuditLedger()
    entry_id = ledger.create_adjustment(
        sku="SKU1",
        location_id="LOC1",
        adjustment_type=AdjustmentType.ADJUSTMENT,
        quantity_change=-50,
        previous_quantity=100,
        reason="Suspicious adjustment",
        user_id="USER1"
    )
    
    success = ledger.reject_adjustment(entry_id, "MANAGER1", "Insufficient documentation")
    assert success == True
    
    entry = ledger.entries[0]
    assert entry.status == AdjustmentStatus.REJECTED
    assert "REJECTED: Insufficient documentation" in entry.notes

def test_get_entries_by_sku():
    ledger = AuditLedger()
    
    # Create multiple entries
    ledger.create_adjustment("SKU1", "LOC1", AdjustmentType.RECEIPT, 50, 100, "Shipment 1", "USER1")
    ledger.create_adjustment("SKU1", "LOC1", AdjustmentType.SHIPMENT, -20, 150, "Order 1", "USER1")
    ledger.create_adjustment("SKU2", "LOC1", AdjustmentType.RECEIPT, 30, 0, "Shipment 2", "USER1")
    
    entries = ledger.get_entries_by_sku("SKU1", "LOC1")
    assert len(entries) == 2
    assert all(entry.sku == "SKU1" for entry in entries)

def test_get_adjustment_summary():
    ledger = AuditLedger()
    
    # Create test entries
    ledger.create_adjustment("SKU1", "LOC1", AdjustmentType.RECEIPT, 50, 100, "Shipment", "USER1")
    ledger.create_adjustment("SKU1", "LOC1", AdjustmentType.SHIPMENT, -20, 150, "Order", "USER1")
    ledger.create_adjustment("SKU1", "LOC1", AdjustmentType.ADJUSTMENT, -5, 130, "Damage", "USER1")
    
    summary = ledger.get_adjustment_summary("SKU1", "LOC1")
    assert summary["sku"] == "SKU1"
    assert summary["total_entries"] == 3
    assert summary["total_increases"] == 50
    assert summary["total_decreases"] == 25
    assert summary["net_change"] == 25

def test_get_compliance_report():
    ledger = AuditLedger()
    
    # Create test entries
    entry_id1 = ledger.create_adjustment("SKU1", "LOC1", AdjustmentType.RECEIPT, 50, 100, "Shipment", "USER1")
    entry_id2 = ledger.create_adjustment("SKU1", "LOC1", AdjustmentType.SHIPMENT, -20, 150, "Order", "USER1")
    
    # Approve and complete
    ledger.approve_adjustment(entry_id1, "MANAGER1")
    ledger.complete_adjustment(entry_id1)
    ledger.approve_adjustment(entry_id2, "MANAGER1")
    ledger.complete_adjustment(entry_id2)
    
    start_date = datetime.now() - timedelta(days=1)
    end_date = datetime.now() + timedelta(days=1)
    
    report = ledger.get_compliance_report(start_date, end_date)
    assert report["summary"]["total_adjustments"] == 2
    assert report["summary"]["approved"] == 2
    assert report["summary"]["completed"] == 1
    assert report["compliance_score"] == 50.0  # 1 completed out of 2 total

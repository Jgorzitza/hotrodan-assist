from datetime import datetime, timedelta
from sync.cycle_counts import CycleCountManager, CycleCountPlan, CountStatus, CycleCount

def test_create_plan():
    manager = CycleCountManager()
    plan = CycleCountPlan(
        plan_id="PLAN1",
        location_id="LOC1",
        skus=["SKU1", "SKU2", "SKU3"],
        scheduled_date=datetime.now(),
        assigned_to="USER1"
    )
    
    plan_id = manager.create_plan(plan)
    assert plan_id == "PLAN1"
    assert "PLAN1" in manager.plans

def test_start_count():
    manager = CycleCountManager()
    plan = CycleCountPlan(
        plan_id="PLAN1",
        location_id="LOC1",
        skus=["SKU1", "SKU2"],
        scheduled_date=datetime.now(),
        assigned_to="USER1"
    )
    manager.create_plan(plan)
    
    count = manager.start_count("PLAN1", "COUNT1")
    assert count.count_id == "COUNT1"
    assert count.plan_id == "PLAN1"
    assert count.status == CountStatus.IN_PROGRESS
    assert len(count.items) == 2

def test_record_count():
    manager = CycleCountManager()
    plan = CycleCountPlan(
        plan_id="PLAN1",
        location_id="LOC1",
        skus=["SKU1"],
        scheduled_date=datetime.now(),
        assigned_to="USER1"
    )
    manager.create_plan(plan)
    count = manager.start_count("PLAN1", "COUNT1")
    
    success = manager.record_count("COUNT1", "SKU1", 95, "USER1", "Counted by hand")
    assert success == True
    
    # Check the item was updated
    item = count.items[0]
    assert item.counted_quantity == 95
    assert item.counted_by == "USER1"
    assert item.variance == -5  # 95 - 100
    assert item.variance_percent == -5.0

def test_complete_count():
    manager = CycleCountManager()
    plan = CycleCountPlan(
        plan_id="PLAN1",
        location_id="LOC1",
        skus=["SKU1", "SKU2"],
        scheduled_date=datetime.now(),
        assigned_to="USER1"
    )
    manager.create_plan(plan)
    count = manager.start_count("PLAN1", "COUNT1")
    
    # Record counts
    manager.record_count("COUNT1", "SKU1", 95, "USER1")
    manager.record_count("COUNT1", "SKU2", 105, "USER1")
    
    # Complete count
    completed_count = manager.complete_count("COUNT1")
    assert completed_count.status == CountStatus.COMPLETED
    assert completed_count.completed_at is not None

def test_get_count_summary():
    manager = CycleCountManager()
    plan = CycleCountPlan(
        plan_id="PLAN1",
        location_id="LOC1",
        skus=["SKU1", "SKU2"],
        scheduled_date=datetime.now(),
        assigned_to="USER1"
    )
    manager.create_plan(plan)
    count = manager.start_count("PLAN1", "COUNT1")
    
    # Record counts
    manager.record_count("COUNT1", "SKU1", 95, "USER1")
    manager.record_count("COUNT1", "SKU2", 105, "USER1")
    
    # Complete count
    manager.complete_count("COUNT1")
    
    # Get summary
    summary = manager.get_count_summary("COUNT1")
    assert summary["status"] == "completed"
    assert summary["total_items"] == 2
    assert summary["counted_items"] == 2
    assert summary["completion_rate"] == 100.0
    assert summary["total_variance"] == 0  # 95-100 + 105-100 = 0

# Cycle Counts Workflow Integration

This document describes the cycle counting system for inventory accuracy management.

## Features

### Count Planning
- Scheduled cycle count plans by location
- SKU selection and assignment
- Priority and deadline management

### Count Execution
- Real-time count recording
- Variance calculation and analysis
- Progress tracking

### Variance Analysis
- Configurable variance thresholds (default: 5%)
- Automatic action recommendations
- High variance item identification

## Workflow

### 1. Create Plan
```python
from sync.cycle_counts import CycleCountManager, CycleCountPlan

manager = CycleCountManager()
plan = CycleCountPlan(
    plan_id="PLAN1",
    location_id="LOC1",
    skus=["SKU1", "SKU2", "SKU3"],
    scheduled_date=datetime.now(),
    assigned_to="USER1",
    priority="high"
)
manager.create_plan(plan)
```

### 2. Start Count
```python
count = manager.start_count("PLAN1", "COUNT1")
```

### 3. Record Counts
```python
manager.record_count("COUNT1", "SKU1", 95, "USER1", "Counted by hand")
```

### 4. Complete Count
```python
completed_count = manager.complete_count("COUNT1")
summary = manager.get_count_summary("COUNT1")
```

## Variance Analysis

### Thresholds
- **Within threshold**: ≤ 5% variance (default)
- **Moderate**: 5-10% variance (consider recount)
- **High**: > 10% variance (investigate required)

### Actions
- Accept: Variance within acceptable range
- Recount: Moderate variance, verify count
- Investigate: High variance, root cause analysis
- Adjust: Update system after investigation

## Status Tracking
- **Planned**: Count scheduled
- **In Progress**: Count started, items being counted
- **Completed**: Count finished, variances analyzed
- **Cancelled**: Count cancelled

## Testing
```bash
. .venv/bin/activate
python -m pytest -q test_cycle_counts.py
```

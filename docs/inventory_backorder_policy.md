# Backorder Policy Rules + ETA Surfacing

This document describes the backorder policy system and ETA calculation for inventory management.

## Backorder Policies

### 1. ALLOW
- Allows backorders within max_backorder_days
- Calculates ETA based on supplier lead time + buffer
- Sends customer communication with delivery estimate

### 2. DENY
- Rejects all backorder requests
- Provides standard rejection message

### 3. PARTIAL
- Allows partial fulfillment within max_backorder_days
- May fulfill some quantity immediately, rest on backorder

## ETA Calculation

### Base Formula
```
ETA = current_date + (supplier_lead_time + buffer_days) * priority_multiplier
```

### Priority Multipliers
- Low: 1.2x (slower)
- Normal: 1.0x (standard)
- High: 0.8x (faster)
- Urgent: 0.6x (fastest)

### Confidence Levels
- **High**: ETA ≤ auto_approve_threshold days
- **Medium**: ETA ≤ max_backorder_days
- **Low**: ETA > max_backorder_days

## Usage
```python
from sync.backorder_policy import BackorderConfig, BackorderRequest, BackorderPolicy, evaluate_backorder_request

# Configure backorder policy
config = BackorderConfig(
    sku="SKU1",
    location_id="LOC1",
    policy=BackorderPolicy.ALLOW,
    max_backorder_days=30,
    supplier_lead_time_days=14,
    buffer_days=3
)

# Create backorder request
request = BackorderRequest(
    sku="SKU1",
    location_id="LOC1",
    requested_quantity=10,
    customer_id="CUST1",
    priority="high"
)

# Evaluate request
result = evaluate_backorder_request(config, request)
```

## Customer Communication
Automatically generates customer messages with:
- Approval/rejection status
- ETA information
- Confidence level
- Supplier details
- Tracking information (if available)

## Testing
```bash
. .venv/bin/activate
python -m pytest -q test_backorder_policy.py
```

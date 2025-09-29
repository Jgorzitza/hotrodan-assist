# Purchase Order Recommendations Generator

This document describes the purchase order recommendation system for inventory management.

## Methods

### 1. Economic Order Quantity (EOQ)
Optimal order quantity balancing ordering and holding costs.
- Formula: `EOQ = √(2 * demand_rate * ordering_cost / holding_cost_per_unit)`
- Where: `holding_cost_per_unit = unit_cost * holding_cost_rate`

### 2. Reorder Point Calculation
When to place a new order.
- Formula: `Reorder Point = demand_rate * lead_time + safety_stock`

### 3. Urgency Classification
- **Critical**: Current stock ≤ safety stock
- **High**: Current stock ≤ reorder point
- **Medium**: Current stock ≤ 1.2 * reorder point
- **Low**: Current stock > 1.2 * reorder point

## Usage
```python
from sync.purchase_orders import calculate_eoq, calculate_reorder_point, generate_purchase_recommendations

# Calculate EOQ
eoq = calculate_eoq(demand_rate=100, ordering_cost=50, holding_cost_rate=0.2, unit_cost=10)

# Calculate reorder point
rp = calculate_reorder_point(demand_rate=10, lead_time=5, safety_stock=20)

# Generate recommendations
sku_data = [
    {'sku': 'SKU1', 'location_id': 'LOC1', 'demand_rate': 10, 'lead_time': 5}
]
current_stock = {'SKU1_LOC1': 5}
safety_stock = {'SKU1_LOC1': 10}
costs = {'SKU1_LOC1': {'unit_cost': 10, 'ordering_cost': 50, 'holding_cost_rate': 0.2}}

recommendations = generate_purchase_recommendations(sku_data, current_stock, safety_stock, costs)
```

## Output
Returns `PurchaseOrderRecommendation` objects with:
- `sku`, `location_id`: Identifiers
- `recommended_quantity`: EOQ-based recommendation
- `reorder_point`: When to reorder
- `current_stock`: Current inventory level
- `urgency`: Critical/High/Medium/Low
- `reasoning`: Human-readable explanation
- `estimated_cost`: Total cost of recommendation

## Testing
```bash
. .venv/bin/activate
python -m pytest -q test_purchase_orders.py
```

# Safety Stock Rules per SKU/Location

This document describes the safety stock calculation methods available for inventory management.

## Methods

### 1. Z-Score Service Level (z_service_level)
Standard approach using demand standard deviation and lead time.
- Formula: `Safety Stock = Z * σ_demand * √(lead_time)`
- Includes optional lead time variability: `√((avg_LT * σ_d²) + (avg_d² * σ_LT²))`

### 2. Fixed Minimum (fixed_minimum)
Simple constant floor per SKU/location.
- Formula: `Safety Stock = max(0, min_qty)`

### 3. MAD Service Level (mad_service_level)
Robust alternative using Mean Absolute Deviation.
- Formula: `Safety Stock = Z * (1.253 * MAD) * √(lead_time)`

## Usage
```python
from sync.safety_stock import DemandSeries, z_service_level, fixed_minimum, mad_service_level

# Z-score method
demand = DemandSeries([10, 12, 11, 9, 13, 10, 12])
ss = z_service_level(demand, lead_time_periods=2, service_level=0.95)

# Fixed minimum
ss = fixed_minimum(10)

# MAD method
ss = mad_service_level(demand, lead_time_periods=4, service_level=0.95)
```

## Service Levels
- 90%: Z = 1.2816
- 95%: Z = 1.6449 (default)
- 97%: Z = 1.8808
- 98%: Z = 2.0537
- 99%: Z = 2.3263

## Testing
```bash
. .venv/bin/activate
python -m pytest -q test_safety_stock.py
```

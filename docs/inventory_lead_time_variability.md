# Replenishment Lead Time Variability Model

This document describes the lead time variability analysis system for inventory planning.

## Features

### Lead Time Tracking
- Historical lead time data collection
- Supplier performance monitoring
- On-time delivery tracking

### Variability Analysis
- Statistical analysis of lead time distributions
- Coefficient of variation calculation
- Confidence interval estimation

### Safety Stock Adjustments
- Variability-based safety stock multipliers
- Adjusted lead time calculations
- Service level optimization

## Usage

### 1. Add Lead Time Records
```python
from sync.lead_time_variability import LeadTimeVariabilityModel, LeadTimeRecord

model = LeadTimeVariabilityModel()
record = LeadTimeRecord(
    supplier_id="SUPPLIER1",
    sku="SKU1",
    order_date=datetime.now() - timedelta(days=10),
    delivery_date=datetime.now() - timedelta(days=5),
    lead_time_days=5,
    quantity=100,
    on_time=True
)
model.add_lead_time_record(record)
```

### 2. Get Lead Time Statistics
```python
stats = model.get_lead_time_stats("SUPPLIER1", "SKU1")
print(f"Mean lead time: {stats.mean_lead_time}")
print(f"Standard deviation: {stats.std_deviation}")
print(f"On-time percentage: {stats.on_time_percentage}%")
```

### 3. Calculate Safety Stock Adjustments
```python
adjustment = model.calculate_safety_stock_adjustment("SUPPLIER1", "SKU1", base_lead_time=5)
print(f"Adjusted lead time: {adjustment['adjusted_lead_time']}")
print(f"Safety stock multiplier: {adjustment['safety_stock_multiplier']}")
```

### 4. Predict Future Lead Times
```python
prediction = model.predict_lead_time("SUPPLIER1", "SKU1", confidence_level=0.95)
print(f"Predicted lead time: {prediction['predicted_lead_time']} days")
print(f"Confidence interval: {prediction['confidence_interval']}")
```

## Statistical Measures

### Lead Time Statistics
- **Mean Lead Time**: Average delivery time
- **Standard Deviation**: Measure of variability
- **Coefficient of Variation**: Relative variability (std/mean)
- **On-Time Percentage**: Percentage of deliveries within expected time

### Safety Stock Multipliers
- **Low Variability** (< 10%): 1.0x multiplier
- **Moderate Variability** (10-30%): 1.2x multiplier
- **High Variability** (30-50%): 1.5x multiplier
- **Very High Variability** (> 50%): 2.0x multiplier

### Supplier Performance Scoring
- **On-Time Performance**: 40% weight
- **Lead Time Consistency**: 30% weight
- **Average Lead Time**: 30% weight

## Supplier Rankings

The system ranks suppliers based on:
1. On-time delivery percentage
2. Lead time consistency (low standard deviation)
3. Average lead time speed
4. Total order volume

## Prediction Quality

- **High**: 20+ historical records
- **Medium**: 10-19 historical records
- **Low**: < 10 historical records

## Testing
```bash
. .venv/bin/activate
python -m pytest -q test_lead_time_variability.py
```

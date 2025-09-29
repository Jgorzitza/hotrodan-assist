# Demand Forecasting with Seasonality

This document describes the demand forecasting methods available for inventory planning.

## Methods

### 1. Simple Moving Average
Basic average of recent periods.
- Good for: Stable demand patterns
- Parameters: `periods` (lookback window)

### 2. Exponential Smoothing
Weighted average with exponential decay.
- Good for: Trending data without seasonality
- Parameters: `alpha` (smoothing factor, 0-1)

### 3. Seasonal Adjustment
Multiplicative seasonal model.
- Good for: Data with clear seasonal patterns
- Parameters: `season_length` (e.g., 12 for monthly)

### 4. Holt-Winters Triple Exponential Smoothing
Advanced method with level, trend, and seasonality.
- Good for: Complex seasonal patterns with trends
- Parameters: `alpha`, `beta`, `gamma`, `season_length`

## Usage
```python
from sync.demand_forecast import simple_moving_average, exponential_smoothing, seasonal_adjustment, holt_winters

# Simple moving average
result = simple_moving_average(history, periods=3, forecast_horizon=12)

# Exponential smoothing
result = exponential_smoothing(history, alpha=0.3, forecast_horizon=12)

# Seasonal adjustment
result = seasonal_adjustment(history, season_length=12, forecast_horizon=12)

# Holt-Winters
result = holt_winters(history, season_length=12, forecast_horizon=12)
```

## Output
All methods return `ForecastResult` with:
- `periods`: List of forecast periods (1, 2, 3, ...)
- `values`: List of forecasted values
- `method`: Method name used
- `confidence_interval`: Optional confidence bounds

## Testing
```bash
. .venv/bin/activate
python -m pytest -q test_demand_forecast.py
```

"""
Demand forecasting with seasonality support.

Methods:
- Simple moving average
- Exponential smoothing (Holt-Winters for seasonality)
- Linear trend with seasonal adjustment
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Tuple
import math


@dataclass
class ForecastResult:
    periods: List[int]  # 1, 2, 3, ...
    values: List[float]
    method: str
    confidence_interval: Optional[Tuple[float, float]] = None


def simple_moving_average(history: List[float], periods: int, forecast_horizon: int = 12) -> ForecastResult:
    """Simple moving average forecast."""
    if not history or periods <= 0:
        return ForecastResult(periods=[], values=[], method="simple_moving_average")
    
    window = min(periods, len(history))
    avg = sum(history[-window:]) / window
    
    forecast_periods = list(range(1, forecast_horizon + 1))
    forecast_values = [avg] * forecast_horizon
    
    return ForecastResult(
        periods=forecast_periods,
        values=forecast_values,
        method="simple_moving_average"
    )


def exponential_smoothing(history: List[float], alpha: float = 0.3, forecast_horizon: int = 12) -> ForecastResult:
    """Exponential smoothing forecast."""
    if not history:
        return ForecastResult(periods=[], values=[], method="exponential_smoothing")
    
    # Initialize with first value
    forecast = history[0]
    
    # Apply exponential smoothing
    for value in history[1:]:
        forecast = alpha * value + (1 - alpha) * forecast
    
    forecast_periods = list(range(1, forecast_horizon + 1))
    forecast_values = [forecast] * forecast_horizon
    
    return ForecastResult(
        periods=forecast_periods,
        values=forecast_values,
        method="exponential_smoothing"
    )


def seasonal_adjustment(history: List[float], season_length: int = 12, forecast_horizon: int = 12) -> ForecastResult:
    """Seasonal adjustment using multiplicative model."""
    if len(history) < season_length * 2:
        # Fallback to simple average if insufficient data
        return simple_moving_average(history, len(history), forecast_horizon)
    
    # Calculate seasonal indices
    seasonal_indices = [0.0] * season_length
    for i in range(season_length):
        seasonal_values = []
        for j in range(i, len(history), season_length):
            seasonal_values.append(history[j])
        
        if seasonal_values:
            # Calculate average for this season
            seasonal_indices[i] = sum(seasonal_values) / len(seasonal_values)
    
    # Calculate overall average
    overall_avg = sum(history) / len(history)
    
    # Normalize seasonal indices
    if overall_avg > 0:
        seasonal_indices = [idx / overall_avg for idx in seasonal_indices]
    
    # Generate forecast
    forecast_periods = list(range(1, forecast_horizon + 1))
    forecast_values = []
    
    for period in forecast_periods:
        # Use recent trend (last season_length values)
        recent_avg = sum(history[-season_length:]) / season_length if len(history) >= season_length else sum(history) / len(history)
        
        # Apply seasonal adjustment
        seasonal_idx = seasonal_indices[(period - 1) % season_length]
        forecast_value = recent_avg * seasonal_idx
        forecast_values.append(forecast_value)
    
    return ForecastResult(
        periods=forecast_periods,
        values=forecast_values,
        method="seasonal_adjustment"
    )


def holt_winters(history: List[float], alpha: float = 0.3, beta: float = 0.1, gamma: float = 0.1, 
                season_length: int = 12, forecast_horizon: int = 12) -> ForecastResult:
    """Holt-Winters triple exponential smoothing."""
    if len(history) < season_length * 2:
        return seasonal_adjustment(history, season_length, forecast_horizon)
    
    n = len(history)
    
    # Initialize level, trend, and seasonal components
    level = [0.0] * n
    trend = [0.0] * n
    seasonal = [1.0] * n
    
    # Initial seasonal indices
    for i in range(season_length):
        seasonal_values = []
        for j in range(i, n, season_length):
            if j < n:
                seasonal_values.append(history[j])
        
        if seasonal_values:
            avg = sum(seasonal_values) / len(seasonal_values)
            overall_avg = sum(history) / len(history)
            if overall_avg > 0:
                seasonal[i] = avg / overall_avg
    
    # Initialize level and trend
    level[0] = history[0] / seasonal[0] if seasonal[0] > 0 else history[0]
    
    # Apply Holt-Winters smoothing
    for t in range(1, n):
        if t < season_length:
            level[t] = alpha * (history[t] / seasonal[t]) + (1 - alpha) * level[t-1]
            trend[t] = beta * (level[t] - level[t-1]) + (1 - beta) * trend[t-1]
        else:
            level[t] = alpha * (history[t] / seasonal[t - season_length]) + (1 - alpha) * (level[t-1] + trend[t-1])
            trend[t] = beta * (level[t] - level[t-1]) + (1 - beta) * trend[t-1]
            seasonal[t] = gamma * (history[t] / level[t]) + (1 - gamma) * seasonal[t - season_length]
    
    # Generate forecast
    forecast_periods = list(range(1, forecast_horizon + 1))
    forecast_values = []
    
    for h in forecast_periods:
        level_idx = n - 1
        trend_idx = n - 1
        seasonal_idx = (n - 1 + h - 1) % season_length
        
        forecast_value = (level[level_idx] + h * trend[trend_idx]) * seasonal[seasonal_idx]
        forecast_values.append(max(0, forecast_value))  # Ensure non-negative
    
    return ForecastResult(
        periods=forecast_periods,
        values=forecast_values,
        method="holt_winters"
    )

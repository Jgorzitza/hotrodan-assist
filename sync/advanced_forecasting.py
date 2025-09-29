"""
Advanced demand forecasting engine with multiple algorithms.

Provides sophisticated demand forecasting using various statistical
and machine learning approaches.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import statistics
import math
from collections import defaultdict
import random

@dataclass
class ForecastResult:
    """Forecast result with confidence intervals."""
    sku: str
    forecast_period: str
    forecast_values: List[float]
    confidence_intervals: List[Tuple[float, float]]
    accuracy_metrics: Dict[str, float]
    model_used: str
    seasonality_detected: bool
    trend_detected: bool
    confidence_score: float

@dataclass
class ForecastAccuracy:
    """Forecast accuracy metrics."""
    mae: float  # Mean Absolute Error
    mape: float  # Mean Absolute Percentage Error
    rmse: float  # Root Mean Square Error
    bias: float  # Forecast bias
    tracking_signal: float  # Tracking signal

class AdvancedForecastingEngine:
    def __init__(self):
        self.historical_data: Dict[str, List[Dict]] = defaultdict(list)
        self.models: Dict[str, Any] = {}
        self.accuracy_history: Dict[str, List[float]] = defaultdict(list)
    
    def add_demand_data(self, sku: str, date: datetime, demand: float, 
                       additional_features: Optional[Dict[str, float]] = None):
        """Add demand data point with optional features."""
        data_point = {
            "date": date,
            "demand": demand,
            "features": additional_features or {}
        }
        self.historical_data[sku].append(data_point)
        self.historical_data[sku].sort(key=lambda x: x["date"])
    
    def simple_moving_average(self, sku: str, periods: int = 12) -> List[float]:
        """Simple moving average forecast."""
        if sku not in self.historical_data or len(self.historical_data[sku]) < periods:
            return []
        
        data = [d["demand"] for d in self.historical_data[sku]]
        forecasts = []
        
        for i in range(periods, len(data)):
            window = data[i-periods:i]
            forecast = statistics.mean(window)
            forecasts.append(forecast)
        
        return forecasts
    
    def exponential_smoothing(self, sku: str, alpha: float = 0.3, 
                            periods: int = 12) -> List[float]:
        """Exponential smoothing forecast."""
        if sku not in self.historical_data or len(self.historical_data[sku]) < 2:
            return []
        
        data = [d["demand"] for d in self.historical_data[sku]]
        forecasts = []
        
        # Initialize with first value
        forecast = data[0]
        forecasts.append(forecast)
        
        for i in range(1, len(data)):
            forecast = alpha * data[i] + (1 - alpha) * forecast
            forecasts.append(forecast)
        
        return forecasts
    
    def holt_winters(self, sku: str, alpha: float = 0.3, beta: float = 0.1, 
                    gamma: float = 0.1, periods: int = 12, season_length: int = 12) -> List[float]:
        """Holt-Winters triple exponential smoothing."""
        if sku not in self.historical_data or len(self.historical_data[sku]) < season_length * 2:
            return []
        
        data = [d["demand"] for d in self.historical_data[sku]]
        n = len(data)
        
        # Initialize components
        level = data[0]
        trend = (data[season_length] - data[0]) / season_length
        seasonals = [data[i] / level for i in range(season_length)]
        
        forecasts = []
        
        for i in range(n):
            if i < season_length:
                forecast = data[i]
            else:
                # Update components
                prev_level = level
                level = alpha * (data[i] / seasonals[i % season_length]) + (1 - alpha) * (level + trend)
                trend = beta * (level - prev_level) + (1 - beta) * trend
                seasonals[i % season_length] = gamma * (data[i] / level) + (1 - gamma) * seasonals[i % season_length]
                
                # Generate forecast
                forecast = (level + trend) * seasonals[i % season_length]
            
            forecasts.append(forecast)
        
        return forecasts
    
    def arima_like(self, sku: str, p: int = 1, d: int = 1, q: int = 1, 
                  periods: int = 12) -> List[float]:
        """Simplified ARIMA-like model."""
        if sku not in self.historical_data or len(self.historical_data[sku]) < max(p, d, q) + 10:
            return []
        
        data = [d["demand"] for d in self.historical_data[sku]]
        n = len(data)
        
        # Differencing
        diff_data = data.copy()
        for _ in range(d):
            diff_data = [diff_data[i] - diff_data[i-1] for i in range(1, len(diff_data))]
        
        if len(diff_data) < max(p, q) + 1:
            return []
        
        # Simple ARIMA implementation
        forecasts = []
        
        for i in range(max(p, q), len(diff_data)):
            # AR component
            ar_component = 0
            for j in range(1, min(p + 1, i + 1)):
                ar_component += 0.1 * diff_data[i - j]  # Simplified coefficients
            
            # MA component
            ma_component = 0
            for j in range(1, min(q + 1, i + 1)):
                ma_component += 0.1 * (diff_data[i - j] - (forecasts[i - j - 1] if i - j - 1 < len(forecasts) else 0))
            
            forecast = ar_component + ma_component
            forecasts.append(forecast)
        
        # Reverse differencing
        if d > 0:
            for _ in range(d):
                forecasts = [data[0]] + [forecasts[i] + forecasts[i-1] for i in range(len(forecasts))]
        
        return forecasts
    
    def detect_seasonality(self, sku: str, season_length: int = 12) -> bool:
        """Detect if data has seasonal patterns."""
        if sku not in self.historical_data or len(self.historical_data[sku]) < season_length * 2:
            return False
        
        data = [d["demand"] for d in self.historical_data[sku]]
        
        # Calculate seasonal indices
        seasonal_indices = []
        for i in range(season_length):
            seasonal_values = [data[j] for j in range(i, len(data), season_length)]
            if len(seasonal_values) > 1:
                avg_value = statistics.mean(seasonal_values)
                seasonal_indices.append(avg_value)
        
        if len(seasonal_indices) < 2:
            return False
        
        # Check for significant variation
        overall_avg = statistics.mean(seasonal_indices)
        variation = statistics.stdev(seasonal_indices) / overall_avg if overall_avg > 0 else 0
        
        return variation > 0.2  # 20% variation threshold
    
    def detect_trend(self, sku: str) -> str:
        """Detect trend direction in data."""
        if sku not in self.historical_data or len(self.historical_data[sku]) < 3:
            return "unknown"
        
        data = [d["demand"] for d in self.historical_data[sku]]
        
        # Simple linear regression
        n = len(data)
        x_values = list(range(n))
        
        sum_x = sum(x_values)
        sum_y = sum(data)
        sum_xy = sum(x * y for x, y in zip(x_values, data))
        sum_x2 = sum(x * x for x in x_values)
        
        if n * sum_x2 - sum_x * sum_x == 0:
            return "stable"
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        
        if slope > 0.1:
            return "increasing"
        elif slope < -0.1:
            return "decreasing"
        else:
            return "stable"
    
    def calculate_accuracy_metrics(self, sku: str, actual: List[float], 
                                 forecast: List[float]) -> ForecastAccuracy:
        """Calculate forecast accuracy metrics."""
        if len(actual) != len(forecast) or len(actual) == 0:
            return ForecastAccuracy(0, 0, 0, 0, 0)
        
        # Mean Absolute Error
        mae = statistics.mean(abs(a - f) for a, f in zip(actual, forecast))
        
        # Mean Absolute Percentage Error
        mape = statistics.mean(abs(a - f) / a * 100 for a, f in zip(actual, forecast) if a != 0)
        
        # Root Mean Square Error
        rmse = math.sqrt(statistics.mean((a - f) ** 2 for a, f in zip(actual, forecast)))
        
        # Bias
        bias = statistics.mean(f - a for a, f in zip(actual, forecast))
        
        # Tracking Signal
        errors = [f - a for a, f in zip(actual, forecast)]
        mad = statistics.mean(abs(e) for e in errors)
        tracking_signal = sum(errors) / mad if mad != 0 else 0
        
        return ForecastAccuracy(mae, mape, rmse, bias, tracking_signal)
    
    def generate_forecast(self, sku: str, periods: int = 12, 
                         confidence_level: float = 0.95) -> ForecastResult:
        """Generate comprehensive forecast for a SKU."""
        if sku not in self.historical_data or len(self.historical_data[sku]) < 12:
            return ForecastResult(sku, f"{periods} periods", [], [], {}, "insufficient_data", 
                                False, False, 0.0)
        
        data = [d["demand"] for d in self.historical_data[sku]]
        
        # Detect patterns
        seasonality = self.detect_seasonality(sku)
        trend = self.detect_trend(sku)
        
        # Choose best model based on data characteristics
        if seasonality and len(data) >= 24:
            model_name = "holt_winters"
            forecasts = self.holt_winters(sku, periods=periods)
        elif trend != "stable":
            model_name = "exponential_smoothing"
            forecasts = self.exponential_smoothing(sku, periods=periods)
        else:
            model_name = "moving_average"
            forecasts = self.simple_moving_average(sku, periods=periods)
        
        # Calculate confidence intervals
        if len(forecasts) > 0:
            forecast_std = statistics.stdev(forecasts) if len(forecasts) > 1 else forecasts[0] * 0.1
            z_score = 1.96 if confidence_level == 0.95 else 2.58  # 95% or 99%
            
            confidence_intervals = [
                (f - z_score * forecast_std, f + z_score * forecast_std)
                for f in forecasts
            ]
        else:
            confidence_intervals = []
        
        # Calculate accuracy metrics (using last part of data for validation)
        if len(data) > periods:
            actual = data[-periods:]
            forecast_for_accuracy = forecasts[-periods:] if len(forecasts) >= periods else forecasts
            accuracy = self.calculate_accuracy_metrics(sku, actual, forecast_for_accuracy)
            accuracy_metrics = {
                "mae": accuracy.mae,
                "mape": accuracy.mape,
                "rmse": accuracy.rmse,
                "bias": accuracy.bias,
                "tracking_signal": accuracy.tracking_signal
            }
        else:
            accuracy_metrics = {}
        
        # Calculate confidence score
        confidence_score = 0.8  # Base confidence
        if seasonality:
            confidence_score += 0.1
        if trend != "stable":
            confidence_score += 0.05
        if len(data) > 24:
            confidence_score += 0.05
        
        confidence_score = min(1.0, confidence_score)
        
        return ForecastResult(
            sku=sku,
            forecast_period=f"{periods} periods",
            forecast_values=forecasts,
            confidence_intervals=confidence_intervals,
            accuracy_metrics=accuracy_metrics,
            model_used=model_name,
            seasonality_detected=seasonality,
            trend_detected=trend != "stable",
            confidence_score=confidence_score
        )
    
    def generate_multi_sku_forecast(self, skus: List[str], periods: int = 12) -> Dict[str, ForecastResult]:
        """Generate forecasts for multiple SKUs."""
        results = {}
        
        for sku in skus:
            results[sku] = self.generate_forecast(sku, periods)
        
        return results
    
    def optimize_forecast_parameters(self, sku: str) -> Dict[str, float]:
        """Optimize forecast parameters for a SKU."""
        if sku not in self.historical_data or len(self.historical_data[sku]) < 24:
            return {"alpha": 0.3, "beta": 0.1, "gamma": 0.1}
        
        data = [d["demand"] for d in self.historical_data[sku]]
        
        # Split data for validation
        train_size = int(len(data) * 0.8)
        train_data = data[:train_size]
        test_data = data[train_size:]
        
        best_params = {"alpha": 0.3, "beta": 0.1, "gamma": 0.1}
        best_mape = float('inf')
        
        # Grid search for optimal parameters
        for alpha in [0.1, 0.2, 0.3, 0.4, 0.5]:
            for beta in [0.05, 0.1, 0.15, 0.2]:
                for gamma in [0.05, 0.1, 0.15, 0.2]:
                    # Generate forecast with these parameters
                    forecasts = self.holt_winters(sku, alpha, beta, gamma, len(test_data))
                    
                    if len(forecasts) == len(test_data):
                        accuracy = self.calculate_accuracy_metrics(sku, test_data, forecasts)
                        if accuracy.mape < best_mape:
                            best_mape = accuracy.mape
                            best_params = {"alpha": alpha, "beta": beta, "gamma": gamma}
        
        return best_params

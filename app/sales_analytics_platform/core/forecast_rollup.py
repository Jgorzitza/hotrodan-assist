"""
Forecast Rollup Module

This module provides functions to compute forecast rollups with confidence intervals
for sales analytics.
"""

from typing import Dict, List, Any
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


def compute_forecast_rollup(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute forecast rollup with confidence intervals.
    
    Args:
        data: Dictionary containing:
            - 'historical_data': List of historical sales data
            - 'forecast_periods': Number of periods to forecast
            - 'confidence_level': Confidence level for intervals (default 0.95)
            
    Returns:
        Dictionary containing forecast results
    """
    try:
        # Extract data
        historical_data = data.get('historical_data', [])
        forecast_periods = data.get('forecast_periods', 12)
        confidence_level = data.get('confidence_level', 0.95)
        
        if not historical_data:
            return {
                'error': 'No historical data provided',
                'forecast': {}
            }
        
        # Convert to DataFrame
        df = pd.DataFrame(historical_data)
        
        # Ensure we have date and value columns
        if 'date' not in df.columns or 'value' not in df.columns:
            return {
                'error': 'Historical data must contain date and value columns',
                'forecast': {}
            }
        
        # Convert date column to datetime
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # Calculate forecast
        forecast = _calculate_forecast(df, forecast_periods, confidence_level)
        
        return {
            'success': True,
            'forecast': forecast
        }
        
    except Exception as e:
        return {
            'error': f'Forecast calculation failed: {str(e)}',
            'forecast': {}
        }


def _calculate_forecast(df: pd.DataFrame, periods: int, confidence_level: float) -> Dict[str, Any]:
    """Calculate forecast with confidence intervals."""
    # Simple linear trend forecast (in production, would use more sophisticated models)
    values = df['value'].values
    dates = df['date'].values
    
    # Calculate trend
    x = np.arange(len(values))
    trend = np.polyfit(x, values, 1)[0]
    intercept = np.polyfit(x, values, 1)[1]
    
    # Generate forecast dates
    last_date = df['date'].max()
    forecast_dates = [last_date + timedelta(days=30*i) for i in range(1, periods + 1)]
    
    # Calculate forecast values
    forecast_values = []
    for i in range(periods):
        future_x = len(values) + i
        forecast_value = intercept + trend * future_x
        forecast_values.append(forecast_value)
    
    # Calculate confidence intervals
    residuals = values - (intercept + trend * x)
    std_error = np.std(residuals)
    
    # Z-score for confidence level
    z_score = 1.96 if confidence_level == 0.95 else 2.576  # 95% or 99%
    
    confidence_intervals = []
    for i, forecast_value in enumerate(forecast_values):
        margin_of_error = z_score * std_error * np.sqrt(1 + 1/len(values) + (len(values) + i)**2 / np.sum((x - np.mean(x))**2))
        confidence_intervals.append({
            'lower': forecast_value - margin_of_error,
            'upper': forecast_value + margin_of_error
        })
    
    # Format results
    forecast_data = []
    for i, (date, value, ci) in enumerate(zip(forecast_dates, forecast_values, confidence_intervals)):
        forecast_data.append({
            'period': i + 1,
            'date': date.isoformat(),
            'forecast_value': round(value, 2),
            'confidence_interval': ci,
            'confidence_level': confidence_level
        })
    
    return {
        'forecast_data': forecast_data,
        'summary': {
            'total_periods': periods,
            'trend': round(trend, 4),
            'confidence_level': confidence_level,
            'last_historical_value': float(values[-1]),
            'first_forecast_value': round(forecast_values[0], 2)
        }
    }

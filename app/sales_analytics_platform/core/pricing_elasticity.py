"""
Pricing Elasticity Module

This module provides functions to compute pricing elasticity estimation
for sales analytics.
"""

from typing import Dict, List, Any
import pandas as pd
import numpy as np


def compute_pricing_elasticity(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute pricing elasticity estimation.
    
    Args:
        data: Dictionary containing:
            - 'price_data': List of price and quantity data
            - 'product_id': Product identifier
            - 'time_period': Time period for analysis
            
    Returns:
        Dictionary containing elasticity analysis results
    """
    try:
        # Extract data
        price_data = data.get('price_data', [])
        product_id = data.get('product_id', 'unknown')
        time_period = data.get('time_period', 'monthly')
        
        if not price_data:
            return {
                'error': 'No price data provided',
                'elasticity': {}
            }
        
        # Convert to DataFrame
        df = pd.DataFrame(price_data)
        
        # Ensure we have required columns
        required_cols = ['price', 'quantity', 'date']
        if not all(col in df.columns for col in required_cols):
            return {
                'error': f'Price data must contain columns: {required_cols}',
                'elasticity': {}
            }
        
        # Calculate elasticity
        elasticity = _calculate_elasticity(df, product_id, time_period)
        
        return {
            'success': True,
            'elasticity': elasticity
        }
        
    except Exception as e:
        return {
            'error': f'Elasticity calculation failed: {str(e)}',
            'elasticity': {}
        }


def _calculate_elasticity(df: pd.DataFrame, product_id: str, time_period: str) -> Dict[str, Any]:
    """Calculate price elasticity of demand."""
    # Sort by date
    df = df.sort_values('date')
    
    # Calculate percentage changes
    df['price_change'] = df['price'].pct_change() * 100
    df['quantity_change'] = df['quantity'].pct_change() * 100
    
    # Remove rows with zero or infinite changes
    df = df.dropna()
    df = df[np.isfinite(df['price_change'])]
    df = df[np.isfinite(df['quantity_change'])]
    
    if len(df) < 2:
        return {
            'error': 'Insufficient data for elasticity calculation',
            'elasticity_coefficient': 0,
            'interpretation': 'No data'
        }
    
    # Calculate elasticity coefficient
    # Elasticity = % change in quantity / % change in price
    elasticity_coeff = (df['quantity_change'].mean() / df['price_change'].mean()) if df['price_change'].mean() != 0 else 0
    
    # Interpret elasticity
    interpretation = _interpret_elasticity(elasticity_coeff)
    
    # Calculate additional metrics
    correlation = df['price'].corr(df['quantity'])
    r_squared = correlation ** 2
    
    # Price sensitivity analysis
    price_sensitivity = _analyze_price_sensitivity(df)
    
    return {
        'elasticity_coefficient': round(elasticity_coeff, 4),
        'interpretation': interpretation,
        'correlation': round(correlation, 4),
        'r_squared': round(r_squared, 4),
        'price_sensitivity': price_sensitivity,
        'data_points': len(df),
        'product_id': product_id,
        'time_period': time_period,
        'summary': {
            'is_elastic': abs(elasticity_coeff) > 1,
            'is_inelastic': abs(elasticity_coeff) < 1,
            'is_perfectly_elastic': abs(elasticity_coeff) == float('inf'),
            'is_perfectly_inelastic': elasticity_coeff == 0
        }
    }


def _interpret_elasticity(elasticity: float) -> str:
    """Interpret elasticity coefficient."""
    abs_elasticity = abs(elasticity)
    
    if abs_elasticity == 0:
        return "Perfectly inelastic - quantity does not change with price"
    elif abs_elasticity < 0.1:
        return "Highly inelastic - quantity changes very little with price"
    elif abs_elasticity < 0.5:
        return "Inelastic - quantity changes less than proportionally with price"
    elif abs_elasticity < 1:
        return "Relatively inelastic - quantity changes less than price"
    elif abs_elasticity == 1:
        return "Unit elastic - quantity changes proportionally with price"
    elif abs_elasticity < 2:
        return "Elastic - quantity changes more than price"
    elif abs_elasticity < 5:
        return "Highly elastic - quantity changes much more than price"
    else:
        return "Perfectly elastic - quantity changes infinitely with price"


def _analyze_price_sensitivity(df: pd.DataFrame) -> Dict[str, Any]:
    """Analyze price sensitivity patterns."""
    # Calculate price ranges
    price_min = df['price'].min()
    price_max = df['price'].max()
    price_range = price_max - price_min
    
    # Calculate quantity ranges
    qty_min = df['quantity'].min()
    qty_max = df['quantity'].max()
    qty_range = qty_max - qty_min
    
    # Calculate volatility
    price_volatility = df['price'].std() / df['price'].mean() * 100
    qty_volatility = df['quantity'].std() / df['quantity'].mean() * 100
    
    return {
        'price_range': {
            'min': round(price_min, 2),
            'max': round(price_max, 2),
            'range': round(price_range, 2)
        },
        'quantity_range': {
            'min': round(qty_min, 2),
            'max': round(qty_max, 2),
            'range': round(qty_range, 2)
        },
        'volatility': {
            'price_volatility': round(price_volatility, 2),
            'quantity_volatility': round(qty_volatility, 2)
        }
    }

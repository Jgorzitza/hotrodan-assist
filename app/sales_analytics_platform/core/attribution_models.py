"""
Attribution Models Comparison Module

This module provides functions to compare different attribution models
(first-touch, last-touch, multi-touch) for sales analytics.
"""

from typing import Dict, List, Any
import pandas as pd


def compare_attribution_models(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compare different attribution models for sales attribution.
    
    Args:
        data: Dictionary containing:
            - 'transactions': List of transaction records
            - 'touchpoints': List of customer touchpoint records
            - 'channels': List of marketing channels
            
    Returns:
        Dictionary containing attribution comparison results
    """
    try:
        # Extract data
        transactions = data.get('transactions', [])
        touchpoints = data.get('touchpoints', [])
        channels = data.get('channels', [])
        
        if not transactions:
            return {
                'error': 'No transaction data provided',
                'attribution_models': {}
            }
        
        # Convert to DataFrames for analysis
        df_transactions = pd.DataFrame(transactions)
        df_touchpoints = pd.DataFrame(touchpoints) if touchpoints else pd.DataFrame()
        
        # First-touch attribution
        first_touch = _calculate_first_touch_attribution(df_transactions, df_touchpoints)
        
        # Last-touch attribution
        last_touch = _calculate_last_touch_attribution(df_transactions, df_touchpoints)
        
        # Multi-touch attribution (linear)
        multi_touch = _calculate_multi_touch_attribution(df_transactions, df_touchpoints)
        
        # Calculate comparison metrics
        comparison = {
            'first_touch': first_touch,
            'last_touch': last_touch,
            'multi_touch': multi_touch,
            'summary': {
                'total_revenue': df_transactions['amount'].sum() if 'amount' in df_transactions.columns else 0,
                'total_transactions': len(df_transactions),
                'channels_analyzed': len(channels)
            }
        }
        
        return {
            'success': True,
            'attribution_models': comparison,
            'recommendations': _generate_attribution_recommendations(comparison)
        }
        
    except Exception as e:
        return {
            'error': f'Attribution analysis failed: {str(e)}',
            'attribution_models': {}
        }


def _calculate_first_touch_attribution(transactions: pd.DataFrame, touchpoints: pd.DataFrame) -> Dict[str, Any]:
    """Calculate first-touch attribution."""
    if touchpoints.empty:
        return {'channels': {}, 'total_attributed': 0}
    
    # Group by customer and get first touchpoint
    first_touches = touchpoints.groupby('customer_id').first().reset_index()
    
    # Merge with transactions
    merged = transactions.merge(first_touches, on='customer_id', how='left')
    
    # Calculate attribution by channel
    channel_attribution = merged.groupby('channel').agg({
        'amount': 'sum',
        'transaction_id': 'count'
    }).rename(columns={'transaction_id': 'transactions'})
    
    return {
        'channels': channel_attribution.to_dict('index'),
        'total_attributed': channel_attribution['amount'].sum()
    }


def _calculate_last_touch_attribution(transactions: pd.DataFrame, touchpoints: pd.DataFrame) -> Dict[str, Any]:
    """Calculate last-touch attribution."""
    if touchpoints.empty:
        return {'channels': {}, 'total_attributed': 0}
    
    # Group by customer and get last touchpoint
    last_touches = touchpoints.groupby('customer_id').last().reset_index()
    
    # Merge with transactions
    merged = transactions.merge(last_touches, on='customer_id', how='left')
    
    # Calculate attribution by channel
    channel_attribution = merged.groupby('channel').agg({
        'amount': 'sum',
        'transaction_id': 'count'
    }).rename(columns={'transaction_id': 'transactions'})
    
    return {
        'channels': channel_attribution.to_dict('index'),
        'total_attributed': channel_attribution['amount'].sum()
    }


def _calculate_multi_touch_attribution(transactions: pd.DataFrame, touchpoints: pd.DataFrame) -> Dict[str, Any]:
    """Calculate multi-touch attribution (linear model)."""
    if touchpoints.empty:
        return {'channels': {}, 'total_attributed': 0}
    
    # Calculate touchpoint counts per customer
    touchpoint_counts = touchpoints.groupby('customer_id').size().reset_index(name='touchpoint_count')
    
    # Merge with transactions
    merged = transactions.merge(touchpoint_counts, on='customer_id', how='left')
    
    # Calculate weighted attribution by channel
    channel_attribution = {}
    for channel in touchpoints['channel'].unique():
        channel_touches = touchpoints[touchpoints['channel'] == channel]
        channel_customers = channel_touches['customer_id'].unique()
        
        # Get transactions for customers who touched this channel
        channel_transactions = merged[merged['customer_id'].isin(channel_customers)]
        
        # Calculate weighted revenue (revenue / total touchpoints for customer)
        if not channel_transactions.empty and 'touchpoint_count' in channel_transactions.columns:
            weighted_revenue = (channel_transactions['amount'] / channel_transactions['touchpoint_count']).sum()
            transaction_count = len(channel_transactions)
        else:
            weighted_revenue = 0
            transaction_count = 0
        
        channel_attribution[channel] = {
            'amount': weighted_revenue,
            'transactions': transaction_count
        }
    
    return {
        'channels': channel_attribution,
        'total_attributed': sum(ch['amount'] for ch in channel_attribution.values())
    }


def _generate_attribution_recommendations(comparison: Dict[str, Any]) -> List[str]:
    """Generate recommendations based on attribution comparison."""
    recommendations = []
    
    first_touch = comparison.get('first_touch', {})
    last_touch = comparison.get('last_touch', {})
    multi_touch = comparison.get('multi_touch', {})
    
    # Compare attribution totals
    first_total = first_touch.get('total_attributed', 0)
    last_total = last_touch.get('total_attributed', 0)
    multi_total = multi_touch.get('total_attributed', 0)
    
    if multi_total > first_total * 1.1:
        recommendations.append("Multi-touch attribution shows significantly higher attribution than first-touch. Consider focusing on the full customer journey.")
    
    if last_total > first_total * 1.2:
        recommendations.append("Last-touch attribution is much higher than first-touch. Your closing channels are very effective.")
    
    if abs(multi_total - last_total) < multi_total * 0.1:
        recommendations.append("Multi-touch and last-touch attribution are similar. Your customers may have short, direct paths to conversion.")
    
    return recommendations

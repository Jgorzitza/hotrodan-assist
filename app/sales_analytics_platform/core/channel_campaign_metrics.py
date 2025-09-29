"""
Channel Campaign Metrics Module

This module provides functions to compute revenue, AOV, and conversion metrics
grouped by marketing channel and campaign.
"""

from typing import Dict, List, Any
import pandas as pd


def compute_channel_campaign_metrics(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute revenue, AOV, and conversion metrics by channel and campaign.
    
    Args:
        data: Dictionary containing:
            - 'transactions': List of transaction records
            - 'channels': List of marketing channels
            - 'campaigns': List of marketing campaigns
            
    Returns:
        Dictionary containing channel and campaign metrics
    """
    try:
        # Extract data
        transactions = data.get('transactions', [])
        channels = data.get('channels', [])
        campaigns = data.get('campaigns', [])
        
        if not transactions:
            return {
                'error': 'No transaction data provided',
                'metrics': {}
            }
        
        # Convert to DataFrame
        df_transactions = pd.DataFrame(transactions)
        
        # Ensure required columns exist
        required_cols = ['amount', 'channel']
        if not all(col in df_transactions.columns for col in required_cols):
            return {
                'error': f'Transaction data must contain columns: {required_cols}',
                'metrics': {}
            }
        
        # Calculate channel metrics
        channel_metrics = _calculate_channel_metrics(df_transactions)
        
        # Calculate campaign metrics if campaign data exists
        campaign_metrics = {}
        if 'campaign' in df_transactions.columns:
            campaign_metrics = _calculate_campaign_metrics(df_transactions)
        
        # Calculate overall metrics
        overall_metrics = _calculate_overall_metrics(df_transactions)
        
        return {
            'success': True,
            'metrics': {
                'channels': channel_metrics,
                'campaigns': campaign_metrics,
                'overall': overall_metrics,
                'summary': {
                    'total_transactions': len(df_transactions),
                    'total_revenue': df_transactions['amount'].sum(),
                    'channels_analyzed': len(channels),
                    'campaigns_analyzed': len(campaigns)
                }
            }
        }
        
    except Exception as e:
        return {
            'error': f'Channel campaign metrics calculation failed: {str(e)}',
            'metrics': {}
        }


def _calculate_channel_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate metrics by channel."""
    channel_metrics = {}
    
    for channel in df['channel'].unique():
        channel_data = df[df['channel'] == channel]
        
        revenue = channel_data['amount'].sum()
        transaction_count = len(channel_data)
        aov = revenue / transaction_count if transaction_count > 0 else 0
        
        # Calculate conversion rate (simplified - would need session data in real implementation)
        conversion_rate = 0.15  # Placeholder
        
        channel_metrics[channel] = {
            'revenue': round(revenue, 2),
            'transaction_count': transaction_count,
            'aov': round(aov, 2),
            'conversion_rate': round(conversion_rate * 100, 2)
        }
    
    return channel_metrics


def _calculate_campaign_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate metrics by campaign."""
    campaign_metrics = {}
    
    for campaign in df['campaign'].unique():
        campaign_data = df[df['campaign'] == campaign]
        
        revenue = campaign_data['amount'].sum()
        transaction_count = len(campaign_data)
        aov = revenue / transaction_count if transaction_count > 0 else 0
        
        # Calculate conversion rate (simplified)
        conversion_rate = 0.12  # Placeholder
        
        campaign_metrics[campaign] = {
            'revenue': round(revenue, 2),
            'transaction_count': transaction_count,
            'aov': round(aov, 2),
            'conversion_rate': round(conversion_rate * 100, 2)
        }
    
    return campaign_metrics


def _calculate_overall_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculate overall metrics."""
    total_revenue = df['amount'].sum()
    total_transactions = len(df)
    overall_aov = total_revenue / total_transactions if total_transactions > 0 else 0
    
    return {
        'total_revenue': round(total_revenue, 2),
        'total_transactions': total_transactions,
        'overall_aov': round(overall_aov, 2),
        'channels_count': df['channel'].nunique()
    }

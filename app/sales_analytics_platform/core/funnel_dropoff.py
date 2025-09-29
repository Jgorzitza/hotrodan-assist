"""
Funnel Drop-off Analysis Module

This module provides functions to analyze funnel drop-off points
with step annotations for sales analytics.
"""

from typing import Dict, List, Any
import pandas as pd


def analyze_funnel_dropoff(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze funnel drop-off points with step annotations.
    
    Args:
        data: Dictionary containing:
            - 'funnel_steps': List of funnel step definitions
            - 'user_sessions': List of user session data
            - 'conversions': List of conversion events
            
    Returns:
        Dictionary containing funnel analysis results
    """
    try:
        # Extract data
        funnel_steps = data.get('funnel_steps', [])
        user_sessions = data.get('user_sessions', [])
        conversions = data.get('conversions', [])
        
        if not funnel_steps or not user_sessions:
            return {
                'error': 'Missing required data: funnel_steps or user_sessions',
                'funnel_analysis': {}
            }
        
        # Convert to DataFrames
        df_steps = pd.DataFrame(funnel_steps)
        df_sessions = pd.DataFrame(user_sessions)
        df_conversions = pd.DataFrame(conversions) if conversions else pd.DataFrame()
        
        # Calculate step metrics
        step_metrics = _calculate_step_metrics(df_steps, df_sessions, df_conversions)
        
        # Identify drop-off points
        dropoff_analysis = _identify_dropoff_points(step_metrics)
        
        # Generate recommendations
        recommendations = _generate_funnel_recommendations(dropoff_analysis)
        
        return {
            'success': True,
            'funnel_analysis': {
                'step_metrics': step_metrics,
                'dropoff_analysis': dropoff_analysis,
                'recommendations': recommendations,
                'summary': {
                    'total_steps': len(funnel_steps),
                    'total_sessions': len(user_sessions),
                    'overall_conversion_rate': step_metrics[-1]['conversion_rate'] if step_metrics else 0
                }
            }
        }
        
    except Exception as e:
        return {
            'error': f'Funnel analysis failed: {str(e)}',
            'funnel_analysis': {}
        }


def _calculate_step_metrics(df_steps: pd.DataFrame, df_sessions: pd.DataFrame, df_conversions: pd.DataFrame) -> List[Dict[str, Any]]:
    """Calculate metrics for each funnel step."""
    step_metrics = []
    
    for idx, step in df_steps.iterrows():
        step_name = step['name']
        step_condition = step.get('condition', '')
        
        # Count users who reached this step
        if step_condition:
            # Simple condition matching (in real implementation, would use more sophisticated logic)
            reached_users = df_sessions[df_sessions['step'].str.contains(step_name, na=False)]
        else:
            reached_users = df_sessions[df_sessions['step'] == step_name]
        
        # Count conversions from this step
        if not df_conversions.empty:
            conversions_from_step = df_conversions[df_conversions['step'] == step_name]
        else:
            conversions_from_step = pd.DataFrame()
        
        # Calculate metrics
        users_reached = len(reached_users)
        conversions_count = len(conversions_from_step)
        conversion_rate = (conversions_count / users_reached * 100) if users_reached > 0 else 0
        
        # Calculate drop-off rate
        if idx > 0:
            previous_step_users = step_metrics[idx - 1]['users_reached']
            dropoff_rate = ((previous_step_users - users_reached) / previous_step_users * 100) if previous_step_users > 0 else 0
        else:
            dropoff_rate = 0
        
        step_metrics.append({
            'step_name': step_name,
            'step_order': idx + 1,
            'users_reached': users_reached,
            'conversions': conversions_count,
            'conversion_rate': conversion_rate,
            'dropoff_rate': dropoff_rate,
            'users_dropped': step_metrics[idx - 1]['users_reached'] - users_reached if idx > 0 else 0
        })
    
    return step_metrics


def _identify_dropoff_points(step_metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Identify major drop-off points in the funnel."""
    dropoff_points = []
    
    for i, step in enumerate(step_metrics):
        if step['dropoff_rate'] > 20:  # Significant drop-off threshold
            dropoff_points.append({
                'step_name': step['step_name'],
                'step_order': step['step_order'],
                'dropoff_rate': step['dropoff_rate'],
                'users_dropped': step['users_dropped'],
                'severity': 'high' if step['dropoff_rate'] > 50 else 'medium'
            })
    
    # Sort by drop-off rate
    dropoff_points.sort(key=lambda x: x['dropoff_rate'], reverse=True)
    
    return {
        'dropoff_points': dropoff_points,
        'total_dropoff_points': len(dropoff_points),
        'highest_dropoff': dropoff_points[0] if dropoff_points else None
    }


def _generate_funnel_recommendations(dropoff_analysis: Dict[str, Any]) -> List[str]:
    """Generate recommendations based on drop-off analysis."""
    recommendations = []
    
    dropoff_points = dropoff_analysis.get('dropoff_points', [])
    
    if not dropoff_points:
        recommendations.append("No significant drop-off points identified. Funnel is performing well.")
        return recommendations
    
    for point in dropoff_points:
        step_name = point['step_name']
        dropoff_rate = point['dropoff_rate']
        severity = point['severity']
        
        if severity == 'high':
            recommendations.append(f"HIGH PRIORITY: {step_name} has {dropoff_rate:.1f}% drop-off rate. Immediate attention required.")
        elif severity == 'medium':
            recommendations.append(f"MEDIUM PRIORITY: {step_name} has {dropoff_rate:.1f}% drop-off rate. Consider optimization.")
        
        # Specific recommendations based on step type
        if 'signup' in step_name.lower():
            recommendations.append(f"Consider simplifying the signup process for {step_name}.")
        elif 'checkout' in step_name.lower():
            recommendations.append(f"Review checkout flow and payment options for {step_name}.")
        elif 'form' in step_name.lower():
            recommendations.append(f"Reduce form fields or improve UX for {step_name}.")
    
    return recommendations

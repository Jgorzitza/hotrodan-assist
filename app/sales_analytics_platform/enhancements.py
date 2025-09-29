import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

class SalesAnalyticsEnhancements:
    """Enhanced features for the Sales Analytics Platform"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.cache = {}
        self.cache_ttl = 300  # 5 minutes
        
    def get_cached_result(self, key: str) -> Optional[Any]:
        """Get cached result if still valid"""
        if key in self.cache:
            result, timestamp = self.cache[key]
            if time.time() - timestamp < self.cache_ttl:
                return result
            else:
                del self.cache[key]
        return None
    
    def cache_result(self, key: str, result: Any):
        """Cache result with timestamp"""
        self.cache[key] = (result, time.time())
    
    def generate_insights(self, data: List[Dict]) -> Dict[str, Any]:
        """Generate advanced insights from sales data"""
        cache_key = f"insights_{hash(str(data))}"
        cached = self.get_cached_result(cache_key)
        if cached:
            return cached
            
        insights = {
            "timestamp": datetime.now().isoformat(),
            "total_records": len(data),
            "performance_metrics": self._calculate_performance_metrics(data),
            "trend_analysis": self._analyze_trends(data),
            "anomaly_detection": self._detect_anomalies(data),
            "recommendations": self._generate_recommendations(data)
        }
        
        self.cache_result(cache_key, insights)
        return insights
    
    def _calculate_performance_metrics(self, data: List[Dict]) -> Dict[str, Any]:
        """Calculate advanced performance metrics"""
        if not data:
            return {}
            
        total_revenue = sum(item.get('revenue', 0) for item in data)
        total_orders = sum(item.get('orders', 0) for item in data)
        avg_order_value = total_revenue / max(total_orders, 1)
        
        # Calculate conversion rates by channel
        channel_metrics = {}
        for item in data:
            channel = item.get('channel', 'unknown')
            if channel not in channel_metrics:
                channel_metrics[channel] = {'revenue': 0, 'orders': 0, 'sessions': 0}
            
            channel_metrics[channel]['revenue'] += item.get('revenue', 0)
            channel_metrics[channel]['orders'] += item.get('orders', 0)
            channel_metrics[channel]['sessions'] += item.get('sessions', 0)
        
        # Calculate conversion rates
        for channel, metrics in channel_metrics.items():
            metrics['conversion_rate'] = (metrics['orders'] / max(metrics['sessions'], 1)) * 100
            metrics['aov'] = metrics['revenue'] / max(metrics['orders'], 1)
        
        return {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "average_order_value": avg_order_value,
            "channel_breakdown": channel_metrics,
            "top_performing_channel": max(channel_metrics.items(), key=lambda x: x[1]['revenue'])[0] if channel_metrics else None
        }
    
    def _analyze_trends(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze trends in the data"""
        if len(data) < 2:
            return {"trend": "insufficient_data"}
        
        # Sort by revenue to analyze trends
        sorted_data = sorted(data, key=lambda x: x.get('revenue', 0))
        
        # Calculate growth rate
        first_half = sorted_data[:len(sorted_data)//2]
        second_half = sorted_data[len(sorted_data)//2:]
        
        first_avg = sum(item.get('revenue', 0) for item in first_half) / max(len(first_half), 1)
        second_avg = sum(item.get('revenue', 0) for item in second_half) / max(len(second_half), 1)
        
        growth_rate = ((second_avg - first_avg) / max(first_avg, 1)) * 100
        
        return {
            "growth_rate": growth_rate,
            "trend_direction": "increasing" if growth_rate > 0 else "decreasing",
            "trend_strength": abs(growth_rate),
            "data_points": len(data)
        }
    
    def _detect_anomalies(self, data: List[Dict]) -> List[Dict[str, Any]]:
        """Detect anomalies in the data"""
        if len(data) < 3:
            return []
        
        revenues = [item.get('revenue', 0) for item in data]
        mean_revenue = sum(revenues) / len(revenues)
        
        # Calculate standard deviation
        variance = sum((x - mean_revenue) ** 2 for x in revenues) / len(revenues)
        std_dev = variance ** 0.5
        
        anomalies = []
        for i, item in enumerate(data):
            revenue = item.get('revenue', 0)
            z_score = abs((revenue - mean_revenue) / max(std_dev, 1))
            
            if z_score > 2:  # 2 standard deviations
                anomalies.append({
                    "index": i,
                    "revenue": revenue,
                    "z_score": z_score,
                    "severity": "high" if z_score > 3 else "medium",
                    "description": f"Revenue anomaly: {revenue} (z-score: {z_score:.2f})"
                })
        
        return anomalies
    
    def _generate_recommendations(self, data: List[Dict]) -> List[Dict[str, Any]]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if not data:
            return recommendations
        
        # Analyze channel performance
        channel_revenue = {}
        for item in data:
            channel = item.get('channel', 'unknown')
            channel_revenue[channel] = channel_revenue.get(channel, 0) + item.get('revenue', 0)
        
        if channel_revenue:
            best_channel = max(channel_revenue.items(), key=lambda x: x[1])
            worst_channel = min(channel_revenue.items(), key=lambda x: x[1])
            
            if best_channel[1] > worst_channel[1] * 2:
                recommendations.append({
                    "type": "channel_optimization",
                    "priority": "high",
                    "title": f"Focus on {best_channel[0]} channel",
                    "description": f"{best_channel[0]} is performing {best_channel[1]/worst_channel[1]:.1f}x better than {worst_channel[0]}",
                    "action": f"Allocate more resources to {best_channel[0]} channel"
                })
        
        # Analyze conversion rates
        total_orders = sum(item.get('orders', 0) for item in data)
        total_sessions = sum(item.get('sessions', 0) for item in data)
        overall_conversion = (total_orders / max(total_sessions, 1)) * 100
        
        if overall_conversion < 2.0:
            recommendations.append({
                "type": "conversion_optimization",
                "priority": "high",
                "title": "Improve conversion rate",
                "description": f"Current conversion rate is {overall_conversion:.1f}%, below industry average",
                "action": "Implement A/B testing for checkout process and landing pages"
            })
        
        return recommendations
    
    def export_insights(self, insights: Dict[str, Any], format: str = "json") -> str:
        """Export insights in specified format"""
        if format == "json":
            return json.dumps(insights, indent=2)
        elif format == "csv":
            return self._convert_to_csv(insights)
        else:
            return str(insights)
    
    def _convert_to_csv(self, insights: Dict[str, Any]) -> str:
        """Convert insights to CSV format"""
        lines = []
        lines.append("Metric,Value")
        lines.append(f"Total Records,{insights.get('total_records', 0)}")
        
        perf_metrics = insights.get('performance_metrics', {})
        lines.append(f"Total Revenue,{perf_metrics.get('total_revenue', 0)}")
        lines.append(f"Total Orders,{perf_metrics.get('total_orders', 0)}")
        lines.append(f"Average Order Value,{perf_metrics.get('average_order_value', 0)}")
        
        trend = insights.get('trend_analysis', {})
        lines.append(f"Growth Rate,{trend.get('growth_rate', 0)}")
        lines.append(f"Trend Direction,{trend.get('trend_direction', 'unknown')}")
        
        anomalies = insights.get('anomaly_detection', [])
        lines.append(f"Anomalies Detected,{len(anomalies)}")
        
        recommendations = insights.get('recommendations', [])
        lines.append(f"Recommendations,{len(recommendations)}")
        
        return "\\n".join(lines)

# Global enhancements instance
enhancements = SalesAnalyticsEnhancements()

"""
SEO Advanced Analytics Platform

Comprehensive SEO analytics with predictive capabilities:
- Predictive analytics and forecasting
- Real-time dashboard and monitoring  
- Intelligent alerting and anomaly detection
- Advanced reporting and insights
- Competitive intelligence
"""

from .main import SEOAdvancedAnalyticsPlatform
from .predictive_analytics import PredictiveSEOAnalytics, SEOForecast, CompetitiveAnalysis, SEOTrend
from .dashboard_analytics import SEOAnalyticsDashboard, DashboardMetric, ChartData
from .intelligent_alerts import IntelligentAlertSystem, Alert, AlertRule, AlertSeverity, AlertType

__version__ = "1.0.0"
__all__ = [
    "SEOAdvancedAnalyticsPlatform",
    "PredictiveSEOAnalytics", 
    "SEOForecast",
    "CompetitiveAnalysis",
    "SEOTrend",
    "SEOAnalyticsDashboard",
    "DashboardMetric",
    "ChartData",
    "IntelligentAlertSystem",
    "Alert",
    "AlertRule", 
    "AlertSeverity",
    "AlertType"
]

#!/usr/bin/env python3
"""
SEO Advanced Analytics Platform - Main Orchestrator

Comprehensive SEO analytics platform with:
- Predictive analytics and forecasting
- Real-time dashboard and monitoring
- Intelligent alerting and anomaly detection
- Advanced reporting and insights
- Competitive intelligence
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import asdict

from .predictive_analytics import PredictiveSEOAnalytics, AdvancedAnalyticsReport
from .dashboard_analytics import SEOAnalyticsDashboard
from .intelligent_alerts import IntelligentAlertSystem, AlertRule, AlertType, AlertSeverity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SEOAdvancedAnalyticsPlatform:
    """Main SEO Advanced Analytics Platform."""
    
    def __init__(self):
        self.predictive_analytics = PredictiveSEOAnalytics()
        self.dashboard = SEOAnalyticsDashboard()
        self.alert_system = IntelligentAlertSystem()
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Initialize default alert rules
        self._setup_default_alerts()
    
    def _setup_default_alerts(self):
        """Setup default alert rules."""
        
        default_rules = [
            AlertRule(
                rule_id="traffic_drop",
                name="Organic Traffic Drop",
                alert_type=AlertType.PERFORMANCE_DROP,
                metric_name="organic_traffic",
                condition="change_greater_than",
                threshold=-20.0,
                severity=AlertSeverity.WARNING,
                enabled=True,
                keywords=[],
                pages=[],
                cooldown_minutes=60,
                escalation_minutes=240,
                created_at=datetime.now().isoformat()
            ),
            AlertRule(
                rule_id="ranking_drop",
                name="Keyword Ranking Drop",
                alert_type=AlertType.RANKING_DROP,
                metric_name="average_rank",
                condition="greater_than",
                threshold=25.0,
                severity=AlertSeverity.CRITICAL,
                enabled=True,
                keywords=[],
                pages=[],
                cooldown_minutes=30,
                escalation_minutes=120,
                created_at=datetime.now().isoformat()
            ),
            AlertRule(
                rule_id="traffic_spike",
                name="Traffic Spike Detection",
                alert_type=AlertType.TRAFFIC_SPIKE,
                metric_name="organic_traffic",
                condition="change_greater_than",
                threshold=50.0,
                severity=AlertSeverity.INFO,
                enabled=True,
                keywords=[],
                pages=[],
                cooldown_minutes=30,
                escalation_minutes=60,
                created_at=datetime.now().isoformat()
            )
        ]
        
        for rule in default_rules:
            self.alert_system.add_alert_rule(rule)
    
    def add_historical_data(self, keyword: str, data: List[Dict[str, Any]]):
        """Add historical data for predictive analytics."""
        self.predictive_analytics.add_historical_data(keyword, data)
    
    def add_metric_data(self, metric_name: str, value: float, timestamp: str = None):
        """Add metric data for monitoring and alerting."""
        self.alert_system.add_metric_data(metric_name, value, timestamp)
        self.dashboard.add_metric_data(metric_name, value, timestamp)
    
    def generate_comprehensive_report(self, 
                                    keywords: List[str], 
                                    competitors: List[str],
                                    metrics: Dict[str, List[float]]) -> Dict[str, Any]:
        """Generate comprehensive analytics report."""
        
        # Generate predictive analytics report
        predictive_report = self.predictive_analytics.generate_advanced_report(
            keywords, competitors, metrics
        )
        
        # Generate dashboard data
        dashboard_data = self.dashboard.generate_dashboard_data()
        
        # Check for alerts
        rule_alerts = self.alert_system.check_alert_rules()
        anomaly_alerts = self.alert_system.check_anomaly_alerts()
        
        # Generate alert summary
        alert_summary = self.alert_system.generate_alert_summary()
        
        # Combine all data
        comprehensive_report = {
            "report_id": f"seo_advanced_analytics_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "generated_at": datetime.now().isoformat(),
            "period": {
                "start": (datetime.now() - timedelta(days=90)).isoformat(),
                "end": datetime.now().isoformat()
            },
            "predictive_analytics": asdict(predictive_report),
            "dashboard": dashboard_data,
            "alerts": {
                "rule_alerts": [asdict(alert) for alert in rule_alerts],
                "anomaly_alerts": [asdict(alert) for alert in anomaly_alerts],
                "summary": alert_summary
            },
            "insights": self._generate_insights(predictive_report, alert_summary),
            "recommendations": self._generate_recommendations(predictive_report, alert_summary)
        }
        
        return comprehensive_report
    
    def _generate_insights(self, predictive_report: AdvancedAnalyticsReport, alert_summary: Dict[str, Any]) -> List[str]:
        """Generate key insights from analytics data."""
        
        insights = []
        
        # Predictive insights
        high_opportunity_keywords = [f for f in predictive_report.forecasts if f.opportunity_score > 0.7]
        if high_opportunity_keywords:
            insights.append(f"🎯 {len(high_opportunity_keywords)} high-opportunity keywords identified with strong growth potential")
        
        # Alert insights
        if alert_summary["active_alerts"] > 0:
            insights.append(f"⚠️ {alert_summary['active_alerts']} active alerts requiring attention")
        
        critical_alerts = alert_summary["alerts_by_severity"]["critical"] + alert_summary["alerts_by_severity"]["emergency"]
        if critical_alerts > 0:
            insights.append(f"🚨 {critical_alerts} critical alerts requiring immediate action")
        
        # Trend insights
        positive_trends = [t for t in predictive_report.trends if t.trend_direction == "up"]
        if positive_trends:
            insights.append(f"📈 {len(positive_trends)} positive trends detected indicating growth momentum")
        
        # Competitive insights
        high_threat_competitors = [c for c in predictive_report.competitive_analysis if c.threat_level == "High"]
        if high_threat_competitors:
            insights.append(f"🏆 {len(high_threat_competitors)} high-threat competitors identified requiring strategic response")
        
        return insights
    
    def _generate_recommendations(self, predictive_report: AdvancedAnalyticsReport, alert_summary: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations."""
        
        recommendations = []
        
        # High-priority recommendations
        if alert_summary["active_alerts"] > 5:
            recommendations.append("🔧 Address active alerts to improve overall SEO performance")
        
        if alert_summary["alerts_by_severity"]["critical"] > 0:
            recommendations.append("🚨 Resolve critical alerts immediately to prevent further damage")
        
        # Keyword recommendations
        high_opportunity_keywords = [f for f in predictive_report.forecasts if f.opportunity_score > 0.7]
        if high_opportunity_keywords:
            recommendations.append("🎯 Focus on high-opportunity keywords for maximum ROI")
        
        # Content recommendations
        recommendations.extend([
            "📝 Develop comprehensive content clusters around target keywords",
            "🔗 Build high-quality backlinks to improve domain authority",
            "⚡ Optimize page loading speed and mobile experience",
            "📊 Monitor competitor activities and adapt strategies accordingly"
        ])
        
        # Technical recommendations
        recommendations.extend([
            "🔍 Implement structured data markup for better search visibility",
            "📱 Ensure mobile-first indexing compliance",
            "🌐 Optimize for featured snippets and voice search",
            "📈 Set up advanced tracking and monitoring systems"
        ])
        
        return recommendations
    
    def export_report(self, report: Dict[str, Any], format: str = "json") -> str:
        """Export report in specified format."""
        
        if format == "json":
            return json.dumps(report, indent=2, default=str)
        elif format == "markdown":
            return self._generate_markdown_report(report)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_markdown_report(self, report: Dict[str, Any]) -> str:
        """Generate markdown report."""
        
        md_content = f"""# SEO Advanced Analytics Report

**Report ID**: {report['report_id']}  
**Generated**: {report['generated_at']}  
**Period**: {report['period']['start']} to {report['period']['end']}

## 🎯 Key Insights

"""
        
        for insight in report['insights']:
            md_content += f"- {insight}\n"
        
        md_content += "\n## 📊 Predictive Analytics\n\n"
        
        # Forecasts
        md_content += "### Keyword Forecasts\n\n"
        for forecast in report['predictive_analytics']['forecasts']:
            md_content += f"**{forecast['keyword']}**\n"
            md_content += f"- Current Rank: {forecast['current_rank']}\n"
            md_content += f"- Predicted 30d: {forecast['predicted_rank_30d']}\n"
            md_content += f"- Predicted 90d: {forecast['predicted_rank_90d']}\n"
            md_content += f"- Opportunity Score: {forecast['opportunity_score']:.2f}\n"
            md_content += f"- Traffic Forecast: {forecast['traffic_forecast']}\n\n"
        
        # Alerts
        md_content += "## ⚠️ Active Alerts\n\n"
        alert_summary = report['alerts']['summary']
        md_content += f"- **Total Alerts**: {alert_summary['total_alerts']}\n"
        md_content += f"- **Active Alerts**: {alert_summary['active_alerts']}\n"
        md_content += f"- **Critical Alerts**: {alert_summary['alerts_by_severity']['critical']}\n"
        md_content += f"- **Warning Alerts**: {alert_summary['alerts_by_severity']['warning']}\n\n"
        
        # Recommendations
        md_content += "## 🚀 Recommendations\n\n"
        for i, rec in enumerate(report['recommendations'], 1):
            md_content += f"{i}. {rec}\n"
        
        return md_content
    
    def run_continuous_monitoring(self, interval_minutes: int = 5):
        """Run continuous monitoring and alerting."""
        
        self.logger.info(f"Starting continuous monitoring (interval: {interval_minutes} minutes)")
        
        while True:
            try:
                # Check for alerts
                rule_alerts = self.alert_system.check_alert_rules()
                anomaly_alerts = self.alert_system.check_anomaly_alerts()
                
                if rule_alerts or anomaly_alerts:
                    self.logger.info(f"Generated {len(rule_alerts)} rule alerts and {len(anomaly_alerts)} anomaly alerts")
                
                # Wait for next check
                asyncio.sleep(interval_minutes * 60)
                
            except KeyboardInterrupt:
                self.logger.info("Stopping continuous monitoring")
                break
            except Exception as e:
                self.logger.error(f"Error in continuous monitoring: {e}")
                asyncio.sleep(60)  # Wait 1 minute before retrying

def main():
    """Main function to demonstrate SEO Advanced Analytics Platform."""
    
    # Initialize platform
    platform = SEOAdvancedAnalyticsPlatform()
    
    print("🚀 SEO Advanced Analytics Platform - DEMO")
    print("=" * 50)
    
    # Sample data
    keywords = ["seo best practices", "content marketing", "keyword research", "link building", "technical seo"]
    competitors = ["competitor1.com", "competitor2.com", "competitor3.com", "competitor4.com"]
    
    # Sample metrics
    metrics = {
        "organic_traffic": [1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900],
        "average_rank": [15, 14, 13, 12, 11, 10, 9, 8, 7, 6],
        "click_through_rate": [2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9, 4.1, 4.3],
        "conversion_rate": [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1]
    }
    
    # Add sample metric data
    for metric_name, values in metrics.items():
        for i, value in enumerate(values):
            timestamp = (datetime.now() - timedelta(days=len(values)-i)).isoformat()
            platform.add_metric_data(metric_name, value, timestamp)
    
    # Generate comprehensive report
    report = platform.generate_comprehensive_report(keywords, competitors, metrics)
    
    print(f"Report ID: {report['report_id']}")
    print(f"Forecasts: {len(report['predictive_analytics']['forecasts'])}")
    print(f"Competitive Analysis: {len(report['predictive_analytics']['competitive_analysis'])}")
    print(f"Trends: {len(report['predictive_analytics']['trends'])}")
    print(f"Active Alerts: {report['alerts']['summary']['active_alerts']}")
    print(f"Insights: {len(report['insights'])}")
    print(f"Recommendations: {len(report['recommendations'])}")
    
    # Export reports
    json_report = platform.export_report(report, "json")
    markdown_report = platform.export_report(report, "markdown")
    
    with open("seo_advanced_analytics_report.json", "w") as f:
        f.write(json_report)
    
    with open("seo_advanced_analytics_report.md", "w") as f:
        f.write(markdown_report)
    
    print("\nFiles created:")
    print("- seo_advanced_analytics_report.json")
    print("- seo_advanced_analytics_report.md")
    
    print("\n🎯 Key Insights:")
    for insight in report['insights']:
        print(f"  {insight}")
    
    print("\n🚀 Top Recommendations:")
    for i, rec in enumerate(report['recommendations'][:5], 1):
        print(f"  {i}. {rec}")

if __name__ == "__main__":
    main()

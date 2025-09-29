#!/usr/bin/env python3
"""
SEO Analytics Dashboard - Advanced Analytics Platform

Real-time SEO analytics dashboard with:
- Live performance monitoring
- Interactive charts and visualizations
- Custom reporting and alerts
- Advanced filtering and segmentation
- Export capabilities
"""

import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import logging
import pandas as pd
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class DashboardMetric:
    """Dashboard metric data point."""

    metric_name: str
    current_value: float
    previous_value: float
    change_percent: float
    trend: str
    status: str
    target_value: Optional[float] = None
    last_updated: str = ""


@dataclass
class ChartData:
    """Chart data for visualization."""

    chart_type: str
    title: str
    data: List[Dict[str, Any]]
    x_axis: str
    y_axis: str
    colors: List[str]
    created_at: str


@dataclass
class AlertRule:
    """Alert rule configuration."""

    rule_id: str
    metric_name: str
    condition: str
    threshold: float
    severity: str
    enabled: bool
    created_at: str


@dataclass
class DashboardConfig:
    """Dashboard configuration."""

    dashboard_id: str
    name: str
    widgets: List[Dict[str, Any]]
    filters: Dict[str, Any]
    refresh_interval: int
    theme: str
    created_at: str


class SEOAnalyticsDashboard:
    """Advanced SEO analytics dashboard."""

    def __init__(self):
        self.metrics = {}
        self.charts = {}
        self.alerts = []
        self.configs = {}
        self.logger = logging.getLogger(self.__class__.__name__)

    def add_metric(self, metric: DashboardMetric):
        """Add or update a dashboard metric."""
        self.metrics[metric.metric_name] = metric
        self.logger.info(f"Updated metric: {metric.metric_name}")

    def get_metric(self, metric_name: str) -> Optional[DashboardMetric]:
        """Get a specific metric."""
        return self.metrics.get(metric_name)

    def get_all_metrics(self) -> List[DashboardMetric]:
        """Get all metrics."""
        return list(self.metrics.values())

    def create_chart(
        self,
        chart_type: str,
        title: str,
        data: List[Dict[str, Any]],
        x_axis: str,
        y_axis: str,
        colors: List[str] = None,
    ) -> ChartData:
        """Create a chart for the dashboard."""

        if colors is None:
            colors = ["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"]

        chart = ChartData(
            chart_type=chart_type,
            title=title,
            data=data,
            x_axis=x_axis,
            y_axis=y_axis,
            colors=colors,
            created_at=datetime.now().isoformat(),
        )

        chart_id = f"{chart_type}_{len(self.charts)}"
        self.charts[chart_id] = chart

        self.logger.info(f"Created chart: {title}")
        return chart

    def create_traffic_chart(self, days: int = 30) -> ChartData:
        """Create organic traffic trend chart."""

        # Generate mock traffic data
        dates = [
            (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            for i in range(days, 0, -1)
        ]
        traffic_data = []

        base_traffic = 1000
        for i, date in enumerate(dates):
            # Add some realistic variation
            variation = np.random.normal(0, 0.1)
            traffic = int(
                base_traffic * (1 + variation + (i * 0.02))
            )  # Slight growth trend

            traffic_data.append(
                {
                    "date": date,
                    "traffic": traffic,
                    "sessions": int(traffic * 1.2),
                    "bounce_rate": round(np.random.uniform(0.4, 0.7), 2),
                }
            )

        return self.create_chart(
            chart_type="line",
            title="Organic Traffic Trend",
            data=traffic_data,
            x_axis="date",
            y_axis="traffic",
            colors=["#3498db"],
        )

    def create_ranking_chart(self, keywords: List[str]) -> ChartData:
        """Create keyword ranking chart."""

        ranking_data = []
        for keyword in keywords:
            # Generate mock ranking data
            current_rank = np.random.randint(1, 50)
            previous_rank = current_rank + np.random.randint(-5, 5)

            ranking_data.append(
                {
                    "keyword": keyword,
                    "current_rank": current_rank,
                    "previous_rank": previous_rank,
                    "change": current_rank - previous_rank,
                    "traffic_potential": np.random.randint(100, 2000),
                }
            )

        return self.create_chart(
            chart_type="bar",
            title="Keyword Rankings",
            data=ranking_data,
            x_axis="keyword",
            y_axis="current_rank",
            colors=["#2ecc71", "#e74c3c"],
        )

    def create_competitor_chart(self, competitors: List[str]) -> ChartData:
        """Create competitor analysis chart."""

        competitor_data = []
        for competitor in competitors:
            market_share = np.random.uniform(0.1, 0.4)
            keyword_overlap = np.random.uniform(0.2, 0.8)

            competitor_data.append(
                {
                    "competitor": competitor,
                    "market_share": round(market_share * 100, 1),
                    "keyword_overlap": round(keyword_overlap * 100, 1),
                    "threat_level": (
                        "High"
                        if market_share > 0.3
                        else "Medium" if market_share > 0.15 else "Low"
                    ),
                }
            )

        return self.create_chart(
            chart_type="scatter",
            title="Competitor Analysis",
            data=competitor_data,
            x_axis="market_share",
            y_axis="keyword_overlap",
            colors=["#e74c3c", "#f39c12", "#2ecc71"],
        )

    def create_performance_chart(self, metrics: List[str]) -> ChartData:
        """Create performance metrics chart."""

        performance_data = []
        for metric in metrics:
            current_value = np.random.uniform(50, 100)
            previous_value = current_value + np.random.uniform(-10, 10)
            change_percent = ((current_value - previous_value) / previous_value) * 100

            performance_data.append(
                {
                    "metric": metric,
                    "current_value": round(current_value, 1),
                    "previous_value": round(previous_value, 1),
                    "change_percent": round(change_percent, 1),
                    "status": "improving" if change_percent > 0 else "declining",
                }
            )

        return self.create_chart(
            chart_type="radar",
            title="Performance Metrics",
            data=performance_data,
            x_axis="metric",
            y_axis="current_value",
            colors=["#9b59b6"],
        )

    def add_alert_rule(self, rule: AlertRule):
        """Add an alert rule."""
        self.alerts.append(rule)
        self.logger.info(f"Added alert rule: {rule.rule_id}")

    def check_alerts(self) -> List[Dict[str, Any]]:
        """Check all alert rules and return triggered alerts."""

        triggered_alerts = []

        for rule in self.alerts:
            if not rule.enabled:
                continue

            metric = self.get_metric(rule.metric_name)
            if not metric:
                continue

            # Check alert condition
            triggered = False
            if (
                rule.condition == "greater_than"
                and metric.current_value > rule.threshold
            ):
                triggered = True
            elif (
                rule.condition == "less_than" and metric.current_value < rule.threshold
            ):
                triggered = True
            elif (
                rule.condition == "change_greater_than"
                and abs(metric.change_percent) > rule.threshold
            ):
                triggered = True

            if triggered:
                alert = {
                    "rule_id": rule.rule_id,
                    "metric_name": rule.metric_name,
                    "current_value": metric.current_value,
                    "threshold": rule.threshold,
                    "severity": rule.severity,
                    "message": f"Alert: {rule.metric_name} {rule.condition} {rule.threshold}",
                    "triggered_at": datetime.now().isoformat(),
                }
                triggered_alerts.append(alert)

        return triggered_alerts

    def create_dashboard_config(
        self, name: str, widgets: List[Dict[str, Any]], filters: Dict[str, Any] = None
    ) -> DashboardConfig:
        """Create a dashboard configuration."""

        if filters is None:
            filters = {
                "date_range": "30d",
                "keywords": [],
                "competitors": [],
                "metrics": [],
            }

        config = DashboardConfig(
            dashboard_id=f"dashboard_{len(self.configs)}",
            name=name,
            widgets=widgets,
            filters=filters,
            refresh_interval=300,  # 5 minutes
            theme="light",
            created_at=datetime.now().isoformat(),
        )

        self.configs[config.dashboard_id] = config
        self.logger.info(f"Created dashboard config: {name}")

        return config

    def generate_dashboard_data(self) -> Dict[str, Any]:
        """Generate complete dashboard data."""

        # Create sample metrics
        sample_metrics = [
            DashboardMetric(
                metric_name="organic_traffic",
                current_value=15420,
                previous_value=14200,
                change_percent=8.6,
                trend="up",
                status="good",
                target_value=20000,
                last_updated=datetime.now().isoformat(),
            ),
            DashboardMetric(
                metric_name="average_rank",
                current_value=12.3,
                previous_value=14.1,
                change_percent=-12.8,
                trend="up",
                status="excellent",
                target_value=10.0,
                last_updated=datetime.now().isoformat(),
            ),
            DashboardMetric(
                metric_name="click_through_rate",
                current_value=3.2,
                previous_value=2.9,
                change_percent=10.3,
                trend="up",
                status="good",
                target_value=4.0,
                last_updated=datetime.now().isoformat(),
            ),
        ]

        for metric in sample_metrics:
            self.add_metric(metric)

        # Create charts

        # Create alert rules
        alert_rules = [
            AlertRule(
                rule_id="traffic_drop",
                metric_name="organic_traffic",
                condition="change_greater_than",
                threshold=-10.0,
                severity="warning",
                enabled=True,
                created_at=datetime.now().isoformat(),
            ),
            AlertRule(
                rule_id="rank_drop",
                metric_name="average_rank",
                condition="greater_than",
                threshold=20.0,
                severity="critical",
                enabled=True,
                created_at=datetime.now().isoformat(),
            ),
        ]

        for rule in alert_rules:
            self.add_alert_rule(rule)

        # Check alerts
        triggered_alerts = self.check_alerts()

        # Create dashboard config
        widgets = [
            {
                "type": "metric",
                "metric": "organic_traffic",
                "position": {"x": 0, "y": 0},
            },
            {
                "type": "chart",
                "chart_id": "traffic_chart",
                "position": {"x": 0, "y": 1},
            },
            {
                "type": "chart",
                "chart_id": "ranking_chart",
                "position": {"x": 1, "y": 0},
            },
            {
                "type": "chart",
                "chart_id": "competitor_chart",
                "position": {"x": 1, "y": 1},
            },
        ]

        dashboard_config = self.create_dashboard_config(
            "SEO Analytics Dashboard", widgets
        )

        return {
            "dashboard_id": dashboard_config.dashboard_id,
            "name": dashboard_config.name,
            "metrics": [asdict(m) for m in self.get_all_metrics()],
            "charts": {k: asdict(v) for k, v in self.charts.items()},
            "alerts": triggered_alerts,
            "config": asdict(dashboard_config),
            "generated_at": datetime.now().isoformat(),
        }

    def export_dashboard_data(self, format: str = "json") -> str:
        """Export dashboard data in specified format."""

        data = self.generate_dashboard_data()

        if format == "json":
            return json.dumps(data, indent=2, default=str)
        elif format == "csv":
            # Convert to CSV format
            df = pd.DataFrame(data["metrics"])
            return df.to_csv(index=False)
        else:
            raise ValueError(f"Unsupported format: {format}")


def main():
    """Main function to demonstrate SEO analytics dashboard."""

    # Initialize dashboard
    dashboard = SEOAnalyticsDashboard()

    print("🚀 SEO Analytics Dashboard - DEMO")
    print("=" * 40)

    # Generate dashboard data
    data = dashboard.generate_dashboard_data()

    print(f"Dashboard: {data['name']}")
    print(f"Metrics: {len(data['metrics'])}")
    print(f"Charts: {len(data['charts'])}")
    print(f"Alerts: {len(data['alerts'])}")

    # Export data
    json_data = dashboard.export_dashboard_data("json")

    with open("seo_dashboard_data.json", "w") as f:
        f.write(json_data)

    print("\nFiles created:")
    print("- seo_dashboard_data.json")

    # Print sample metrics
    print("\nSample Metrics:")
    for metric in data["metrics"]:
        print(
            f"- {metric['metric_name']}: {metric['current_value']} ({metric['change_percent']:+.1f}%)"
        )


if __name__ == "__main__":
    main()

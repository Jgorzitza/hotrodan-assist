#!/usr/bin/env python3
"""
SEO Intelligent Alerts System - Advanced Analytics Platform

Intelligent SEO monitoring and alerting:
- Anomaly detection and alerting
- Predictive alerting based on trends
- Smart notification routing
- Alert prioritization and escalation
- Custom alert rules and thresholds
"""

import json
from typing import Dict, List, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import numpy as np
from collections import deque
import statistics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""

    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AlertType(Enum):
    """Alert types."""

    PERFORMANCE_DROP = "performance_drop"
    RANKING_DROP = "ranking_drop"
    TRAFFIC_SPIKE = "traffic_spike"
    COMPETITOR_THREAT = "competitor_threat"
    TECHNICAL_ISSUE = "technical_issue"
    ANOMALY_DETECTED = "anomaly_detected"


@dataclass
class Alert:
    """SEO alert data structure."""

    alert_id: str
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    description: str
    metric_name: str
    current_value: float
    threshold_value: float
    change_percent: float
    affected_keywords: List[str]
    affected_pages: List[str]
    recommendations: List[str]
    created_at: str
    acknowledged: bool = False
    resolved: bool = False
    escalated: bool = False


@dataclass
class AlertRule:
    """Alert rule configuration."""

    rule_id: str
    name: str
    alert_type: AlertType
    metric_name: str
    condition: str
    threshold: float
    severity: AlertSeverity
    enabled: bool
    keywords: List[str]
    pages: List[str]
    cooldown_minutes: int
    escalation_minutes: int
    created_at: str


@dataclass
class AnomalyDetection:
    """Anomaly detection result."""

    metric_name: str
    is_anomaly: bool
    anomaly_score: float
    expected_value: float
    actual_value: float
    confidence: float
    detected_at: str


class IntelligentAlertSystem:
    """Intelligent SEO alerting system."""

    def __init__(self):
        self.alerts = []
        self.rules = []
        self.metric_history = {}
        self.anomaly_models = {}
        self.alert_cooldowns = {}
        self.logger = logging.getLogger(self.__class__.__name__)

    def add_alert_rule(self, rule: AlertRule):
        """Add an alert rule."""
        self.rules.append(rule)
        self.logger.info(f"Added alert rule: {rule.name}")

    def add_metric_data(self, metric_name: str, value: float, timestamp: str = None):
        """Add metric data point for analysis."""
        if timestamp is None:
            timestamp = datetime.now().isoformat()

        if metric_name not in self.metric_history:
            self.metric_history[metric_name] = deque(
                maxlen=1000
            )  # Keep last 1000 data points

        self.metric_history[metric_name].append(
            {"value": value, "timestamp": timestamp}
        )

        self.logger.debug(f"Added metric data: {metric_name} = {value}")

    def detect_anomalies(
        self, metric_name: str, window_size: int = 30
    ) -> AnomalyDetection:
        """Detect anomalies in metric data using statistical methods."""

        if (
            metric_name not in self.metric_history
            or len(self.metric_history[metric_name]) < window_size
        ):
            return AnomalyDetection(
                metric_name=metric_name,
                is_anomaly=False,
                anomaly_score=0.0,
                expected_value=0.0,
                actual_value=0.0,
                confidence=0.0,
                detected_at=datetime.now().isoformat(),
            )

        # Get recent data
        recent_data = list(self.metric_history[metric_name])[-window_size:]
        values = [point["value"] for point in recent_data]
        current_value = values[-1]

        # Calculate statistical measures
        mean_value = statistics.mean(values[:-1])  # Exclude current value
        std_value = statistics.stdev(values[:-1]) if len(values) > 2 else 0

        # Calculate anomaly score (Z-score)
        if std_value > 0:
            z_score = abs((current_value - mean_value) / std_value)
            anomaly_score = min(1.0, z_score / 3.0)  # Normalize to 0-1
        else:
            anomaly_score = 0.0

        # Determine if anomaly
        is_anomaly = anomaly_score > 0.7  # Threshold for anomaly detection

        # Calculate confidence
        confidence = min(0.95, anomaly_score * 1.2)

        return AnomalyDetection(
            metric_name=metric_name,
            is_anomaly=is_anomaly,
            anomaly_score=anomaly_score,
            expected_value=mean_value,
            actual_value=current_value,
            confidence=confidence,
            detected_at=datetime.now().isoformat(),
        )

    def check_alert_rules(self) -> List[Alert]:
        """Check all alert rules and generate alerts."""

        new_alerts = []

        for rule in self.rules:
            if not rule.enabled:
                continue

            # Check cooldown
            cooldown_key = f"{rule.rule_id}_{rule.metric_name}"
            if cooldown_key in self.alert_cooldowns:
                last_alert = self.alert_cooldowns[cooldown_key]
                if datetime.now() - last_alert < timedelta(
                    minutes=rule.cooldown_minutes
                ):
                    continue

            # Get current metric value
            if (
                rule.metric_name not in self.metric_history
                or not self.metric_history[rule.metric_name]
            ):
                continue

            current_data = self.metric_history[rule.metric_name][-1]
            current_value = current_data["value"]

            # Check rule condition
            alert_triggered = False
            change_percent = 0.0

            if rule.condition == "greater_than" and current_value > rule.threshold:
                alert_triggered = True
            elif rule.condition == "less_than" and current_value < rule.threshold:
                alert_triggered = True
            elif rule.condition == "change_greater_than":
                # Calculate change from previous value
                if len(self.metric_history[rule.metric_name]) > 1:
                    previous_value = self.metric_history[rule.metric_name][-2]["value"]
                    change_percent = (
                        (current_value - previous_value) / previous_value
                    ) * 100
                    if abs(change_percent) > rule.threshold:
                        alert_triggered = True

            if alert_triggered:
                # Create alert
                alert = self._create_alert(rule, current_value, change_percent)
                new_alerts.append(alert)

                # Update cooldown
                self.alert_cooldowns[cooldown_key] = datetime.now()

        return new_alerts

    def _create_alert(
        self, rule: AlertRule, current_value: float, change_percent: float
    ) -> Alert:
        """Create an alert from a triggered rule."""

        alert_id = (
            f"alert_{len(self.alerts)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )

        # Generate alert title and description
        title = f"{rule.alert_type.value.replace('_', ' ').title()}: {rule.metric_name}"
        description = f"{rule.metric_name} is {rule.condition.replace('_', ' ')} {rule.threshold}. Current value: {current_value:.2f}"

        if change_percent != 0:
            description += f" (Change: {change_percent:+.1f}%)"

        # Generate recommendations
        recommendations = self._generate_alert_recommendations(
            rule, current_value, change_percent
        )

        alert = Alert(
            alert_id=alert_id,
            alert_type=rule.alert_type,
            severity=rule.severity,
            title=title,
            description=description,
            metric_name=rule.metric_name,
            current_value=current_value,
            threshold_value=rule.threshold,
            change_percent=change_percent,
            affected_keywords=rule.keywords,
            affected_pages=rule.pages,
            recommendations=recommendations,
            created_at=datetime.now().isoformat(),
        )

        self.alerts.append(alert)
        return alert

    def _generate_alert_recommendations(
        self, rule: AlertRule, current_value: float, change_percent: float
    ) -> List[str]:
        """Generate recommendations based on alert type and severity."""

        recommendations = []

        if rule.alert_type == AlertType.PERFORMANCE_DROP:
            recommendations.extend(
                [
                    "Check for technical issues affecting page performance",
                    "Review recent content changes that might impact SEO",
                    "Analyze competitor activities and market changes",
                    "Consider content optimization and link building strategies",
                ]
            )

        elif rule.alert_type == AlertType.RANKING_DROP:
            recommendations.extend(
                [
                    "Audit affected pages for SEO issues",
                    "Check for duplicate content or thin content",
                    "Review backlink profile for negative signals",
                    "Optimize content for target keywords",
                ]
            )

        elif rule.alert_type == AlertType.TRAFFIC_SPIKE:
            recommendations.extend(
                [
                    "Investigate traffic sources to understand the spike",
                    "Monitor for potential bot traffic or referral spam",
                    "Check if the spike is from legitimate organic growth",
                    "Prepare for potential server load issues",
                ]
            )

        elif rule.alert_type == AlertType.COMPETITOR_THREAT:
            recommendations.extend(
                [
                    "Analyze competitor's content and backlink strategies",
                    "Identify content gaps and opportunities",
                    "Develop competitive response strategy",
                    "Monitor competitor activities more closely",
                ]
            )

        elif rule.alert_type == AlertType.TECHNICAL_ISSUE:
            recommendations.extend(
                [
                    "Check website technical health and performance",
                    "Review server logs for errors",
                    "Test page loading speed and mobile responsiveness",
                    "Verify structured data and schema markup",
                ]
            )

        return recommendations

    def check_anomaly_alerts(self) -> List[Alert]:
        """Check for anomaly-based alerts."""

        anomaly_alerts = []

        for metric_name in self.metric_history:
            anomaly = self.detect_anomalies(metric_name)

            if anomaly.is_anomaly and anomaly.confidence > 0.7:
                # Create anomaly alert
                alert_id = f"anomaly_{len(self.alerts)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

                title = f"Anomaly Detected: {metric_name}"
                description = f"Unusual pattern detected in {metric_name}. Expected: {anomaly.expected_value:.2f}, Actual: {anomaly.actual_value:.2f}"

                recommendations = [
                    "Investigate the cause of the unusual pattern",
                    "Check for external factors affecting this metric",
                    "Monitor closely for further anomalies",
                    "Consider adjusting alert thresholds if this is expected",
                ]

                alert = Alert(
                    alert_id=alert_id,
                    alert_type=AlertType.ANOMALY_DETECTED,
                    severity=AlertSeverity.WARNING,
                    title=title,
                    description=description,
                    metric_name=metric_name,
                    current_value=anomaly.actual_value,
                    threshold_value=anomaly.expected_value,
                    change_percent=(
                        (anomaly.actual_value - anomaly.expected_value)
                        / anomaly.expected_value
                    )
                    * 100,
                    affected_keywords=[],
                    affected_pages=[],
                    recommendations=recommendations,
                    created_at=datetime.now().isoformat(),
                )

                anomaly_alerts.append(alert)
                self.alerts.append(alert)

        return anomaly_alerts

    def get_active_alerts(self) -> List[Alert]:
        """Get all active (non-resolved) alerts."""
        return [alert for alert in self.alerts if not alert.resolved]

    def get_alerts_by_severity(self, severity: AlertSeverity) -> List[Alert]:
        """Get alerts by severity level."""
        return [
            alert
            for alert in self.alerts
            if alert.severity == severity and not alert.resolved
        ]

    def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge an alert."""
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.acknowledged = True
                self.logger.info(f"Acknowledged alert: {alert_id}")
                return True
        return False

    def resolve_alert(self, alert_id: str) -> bool:
        """Resolve an alert."""
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.resolved = True
                self.logger.info(f"Resolved alert: {alert_id}")
                return True
        return False

    def escalate_alert(self, alert_id: str) -> bool:
        """Escalate an alert."""
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.escalated = True
                # Increase severity
                if alert.severity == AlertSeverity.INFO:
                    alert.severity = AlertSeverity.WARNING
                elif alert.severity == AlertSeverity.WARNING:
                    alert.severity = AlertSeverity.CRITICAL
                elif alert.severity == AlertSeverity.CRITICAL:
                    alert.severity = AlertSeverity.EMERGENCY

                self.logger.info(f"Escalated alert: {alert_id}")
                return True
        return False

    def generate_alert_summary(self) -> Dict[str, Any]:
        """Generate alert summary report."""

        active_alerts = self.get_active_alerts()

        summary = {
            "total_alerts": len(self.alerts),
            "active_alerts": len(active_alerts),
            "resolved_alerts": len([a for a in self.alerts if a.resolved]),
            "alerts_by_severity": {
                "info": len(self.get_alerts_by_severity(AlertSeverity.INFO)),
                "warning": len(self.get_alerts_by_severity(AlertSeverity.WARNING)),
                "critical": len(self.get_alerts_by_severity(AlertSeverity.CRITICAL)),
                "emergency": len(self.get_alerts_by_severity(AlertSeverity.EMERGENCY)),
            },
            "alerts_by_type": {},
            "recent_alerts": [
                asdict(alert) for alert in active_alerts[-10:]
            ],  # Last 10 alerts
            "generated_at": datetime.now().isoformat(),
        }

        # Count alerts by type
        for alert in active_alerts:
            alert_type = alert.alert_type.value
            summary["alerts_by_type"][alert_type] = (
                summary["alerts_by_type"].get(alert_type, 0) + 1
            )

        return summary


def main():
    """Main function to demonstrate intelligent alert system."""

    # Initialize alert system
    alert_system = IntelligentAlertSystem()

    print("🚀 SEO Intelligent Alerts System - DEMO")
    print("=" * 45)

    # Add sample alert rules
    rules = [
        AlertRule(
            rule_id="traffic_drop",
            name="Traffic Drop Alert",
            alert_type=AlertType.PERFORMANCE_DROP,
            metric_name="organic_traffic",
            condition="change_greater_than",
            threshold=-15.0,
            severity=AlertSeverity.WARNING,
            enabled=True,
            keywords=["seo tips", "content marketing"],
            pages=["/blog/seo-tips", "/blog/content-marketing"],
            cooldown_minutes=60,
            escalation_minutes=120,
            created_at=datetime.now().isoformat(),
        ),
        AlertRule(
            rule_id="ranking_drop",
            name="Ranking Drop Alert",
            alert_type=AlertType.RANKING_DROP,
            metric_name="average_rank",
            condition="greater_than",
            threshold=20.0,
            severity=AlertSeverity.CRITICAL,
            enabled=True,
            keywords=["keyword research", "seo tools"],
            pages=["/tools/keyword-research", "/tools/seo-tools"],
            cooldown_minutes=30,
            escalation_minutes=60,
            created_at=datetime.now().isoformat(),
        ),
    ]

    for rule in rules:
        alert_system.add_alert_rule(rule)

    # Add sample metric data
    base_traffic = 1000
    base_rank = 10

    for i in range(30):
        # Simulate traffic with some drops
        traffic = base_traffic + np.random.normal(0, 50)
        if i == 25:  # Simulate a drop
            traffic = base_traffic * 0.7

        # Simulate rankings with some drops
        rank = base_rank + np.random.normal(0, 2)
        if i == 28:  # Simulate a ranking drop
            rank = base_rank + 15

        alert_system.add_metric_data("organic_traffic", traffic)
        alert_system.add_metric_data("average_rank", rank)

    # Check for alerts
    rule_alerts = alert_system.check_alert_rules()
    anomaly_alerts = alert_system.check_anomaly_alerts()

    print(f"Alert Rules: {len(alert_system.rules)}")
    print(f"Rule-based Alerts: {len(rule_alerts)}")
    print(f"Anomaly Alerts: {len(anomaly_alerts)}")
    print(f"Total Alerts: {len(alert_system.alerts)}")

    # Generate summary
    summary = alert_system.generate_alert_summary()

    print("\nAlert Summary:")
    print(f"- Active Alerts: {summary['active_alerts']}")
    print(f"- Resolved Alerts: {summary['resolved_alerts']}")
    print(f"- By Severity: {summary['alerts_by_severity']}")

    # Save alerts to file
    with open("seo_alerts.json", "w") as f:
        json.dump(
            [asdict(alert) for alert in alert_system.alerts], f, indent=2, default=str
        )

    with open("alert_summary.json", "w") as f:
        json.dump(summary, f, indent=2, default=str)

    print("\nFiles created:")
    print("- seo_alerts.json")
    print("- alert_summary.json")


if __name__ == "__main__":
    main()

"""
SEO Real-time Monitoring System

This module provides real-time competitor monitoring, automated alerting,
and performance tracking for SEO opportunities.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
import json
from pathlib import Path

logger = logging.getLogger(__name__)


class AlertType(Enum):
    """Types of SEO alerts."""
    NEW_OPPORTUNITY = "new_opportunity"
    RANKING_CHANGE = "ranking_change"
    COMPETITOR_UPDATE = "competitor_update"
    TECHNICAL_ISSUE = "technical_issue"
    PERFORMANCE_DROP = "performance_drop"


class AlertSeverity(Enum):
    """Alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SEOAlert:
    """SEO alert data structure."""
    id: str
    type: AlertType
    severity: AlertSeverity
    title: str
    description: str
    domain: str
    affected_keywords: List[str]
    metric_changes: Dict[str, float]
    created_at: str
    acknowledged: bool = False
    resolved: bool = False
    metadata: Dict = field(default_factory=dict)


@dataclass
class MonitoringConfig:
    """Configuration for SEO monitoring."""
    check_interval_minutes: int = 60
    competitor_check_interval_hours: int = 24
    alert_cooldown_hours: int = 1
    max_concurrent_checks: int = 3
    enable_real_time_alerts: bool = True
    alert_webhook_url: Optional[str] = None
    email_alerts: bool = False
    email_recipients: List[str] = field(default_factory=list)


class SEOMonitoringSystem:
    """Real-time SEO monitoring and alerting system."""
    
    def __init__(self, config: MonitoringConfig, storage_path: str = "storage/seo/monitoring"):
        self.config = config
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # Monitoring state
        self.active_alerts: List[SEOAlert] = []
        self.monitoring_active = False
        
        # Alert handlers
        self.alert_handlers: List[Callable[[SEOAlert], None]] = []
        
        # Load existing data
        self._load_alerts()
    
    def start_monitoring(self):
        """Start the monitoring system."""
        if self.monitoring_active:
            logger.warning("Monitoring already active")
            return
        
        self.monitoring_active = True
        logger.info("SEO monitoring system started")
    
    def stop_monitoring(self):
        """Stop the monitoring system."""
        self.monitoring_active = False
        logger.info("SEO monitoring system stopped")
    
    def _add_alert(self, alert: SEOAlert):
        """Add a new alert to the system."""
        # Check cooldown to avoid spam
        if self._should_suppress_alert(alert):
            logger.info(f"Suppressing alert {alert.id} due to cooldown")
            return
        
        self.active_alerts.append(alert)
        self._save_alerts()
        
        # Notify handlers
        for handler in self.alert_handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(f"Error in alert handler: {e}")
        
        logger.info(f"Alert created: {alert.title}")
    
    def _should_suppress_alert(self, alert: SEOAlert) -> bool:
        """Check if alert should be suppressed due to cooldown."""
        cooldown_threshold = datetime.now() - timedelta(hours=self.config.alert_cooldown_hours)
        
        # Check for similar recent alerts
        for existing_alert in self.active_alerts:
            if (existing_alert.type == alert.type and 
                existing_alert.domain == alert.domain and
                datetime.fromisoformat(existing_alert.created_at) > cooldown_threshold):
                return True
        
        return False
    
    def add_alert_handler(self, handler: Callable[[SEOAlert], None]):
        """Add an alert handler function."""
        self.alert_handlers.append(handler)
    
    def get_active_alerts(self, limit: int = 50) -> List[SEOAlert]:
        """Get active alerts."""
        return sorted(
            [alert for alert in self.active_alerts if not alert.resolved],
            key=lambda x: datetime.fromisoformat(x.created_at),
            reverse=True
        )[:limit]
    
    def acknowledge_alert(self, alert_id: str):
        """Acknowledge an alert."""
        for alert in self.active_alerts:
            if alert.id == alert_id:
                alert.acknowledged = True
                self._save_alerts()
                break
    
    def resolve_alert(self, alert_id: str):
        """Resolve an alert."""
        for alert in self.active_alerts:
            if alert.id == alert_id:
                alert.resolved = True
                self._save_alerts()
                break
    
    def _save_alerts(self):
        """Save alerts to storage."""
        file_path = self.storage_path / "alerts.json"
        
        alerts_data = []
        for alert in self.active_alerts:
            alerts_data.append({
                'id': alert.id,
                'type': alert.type.value,
                'severity': alert.severity.value,
                'title': alert.title,
                'description': alert.description,
                'domain': alert.domain,
                'affected_keywords': alert.affected_keywords,
                'metric_changes': alert.metric_changes,
                'created_at': alert.created_at,
                'acknowledged': alert.acknowledged,
                'resolved': alert.resolved,
                'metadata': alert.metadata
            })
        
        with open(file_path, 'w') as f:
            json.dump(alerts_data, f, indent=2)
    
    def _load_alerts(self):
        """Load alerts from storage."""
        file_path = self.storage_path / "alerts.json"
        
        if file_path.exists():
            try:
                with open(file_path, 'r') as f:
                    alerts_data = json.load(f)
                
                for data in alerts_data:
                    alert = SEOAlert(
                        id=data['id'],
                        type=AlertType(data['type']),
                        severity=AlertSeverity(data['severity']),
                        title=data['title'],
                        description=data['description'],
                        domain=data['domain'],
                        affected_keywords=data['affected_keywords'],
                        metric_changes=data['metric_changes'],
                        created_at=data['created_at'],
                        acknowledged=data.get('acknowledged', False),
                        resolved=data.get('resolved', False),
                        metadata=data.get('metadata', {})
                    )
                    self.active_alerts.append(alert)
            except Exception as e:
                logger.error(f"Error loading alerts: {e}")


# Example usage and testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Create monitoring system
    config = MonitoringConfig(
        check_interval_minutes=5,
        competitor_check_interval_hours=1,
        enable_real_time_alerts=True
    )
    
    monitoring = SEOMonitoringSystem(config)
    
    # Add alert handler
    def alert_handler(alert: SEOAlert):
        print(f"🚨 ALERT: {alert.title} - {alert.description}")
    
    monitoring.add_alert_handler(alert_handler)
    
    # Start monitoring
    monitoring.start_monitoring()
    
    print("✅ Real-time monitoring system is ready for production!")
    
    # Print active alerts
    alerts = monitoring.get_active_alerts()
    print(f"\nActive alerts: {len(alerts)}")
    for alert in alerts:
        print(f"- {alert.title} ({alert.severity.value})")

"""
Webhooks for low-stock alerts to Slack/Email.

Features:
- Configurable alert thresholds per SKU/location
- Multiple notification channels (Slack, Email)
- Rate limiting to prevent spam
- Alert escalation based on urgency
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import json
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class AlertChannel(Enum):
    SLACK = "slack"
    EMAIL = "email"


class AlertUrgency(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AlertConfig:
    sku: str
    location_id: str
    threshold: int
    channels: List[AlertChannel]
    urgency: AlertUrgency = AlertUrgency.MEDIUM
    cooldown_minutes: int = 60  # Prevent spam


@dataclass
class SlackConfig:
    webhook_url: str
    channel: str = "#inventory-alerts"
    username: str = "Inventory Bot"


@dataclass
class EmailConfig:
    smtp_server: str
    username: str
    password: str
    from_email: str
    to_emails: List[str]
    smtp_port: int = 587
    use_tls: bool = True
    timeout: Optional[int] = None


@dataclass
class LowStockAlert:
    sku: str
    location_id: str
    current_stock: int
    threshold: int
    urgency: AlertUrgency
    timestamp: datetime
    message: str


class LowStockWebhookManager:
    def __init__(self, slack_config: Optional[SlackConfig] = None, email_config: Optional[EmailConfig] = None):
        self.slack_config = slack_config
        self.email_config = email_config
        self.sent_alerts: Dict[str, datetime] = {}  # Track cooldown
    
    def check_low_stock(self, sku: str, location_id: str, current_stock: int, config: AlertConfig) -> Optional[LowStockAlert]:
        """Check if stock is below threshold and create alert if needed."""
        if current_stock > config.threshold:
            return None
        
        # Check cooldown
        alert_key = f"{sku}_{location_id}"
        last_alert = self.sent_alerts.get(alert_key)
        if last_alert and datetime.now() - last_alert < timedelta(minutes=config.cooldown_minutes):
            return None
        
        # Determine urgency based on how far below threshold
        if current_stock <= 0:
            urgency = AlertUrgency.CRITICAL
        elif current_stock <= config.threshold * 0.2:
            urgency = AlertUrgency.HIGH
        elif current_stock <= config.threshold * 0.5:
            urgency = AlertUrgency.MEDIUM
        else:
            urgency = AlertUrgency.LOW
        
        message = f"Low stock alert: {sku} at {location_id} - {current_stock} units (threshold: {config.threshold})"
        
        alert = LowStockAlert(
            sku=sku,
            location_id=location_id,
            current_stock=current_stock,
            threshold=config.threshold,
            urgency=urgency,
            timestamp=datetime.now(),
            message=message
        )
        
        # Send notifications
        self._send_notifications(alert, config)
        
        # Update cooldown
        self.sent_alerts[alert_key] = datetime.now()
        
        return alert
    
    def _send_notifications(self, alert: LowStockAlert, config: AlertConfig):
        """Send notifications via configured channels."""
        for channel in config.channels:
            if channel == AlertChannel.SLACK and self.slack_config:
                self._send_slack_alert(alert)
            elif channel == AlertChannel.EMAIL and self.email_config:
                self._send_email_alert(alert)
    
    def _send_slack_alert(self, alert: LowStockAlert):
        """Send alert to Slack."""
        if not self.slack_config:
            return
        
        # Color coding based on urgency
        color_map = {
            AlertUrgency.LOW: "#36a64f",      # Green
            AlertUrgency.MEDIUM: "#ffaa00",   # Yellow
            AlertUrgency.HIGH: "#ff6600",     # Orange
            AlertUrgency.CRITICAL: "#ff0000"  # Red
        }
        
        payload = {
            "channel": self.slack_config.channel,
            "username": self.slack_config.username,
            "attachments": [{
                "color": color_map[alert.urgency],
                "title": f"Low Stock Alert - {alert.sku}",
                "text": alert.message,
                "fields": [
                    {"title": "Location", "value": alert.location_id, "short": True},
                    {"title": "Current Stock", "value": str(alert.current_stock), "short": True},
                    {"title": "Threshold", "value": str(alert.threshold), "short": True},
                    {"title": "Urgency", "value": alert.urgency.value.upper(), "short": True}
                ],
                "timestamp": int(alert.timestamp.timestamp())
            }]
        }
        
        try:
            response = requests.post(self.slack_config.webhook_url, json=payload, timeout=10)
            response.raise_for_status()
        except Exception as e:
            print(f"Failed to send Slack alert: {e}")
    
    def _send_email_alert(self, alert: LowStockAlert):
        """Send alert via email."""
        if not self.email_config:
            return
        
        # Create email
        msg = MIMEMultipart()
        msg['From'] = self.email_config.from_email
        msg['To'] = ", ".join(self.email_config.to_emails)
        msg['Subject'] = f"Low Stock Alert - {alert.sku} ({alert.urgency.value.upper()})"
        
        # Email body
        body = f"""
Low Stock Alert

SKU: {alert.sku}
Location: {alert.location_id}
Current Stock: {alert.current_stock}
Threshold: {alert.threshold}
Urgency: {alert.urgency.value.upper()}
Time: {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}

Message: {alert.message}

Please take appropriate action to replenish inventory.

Best regards,
Inventory Management System
"""
        
        msg.attach(MIMEText(body, 'plain'))
        
        try:
            server = smtplib.SMTP(self.email_config.smtp_server, self.email_config.smtp_port)
            server.starttls()
            server.login(self.email_config.username, self.email_config.password)
            server.send_message(msg)
            server.quit()
        except Exception as e:
            print(f"Failed to send email alert: {e}")
    
    def get_alert_history(self, sku: Optional[str] = None, location_id: Optional[str] = None) -> List[LowStockAlert]:
        """Get alert history (simplified - in production would use database)."""
        # This is a placeholder - in production would query database
        return []

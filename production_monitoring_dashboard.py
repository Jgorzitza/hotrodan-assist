#!/usr/bin/env python3
"""
Production Monitoring Dashboard
Real-time monitoring and alerting for inventory optimization system
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any
import psutil
import requests
from dataclasses import dataclass, asdict

@dataclass
class SystemMetric:
    timestamp: str
    metric_name: str
    value: float
    unit: str
    status: str  # 'healthy', 'warning', 'critical'

@dataclass
class Alert:
    alert_id: str
    severity: str  # 'info', 'warning', 'critical'
    message: str
    timestamp: str
    resolved: bool = False

class ProductionMonitor:
    """
    Production monitoring and alerting system
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.metrics_history = []
        self.alerts = []
        self.alert_thresholds = {
            'cpu_usage': 80.0,
            'memory_usage': 85.0,
            'disk_usage': 90.0,
            'response_time': 5.0,
            'error_rate': 5.0,
            'forecast_accuracy': 0.7,
            'processing_speed': 1000.0
        }
    
    async def start_monitoring(self):
        """Start continuous monitoring"""
        print("🚀 Starting Production Monitoring Dashboard")
        print("=" * 50)
        
        while True:
            try:
                # Collect system metrics
                metrics = await self.collect_system_metrics()
                
                # Check for alerts
                await self.check_alerts(metrics)
                
                # Display dashboard
                self.display_dashboard(metrics)
                
                # Wait before next check
                await asyncio.sleep(self.config.get('monitoring_interval', 30))
                
            except KeyboardInterrupt:
                print("\n🛑 Monitoring stopped by user")
                break
            except Exception as e:
                print(f"❌ Monitoring error: {e}")
                await asyncio.sleep(5)
    
    async def collect_system_metrics(self) -> List[SystemMetric]:
        """Collect comprehensive system metrics"""
        metrics = []
        current_time = datetime.now().isoformat()
        
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        metrics.extend([
            SystemMetric(current_time, 'cpu_usage', cpu_percent, '%', self._get_status(cpu_percent, 'cpu_usage')),
            SystemMetric(current_time, 'memory_usage', memory.percent, '%', self._get_status(memory.percent, 'memory_usage')),
            SystemMetric(current_time, 'disk_usage', disk.percent, '%', self._get_status(disk.percent, 'disk_usage')),
            SystemMetric(current_time, 'memory_available', memory.available / (1024**3), 'GB', 'healthy'),
            SystemMetric(current_time, 'disk_free', disk.free / (1024**3), 'GB', 'healthy')
        ])
        
        # Application metrics
        app_metrics = await self.collect_application_metrics()
        metrics.extend(app_metrics)
        
        # Store metrics history
        self.metrics_history.extend(metrics)
        
        # Keep only last 1000 metrics
        if len(self.metrics_history) > 1000:
            self.metrics_history = self.metrics_history[-1000:]
        
        return metrics
    
    async def collect_application_metrics(self) -> List[SystemMetric]:
        """Collect application-specific metrics"""
        metrics = []
        current_time = datetime.now().isoformat()
        
        try:
            # Check API health
            response = requests.get(f"{self.config['api_base_url']}/health", timeout=5)
            api_healthy = response.status_code == 200
            
            metrics.append(SystemMetric(
                current_time, 'api_health', 1 if api_healthy else 0, 'boolean',
                'healthy' if api_healthy else 'critical'
            ))
            
            if api_healthy:
                # Get performance metrics
                perf_response = requests.get(f"{self.config['api_base_url']}/metrics", timeout=5)
                if perf_response.status_code == 200:
                    perf_data = perf_response.json()
                    
                    metrics.extend([
                        SystemMetric(
                            current_time, 'forecast_accuracy', 
                            perf_data.get('forecast_accuracy', 0), '%',
                            self._get_status(perf_data.get('forecast_accuracy', 0), 'forecast_accuracy')
                        ),
                        SystemMetric(
                            current_time, 'processing_speed',
                            perf_data.get('skus_per_second', 0), 'SKUs/sec',
                            self._get_status(perf_data.get('skus_per_second', 0), 'processing_speed')
                        ),
                        SystemMetric(
                            current_time, 'active_forecasts',
                            perf_data.get('active_forecasts', 0), 'count', 'healthy'
                        ),
                        SystemMetric(
                            current_time, 'vendor_analyses',
                            perf_data.get('vendor_analyses', 0), 'count', 'healthy'
                        )
                    ])
            
        except Exception as e:
            metrics.append(SystemMetric(
                current_time, 'api_health', 0, 'boolean', 'critical'
            ))
            print(f"⚠️  API health check failed: {e}")
        
        return metrics
    
    def _get_status(self, value: float, metric_name: str) -> str:
        """Determine status based on threshold"""
        threshold = self.alert_thresholds.get(metric_name, 0)
        
        if metric_name in ['forecast_accuracy']:
            # Higher is better
            if value >= threshold:
                return 'healthy'
            elif value >= threshold * 0.8:
                return 'warning'
            else:
                return 'critical'
        else:
            # Lower is better
            if value <= threshold:
                return 'healthy'
            elif value <= threshold * 1.2:
                return 'warning'
            else:
                return 'critical'
    
    async def check_alerts(self, metrics: List[SystemMetric]):
        """Check for alert conditions"""
        for metric in metrics:
            if metric.status == 'critical':
                await self.create_alert(
                    f"CRITICAL: {metric.metric_name} is {metric.value}{metric.unit}",
                    'critical'
                )
            elif metric.status == 'warning':
                await self.create_alert(
                    f"WARNING: {metric.metric_name} is {metric.value}{metric.unit}",
                    'warning'
                )
    
    async def create_alert(self, message: str, severity: str):
        """Create a new alert"""
        alert_id = f"alert_{int(time.time())}"
        
        # Check if similar alert already exists
        existing_alert = next(
            (a for a in self.alerts if a.message == message and not a.resolved), 
            None
        )
        
        if not existing_alert:
            alert = Alert(
                alert_id=alert_id,
                severity=severity,
                message=message,
                timestamp=datetime.now().isoformat()
            )
            self.alerts.append(alert)
            
            # Send notification
            await self.send_notification(alert)
    
    async def send_notification(self, alert: Alert):
        """Send alert notification"""
        print(f"🚨 {alert.severity.upper()}: {alert.message}")
        
        # Here you would integrate with your notification system
        # e.g., Slack, email, PagerDuty, etc.
        if self.config.get('notifications', {}).get('enabled', False):
            # Implement notification logic
            pass
    
    def display_dashboard(self, metrics: List[SystemMetric]):
        """Display real-time dashboard"""
        # Clear screen (works on most terminals)
        print('\033[2J\033[H', end='')
        
        print("📊 INVENTORY OPTIMIZATION - PRODUCTION MONITORING")
        print("=" * 60)
        print(f"🕐 Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # System Status
        print("🖥️  SYSTEM STATUS")
        print("-" * 30)
        for metric in metrics:
            if metric.metric_name in ['cpu_usage', 'memory_usage', 'disk_usage']:
                status_icon = "🟢" if metric.status == 'healthy' else "🟡" if metric.status == 'warning' else "🔴"
                print(f"{status_icon} {metric.metric_name.replace('_', ' ').title()}: {metric.value:.1f}{metric.unit}")
        print()
        
        # Application Status
        print("⚙️  APPLICATION STATUS")
        print("-" * 30)
        for metric in metrics:
            if metric.metric_name in ['api_health', 'forecast_accuracy', 'processing_speed']:
                status_icon = "🟢" if metric.status == 'healthy' else "🟡" if metric.status == 'warning' else "🔴"
                print(f"{status_icon} {metric.metric_name.replace('_', ' ').title()}: {metric.value:.1f}{metric.unit}")
        print()
        
        # Active Alerts
        active_alerts = [a for a in self.alerts if not a.resolved]
        if active_alerts:
            print("🚨 ACTIVE ALERTS")
            print("-" * 30)
            for alert in active_alerts[-5:]:  # Show last 5 alerts
                severity_icon = "🔴" if alert.severity == 'critical' else "🟡"
                print(f"{severity_icon} [{alert.severity.upper()}] {alert.message}")
            print()
        
        # Performance Summary
        print("📈 PERFORMANCE SUMMARY")
        print("-" * 30)
        
        # Calculate averages for last 10 minutes
        recent_metrics = [m for m in self.metrics_history 
                         if datetime.fromisoformat(m.timestamp) > datetime.now() - timedelta(minutes=10)]
        
        if recent_metrics:
            cpu_avg = np.mean([m.value for m in recent_metrics if m.metric_name == 'cpu_usage'])
            memory_avg = np.mean([m.value for m in recent_metrics if m.metric_name == 'memory_usage'])
            speed_avg = np.mean([m.value for m in recent_metrics if m.metric_name == 'processing_speed'])
            
            print(f"📊 Avg CPU Usage (10min): {cpu_avg:.1f}%")
            print(f"💾 Avg Memory Usage (10min): {memory_avg:.1f}%")
            print(f"⚡ Avg Processing Speed (10min): {speed_avg:.1f} SKUs/sec")
        
        print()
        print("Press Ctrl+C to stop monitoring")
        print("=" * 60)

class AlertManager:
    """Manage alerts and notifications"""
    
    def __init__(self):
        self.alerts = []
        self.notification_channels = []
    
    def add_notification_channel(self, channel):
        """Add notification channel (Slack, email, etc.)"""
        self.notification_channels.append(channel)
    
    async def send_alert(self, alert: Alert):
        """Send alert through all channels"""
        for channel in self.notification_channels:
            try:
                await channel.send(alert)
            except Exception as e:
                print(f"Failed to send alert via {channel}: {e}")
    
    def resolve_alert(self, alert_id: str):
        """Mark alert as resolved"""
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.resolved = True
                break

class SlackNotificationChannel:
    """Slack notification channel"""
    
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url
    
    async def send(self, alert: Alert):
        """Send alert to Slack"""
        payload = {
            "text": f"🚨 *{alert.severity.upper()}*: {alert.message}",
            "attachments": [{
                "color": "danger" if alert.severity == 'critical' else "warning",
                "fields": [{
                    "title": "Timestamp",
                    "value": alert.timestamp,
                    "short": True
                }]
            }]
        }
        
        try:
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            response.raise_for_status()
        except Exception as e:
            print(f"Failed to send Slack notification: {e}")

# Example usage
async def main():
    """Main monitoring loop"""
    config = {
        'api_base_url': 'http://localhost:8004',
        'monitoring_interval': 30,
        'notifications': {
            'enabled': False,
            'slack_webhook': 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        }
    }
    
    monitor = ProductionMonitor(config)
    
    # Add notification channels if configured
    if config['notifications']['enabled']:
        slack_channel = SlackNotificationChannel(config['notifications']['slack_webhook'])
        monitor.alert_manager = AlertManager()
        monitor.alert_manager.add_notification_channel(slack_channel)
    
    await monitor.start_monitoring()

if __name__ == "__main__":
    import numpy as np
    asyncio.run(main())

"""
External system integrations for inventory management.

Integrates with:
- Shopify API
- POS systems
- WMS systems
- Email/Slack notifications
- Database systems
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
import requests
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class IntegrationConfig:
    name: str
    base_url: str
    api_key: str
    timeout: int = 30
    retry_attempts: int = 3

class ShopifyIntegration:
    def __init__(self, config: IntegrationConfig):
        self.config = config
        self.headers = {
            "X-Shopify-Access-Token": config.api_key,
            "Content-Type": "application/json"
        }
    
    def get_inventory_levels(self, location_ids: List[str]) -> Dict[str, Any]:
        """Get inventory levels from Shopify."""
        try:
            url = f"{self.config.base_url}/admin/api/2023-10/inventory_levels.json"
            params = {"location_ids": ",".join(location_ids)}
            
            response = requests.get(
                url, 
                headers=self.headers, 
                params=params, 
                timeout=self.config.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            return {
                "source": "shopify",
                "timestamp": datetime.now().isoformat(),
                "levels": data.get("inventory_levels", [])
            }
        except Exception as e:
            logger.error(f"Shopify integration error: {e}")
            return {"error": str(e), "source": "shopify"}
    
    def update_inventory_level(self, inventory_item_id: str, location_id: str, available: int) -> bool:
        """Update inventory level in Shopify."""
        try:
            url = f"{self.config.base_url}/admin/api/2023-10/inventory_levels/set.json"
            payload = {
                "location_id": location_id,
                "inventory_item_id": inventory_item_id,
                "available": available
            }
            
            response = requests.post(
                url,
                headers=self.headers,
                json=payload,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Shopify update error: {e}")
            return False

class POSIntegration:
    def __init__(self, config: IntegrationConfig):
        self.config = config
        self.headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }
    
    def get_sales_data(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Get sales data from POS system."""
        try:
            url = f"{self.config.base_url}/api/v1/sales"
            params = {
                "start_date": start_date,
                "end_date": end_date
            }
            
            response = requests.get(
                url,
                headers=self.headers,
                params=params,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            return {
                "source": "pos",
                "timestamp": datetime.now().isoformat(),
                "sales": data.get("sales", [])
            }
        except Exception as e:
            logger.error(f"POS integration error: {e}")
            return {"error": str(e), "source": "pos"}

class WMSIntegration:
    def __init__(self, config: IntegrationConfig):
        self.config = config
        self.headers = {
            "X-API-Key": config.api_key,
            "Content-Type": "application/json"
        }
    
    def get_warehouse_inventory(self, warehouse_id: str) -> Dict[str, Any]:
        """Get inventory from WMS."""
        try:
            url = f"{self.config.base_url}/api/inventory/{warehouse_id}"
            
            response = requests.get(
                url,
                headers=self.headers,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            return {
                "source": "wms",
                "timestamp": datetime.now().isoformat(),
                "warehouse_id": warehouse_id,
                "inventory": data.get("items", [])
            }
        except Exception as e:
            logger.error(f"WMS integration error: {e}")
            return {"error": str(e), "source": "wms"}

class NotificationIntegration:
    def __init__(self, slack_webhook: Optional[str] = None, email_config: Optional[Dict] = None):
        self.slack_webhook = slack_webhook
        self.email_config = email_config
    
    def send_low_stock_alert(self, sku: str, location: str, current_stock: int, threshold: int) -> bool:
        """Send low stock alert via Slack and/or email."""
        success = True
        
        if self.slack_webhook:
            success &= self._send_slack_alert(sku, location, current_stock, threshold)
        
        if self.email_config:
            success &= self._send_email_alert(sku, location, current_stock, threshold)
        
        return success
    
    def _send_slack_alert(self, sku: str, location: str, current_stock: int, threshold: int) -> bool:
        """Send Slack notification."""
        try:
            payload = {
                "text": f"🚨 Low Stock Alert",
                "attachments": [{
                    "color": "danger",
                    "fields": [
                        {"title": "SKU", "value": sku, "short": True},
                        {"title": "Location", "value": location, "short": True},
                        {"title": "Current Stock", "value": str(current_stock), "short": True},
                        {"title": "Threshold", "value": str(threshold), "short": True}
                    ]
                }]
            }
            
            response = requests.post(self.slack_webhook, json=payload, timeout=10)
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Slack notification error: {e}")
            return False
    
    def _send_email_alert(self, sku: str, location: str, current_stock: int, threshold: int) -> bool:
        """Send email notification."""
        try:
            # Implementation would use smtplib
            logger.info(f"Email alert: {sku} at {location} - {current_stock}/{threshold}")
            return True
        except Exception as e:
            logger.error(f"Email notification error: {e}")
            return False

class DatabaseIntegration:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
    
    def save_inventory_snapshot(self, snapshot: Dict[str, Any]) -> bool:
        """Save inventory snapshot to database."""
        try:
            # Implementation would use appropriate database driver
            logger.info(f"Saving inventory snapshot: {len(snapshot)} items")
            return True
        except Exception as e:
            logger.error(f"Database save error: {e}")
            return False
    
    def get_historical_data(self, sku: str, days: int) -> List[Dict[str, Any]]:
        """Get historical inventory data."""
        try:
            # Implementation would query database
            logger.info(f"Getting historical data for {sku} - {days} days")
            return []
        except Exception as e:
            logger.error(f"Database query error: {e}")
            return []

class IntegrationManager:
    def __init__(self):
        self.integrations: Dict[str, Any] = {}
        self.notification = NotificationIntegration()
    
    def register_integration(self, name: str, integration: Any):
        """Register an external integration."""
        self.integrations[name] = integration
        logger.info(f"Registered integration: {name}")
    
    def sync_all_inventory(self) -> Dict[str, Any]:
        """Sync inventory from all registered systems."""
        results = {}
        
        for name, integration in self.integrations.items():
            try:
                if hasattr(integration, 'get_inventory_levels'):
                    results[name] = integration.get_inventory_levels([])
                elif hasattr(integration, 'get_warehouse_inventory'):
                    results[name] = integration.get_warehouse_inventory("default")
                else:
                    logger.warning(f"Integration {name} has no inventory method")
            except Exception as e:
                logger.error(f"Sync error for {name}: {e}")
                results[name] = {"error": str(e)}
        
        return results
    
    def send_alerts(self, alerts: List[Dict[str, Any]]) -> bool:
        """Send alerts through all notification channels."""
        success = True
        
        for alert in alerts:
            result = self.notification.send_low_stock_alert(
                alert.get("sku"),
                alert.get("location"),
                alert.get("current_stock"),
                alert.get("threshold")
            )
            success &= result
        
        return success

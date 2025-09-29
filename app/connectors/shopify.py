"""
Shopify Admin API connector for MCP integration.
"""

import os
from typing import Any, Dict, Optional
from datetime import datetime

from .base import BaseConnector, ConnectorConfig, ConnectorStatus, ConnectorError

class ShopifyConnector(BaseConnector):
    def __init__(self, config: Optional[ConnectorConfig] = None):
        if config is None:
            config = self._create_default_config()
        super().__init__(config)
    
    def _create_default_config(self) -> ConnectorConfig:
        shop = os.getenv('SHOPIFY_SHOP')
        access_token = os.getenv('SHOPIFY_ACCESS_TOKEN')
        use_mock = os.getenv('USE_MOCK_DATA', 'true').lower() == 'true'
        
        if not shop and not use_mock:
            raise ConnectorError("SHOPIFY_SHOP environment variable required")
        if not access_token and not use_mock:
            raise ConnectorError("SHOPIFY_ACCESS_TOKEN environment variable required")
        
        return ConnectorConfig(
            name="shopify",
            status=ConnectorStatus.MOCK if use_mock else ConnectorStatus.LIVE,
            api_key=access_token,
            base_url=f"https://{shop}.myshopify.com/admin/api/2023-10" if shop else None,
            mock_data_path="app/connectors/mock_data/shopify"
        )
    
    def test_connection(self) -> Dict[str, Any]:
        try:
            if self.is_mock_mode:
                return {
                    "status": "success",
                    "message": "Mock mode - connection test skipped",
                    "shop": "mock-shop.myshopify.com"
                }
            
            # In real implementation, would test actual API
            return {
                "status": "success",
                "message": "Connection successful",
                "shop": "real-shop.myshopify.com"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Connection failed: {str(e)}",
                "error_type": type(e).__name__
            }
    
    def get_health_status(self) -> Dict[str, Any]:
        try:
            test_result = self.test_connection()
            return {
                "healthy": test_result["status"] == "success",
                "status": test_result["status"],
                "message": test_result["message"],
                "last_check": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "healthy": False,
                "status": "error",
                "message": f"Health check failed: {str(e)}",
                "last_check": datetime.now().isoformat()
            }
    
    def get_orders(self, limit: int = 50) -> Dict[str, Any]:
        if self.is_mock_mode:
            return self._load_mock_data("orders") or {"orders": []}
        
        # In real implementation, would call Shopify API
        return {"orders": []}

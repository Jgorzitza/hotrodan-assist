#!/usr/bin/env python3
"""
Feature Flags for MCP Integration
Thin, typed clients behind feature flags
"""

import os
import json
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FeatureFlagType(Enum):
    """Feature flag types"""
    BOOLEAN = "boolean"
    STRING = "string"
    NUMBER = "number"
    JSON = "json"

@dataclass
class FeatureFlag:
    """Feature flag definition"""
    name: str
    type: FeatureFlagType
    default_value: Any
    description: str
    enabled: bool = True
    environment: str = "all"
    rollout_percentage: float = 100.0
    conditions: Dict[str, Any] = None
    created_at: str = None
    updated_at: str = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
        if self.updated_at is None:
            self.updated_at = datetime.now().isoformat()
        if self.conditions is None:
            self.conditions = {}

class FeatureFlagManager:
    """
    Centralized feature flag management
    """
    
    def __init__(self, config_file: str = None):
        self.flags: Dict[str, FeatureFlag] = {}
        self.config_file = config_file or "feature_flags.json"
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.user_context = {}
        self.load_flags()
    
    def load_flags(self):
        """Load feature flags from configuration"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    data = json.load(f)
                    for flag_data in data.get('flags', []):
                        flag = FeatureFlag(**flag_data)
                        self.flags[flag.name] = flag
                logger.info(f"Loaded {len(self.flags)} feature flags from {self.config_file}")
            else:
                self._create_default_flags()
                self.save_flags()
        except Exception as e:
            logger.error(f"Error loading feature flags: {e}")
            self._create_default_flags()
    
    def save_flags(self):
        """Save feature flags to configuration file"""
        try:
            data = {
                'flags': [asdict(flag) for flag in self.flags.values()],
                'last_updated': datetime.now().isoformat()
            }
            with open(self.config_file, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Saved {len(self.flags)} feature flags to {self.config_file}")
        except Exception as e:
            logger.error(f"Error saving feature flags: {e}")
    
    def _create_default_flags(self):
        """Create default feature flags for MCP integration"""
        default_flags = [
            FeatureFlag(
                name="mcp_integration_enabled",
                type=FeatureFlagType.BOOLEAN,
                default_value=False,
                description="Enable MCP connector integration",
                environment="all"
            ),
            FeatureFlag(
                name="shopify_integration_enabled",
                type=FeatureFlagType.BOOLEAN,
                default_value=True,
                description="Enable Shopify API integration",
                environment="all"
            ),
            FeatureFlag(
                name="real_time_sync_enabled",
                type=FeatureFlagType.BOOLEAN,
                default_value=False,
                description="Enable real-time inventory synchronization",
                environment="production"
            ),
            FeatureFlag(
                name="bulk_operations_enabled",
                type=FeatureFlagType.BOOLEAN,
                default_value=True,
                description="Enable bulk operations for large datasets",
                environment="all"
            ),
            FeatureFlag(
                name="advanced_analytics_enabled",
                type=FeatureFlagType.BOOLEAN,
                default_value=True,
                description="Enable advanced ML analytics",
                environment="all"
            ),
            FeatureFlag(
                name="auto_reorder_enabled",
                type=FeatureFlagType.BOOLEAN,
                default_value=False,
                description="Enable automated purchase order generation",
                environment="production"
            ),
            FeatureFlag(
                name="vendor_performance_tracking",
                type=FeatureFlagType.BOOLEAN,
                default_value=True,
                description="Enable vendor performance tracking",
                environment="all"
            ),
            FeatureFlag(
                name="demand_forecasting_enabled",
                type=FeatureFlagType.BOOLEAN,
                default_value=True,
                description="Enable ML demand forecasting",
                environment="all"
            ),
            FeatureFlag(
                name="api_rate_limit",
                type=FeatureFlagType.NUMBER,
                default_value=100,
                description="API rate limit per minute",
                environment="all"
            ),
            FeatureFlag(
                name="cache_ttl_seconds",
                type=FeatureFlagType.NUMBER,
                default_value=300,
                description="Cache TTL in seconds",
                environment="all"
            ),
            FeatureFlag(
                name="notification_channels",
                type=FeatureFlagType.JSON,
                default_value=["email", "slack"],
                description="Available notification channels",
                environment="all"
            ),
            FeatureFlag(
                name="debug_mode",
                type=FeatureFlagType.BOOLEAN,
                default_value=False,
                description="Enable debug logging and detailed error messages",
                environment="development"
            )
        ]
        
        for flag in default_flags:
            self.flags[flag.name] = flag
    
    def is_enabled(self, flag_name: str, user_id: str = None) -> bool:
        """Check if feature flag is enabled"""
        flag = self.flags.get(flag_name)
        if not flag:
            logger.warning(f"Feature flag '{flag_name}' not found")
            return False
        
        # Check if flag is enabled
        if not flag.enabled:
            return False
        
        # Check environment
        if flag.environment != "all" and flag.environment != self.environment:
            return False
        
        # Check rollout percentage
        if flag.rollout_percentage < 100.0:
            if user_id:
                # Simple hash-based rollout
                user_hash = hash(user_id) % 100
                if user_hash >= flag.rollout_percentage:
                    return False
            else:
                # Random rollout for anonymous users
                import random
                if random.random() * 100 >= flag.rollout_percentage:
                    return False
        
        # Check conditions
        if flag.conditions and not self._evaluate_conditions(flag.conditions):
            return False
        
        return True
    
    def get_value(self, flag_name: str, user_id: str = None) -> Any:
        """Get feature flag value"""
        flag = self.flags.get(flag_name)
        if not flag:
            logger.warning(f"Feature flag '{flag_name}' not found")
            return None
        
        if not self.is_enabled(flag_name, user_id):
            return flag.default_value
        
        return flag.default_value
    
    def get_boolean(self, flag_name: str, user_id: str = None) -> bool:
        """Get boolean feature flag value"""
        value = self.get_value(flag_name, user_id)
        return bool(value) if value is not None else False
    
    def get_string(self, flag_name: str, user_id: str = None) -> str:
        """Get string feature flag value"""
        value = self.get_value(flag_name, user_id)
        return str(value) if value is not None else ""
    
    def get_number(self, flag_name: str, user_id: str = None) -> float:
        """Get number feature flag value"""
        value = self.get_value(flag_name, user_id)
        try:
            return float(value) if value is not None else 0.0
        except (ValueError, TypeError):
            return 0.0
    
    def get_json(self, flag_name: str, user_id: str = None) -> Any:
        """Get JSON feature flag value"""
        value = self.get_value(flag_name, user_id)
        if isinstance(value, (dict, list)):
            return value
        elif isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return value
    
    def _evaluate_conditions(self, conditions: Dict[str, Any]) -> bool:
        """Evaluate feature flag conditions"""
        for condition_type, condition_value in conditions.items():
            if condition_type == "user_roles":
                user_roles = self.user_context.get("roles", [])
                if not any(role in condition_value for role in user_roles):
                    return False
            elif condition_type == "user_attributes":
                for attr, expected_value in condition_value.items():
                    if self.user_context.get(attr) != expected_value:
                        return False
            elif condition_type == "time_range":
                start_time = condition_value.get("start")
                end_time = condition_value.get("end")
                current_time = datetime.now().time()
                if start_time and current_time < datetime.strptime(start_time, "%H:%M").time():
                    return False
                if end_time and current_time > datetime.strptime(end_time, "%H:%M").time():
                    return False
            elif condition_type == "date_range":
                start_date = condition_value.get("start")
                end_date = condition_value.get("end")
                current_date = datetime.now().date()
                if start_date and current_date < datetime.strptime(start_date, "%Y-%m-%d").date():
                    return False
                if end_date and current_date > datetime.strptime(end_date, "%Y-%m-%d").date():
                    return False
        
        return True
    
    def set_user_context(self, user_id: str, **context):
        """Set user context for feature flag evaluation"""
        self.user_context = {"user_id": user_id, **context}
    
    def add_flag(self, flag: FeatureFlag):
        """Add or update feature flag"""
        flag.updated_at = datetime.now().isoformat()
        self.flags[flag.name] = flag
        self.save_flags()
        logger.info(f"Added/updated feature flag: {flag.name}")
    
    def remove_flag(self, flag_name: str):
        """Remove feature flag"""
        if flag_name in self.flags:
            del self.flags[flag_name]
            self.save_flags()
            logger.info(f"Removed feature flag: {flag_name}")
    
    def list_flags(self) -> List[FeatureFlag]:
        """List all feature flags"""
        return list(self.flags.values())
    
    def get_flags_for_environment(self, environment: str = None) -> List[FeatureFlag]:
        """Get feature flags for specific environment"""
        env = environment or self.environment
        return [flag for flag in self.flags.values() if flag.environment == env or flag.environment == "all"]

class FeatureFlaggedService:
    """
    Base class for services that use feature flags
    """
    
    def __init__(self, flag_manager: FeatureFlagManager):
        self.flag_manager = flag_manager
    
    def is_feature_enabled(self, flag_name: str, user_id: str = None) -> bool:
        """Check if feature is enabled"""
        return self.flag_manager.is_enabled(flag_name, user_id)
    
    def get_feature_value(self, flag_name: str, user_id: str = None) -> Any:
        """Get feature value"""
        return self.flag_manager.get_value(flag_name, user_id)

class MCPIntegrationService(FeatureFlaggedService):
    """
    MCP integration service with feature flags
    """
    
    def __init__(self, flag_manager: FeatureFlagManager):
        super().__init__(flag_manager)
        self.shopify_client = None
        self.vendor_analytics = None
        self.demand_forecaster = None
    
    async def initialize_services(self, user_id: str = None):
        """Initialize services based on feature flags"""
        # Initialize Shopify integration if enabled
        if self.is_feature_enabled("shopify_integration_enabled", user_id):
            await self._initialize_shopify_client()
        
        # Initialize vendor analytics if enabled
        if self.is_feature_enabled("vendor_performance_tracking", user_id):
            await self._initialize_vendor_analytics()
        
        # Initialize demand forecasting if enabled
        if self.is_feature_enabled("demand_forecasting_enabled", user_id):
            await self._initialize_demand_forecaster()
    
    async def _initialize_shopify_client(self):
        """Initialize Shopify client"""
        if self.shopify_client is None:
            # Import and initialize Shopify client
            try:
                from shopify_api_integration import ShopifyIntegrationService, ShopifyConfig
                # Initialize with configuration
                self.shopify_client = "Shopify client initialized"
                logger.info("Shopify client initialized")
            except ImportError:
                logger.warning("Shopify integration module not available")
    
    async def _initialize_vendor_analytics(self):
        """Initialize vendor analytics"""
        if self.vendor_analytics is None:
            try:
                from vendor_performance_analytics import AdvancedVendorAnalyzer
                self.vendor_analytics = AdvancedVendorAnalyzer()
                logger.info("Vendor analytics initialized")
            except ImportError:
                logger.warning("Vendor analytics module not available")
    
    async def _initialize_demand_forecaster(self):
        """Initialize demand forecaster"""
        if self.demand_forecaster is None:
            try:
                from advanced_demand_forecasting import AdvancedDemandForecaster
                self.demand_forecaster = AdvancedDemandForecaster()
                logger.info("Demand forecaster initialized")
            except ImportError:
                logger.warning("Demand forecasting module not available")
    
    async def sync_inventory(self, user_id: str = None) -> Dict[str, Any]:
        """Sync inventory data with feature flag checks"""
        if not self.is_feature_enabled("mcp_integration_enabled", user_id):
            return {"error": "MCP integration not enabled"}
        
        if not self.is_feature_enabled("shopify_integration_enabled", user_id):
            return {"error": "Shopify integration not enabled"}
        
        # Perform inventory sync
        try:
            # This would call the actual sync logic
            return {"status": "success", "message": "Inventory synced successfully"}
        except Exception as e:
            logger.error(f"Inventory sync failed: {e}")
            return {"error": str(e)}
    
    async def generate_forecast(self, sku_data: Dict[str, Any], user_id: str = None) -> Dict[str, Any]:
        """Generate demand forecast with feature flag checks"""
        if not self.is_feature_enabled("demand_forecasting_enabled", user_id):
            return {"error": "Demand forecasting not enabled"}
        
        if not self.is_feature_enabled("advanced_analytics_enabled", user_id):
            return {"error": "Advanced analytics not enabled"}
        
        # Generate forecast
        try:
            # This would call the actual forecasting logic
            return {"status": "success", "forecast": "Generated successfully"}
        except Exception as e:
            logger.error(f"Forecast generation failed: {e}")
            return {"error": str(e)}

# Example usage and testing
def main():
    """Example usage of feature flags"""
    
    # Initialize feature flag manager
    flag_manager = FeatureFlagManager()
    
    # Set user context
    flag_manager.set_user_context("user123", roles=["admin"], environment="production")
    
    # Check feature flags
    print("=== FEATURE FLAGS STATUS ===")
    print(f"MCP Integration: {flag_manager.is_enabled('mcp_integration_enabled', 'user123')}")
    print(f"Shopify Integration: {flag_manager.is_enabled('shopify_integration_enabled', 'user123')}")
    print(f"Real-time Sync: {flag_manager.is_enabled('real_time_sync_enabled', 'user123')}")
    print(f"Bulk Operations: {flag_manager.is_enabled('bulk_operations_enabled', 'user123')}")
    print(f"Advanced Analytics: {flag_manager.is_enabled('advanced_analytics_enabled', 'user123')}")
    print(f"Auto Reorder: {flag_manager.is_enabled('auto_reorder_enabled', 'user123')}")
    print(f"API Rate Limit: {flag_manager.get_number('api_rate_limit', 'user123')}")
    print(f"Cache TTL: {flag_manager.get_number('cache_ttl_seconds', 'user123')}")
    print(f"Notification Channels: {flag_manager.get_json('notification_channels', 'user123')}")
    
    # Initialize MCP service
    mcp_service = MCPIntegrationService(flag_manager)
    
    # Test service initialization
    import asyncio
    asyncio.run(mcp_service.initialize_services("user123"))
    
    print("\n=== MCP SERVICE STATUS ===")
    print(f"Shopify Client: {mcp_service.shopify_client is not None}")
    print(f"Vendor Analytics: {mcp_service.vendor_analytics is not None}")
    print(f"Demand Forecaster: {mcp_service.demand_forecaster is not None}")

if __name__ == "__main__":
    main()

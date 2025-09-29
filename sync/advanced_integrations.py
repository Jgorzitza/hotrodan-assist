"""
Advanced integration framework for inventory management.

Provides comprehensive integration capabilities with external systems,
APIs, and third-party services for enhanced inventory operations.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple, Callable
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import aiohttp
import json
import hashlib
import hmac
import base64
import xml.etree.ElementTree as ET
from urllib.parse import urljoin, urlparse
import logging
import time
from collections import defaultdict, deque
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IntegrationType(Enum):
    """Integration type enumeration."""
    API_REST = "API_REST"
    API_GRAPHQL = "API_GRAPHQL"
    WEBHOOK = "WEBHOOK"
    FILE_SFTP = "FILE_SFTP"
    DATABASE = "DATABASE"
    MESSAGE_QUEUE = "MESSAGE_QUEUE"
    CUSTOM = "CUSTOM"

class IntegrationStatus(Enum):
    """Integration status enumeration."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ERROR = "ERROR"
    CONNECTING = "CONNECTING"
    DISCONNECTED = "DISCONNECTED"

class DataFormat(Enum):
    """Data format enumeration."""
    JSON = "JSON"
    XML = "XML"
    CSV = "CSV"
    EDI = "EDI"
    CUSTOM = "CUSTOM"

@dataclass
class IntegrationConfig:
    """Integration configuration."""
    name: str
    type: IntegrationType
    base_url: str
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    headers: Dict[str, str] = field(default_factory=dict)
    timeout: int = 30
    retry_count: int = 3
    retry_delay: int = 5
    rate_limit: int = 100  # requests per minute
    data_format: DataFormat = DataFormat.JSON
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    enabled: bool = True

@dataclass
class IntegrationEvent:
    """Integration event data structure."""
    event_id: str
    integration_name: str
    event_type: str
    timestamp: datetime
    status: str
    data: Dict[str, Any]
    response: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    duration: Optional[float] = None

@dataclass
class DataMapping:
    """Data mapping configuration."""
    source_field: str
    target_field: str
    transformation: Optional[Callable] = None
    required: bool = True
    default_value: Any = None

class IntegrationManager:
    def __init__(self):
        self.integrations: Dict[str, IntegrationConfig] = {}
        self.event_history: deque = deque(maxlen=10000)
        self.rate_limiters: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.connection_pools: Dict[str, aiohttp.ClientSession] = {}
        self.webhook_handlers: Dict[str, Callable] = {}
        self.data_mappings: Dict[str, List[DataMapping]] = defaultdict(list)
        self.is_running = False
        self.health_check_thread = None
        
        # Initialize default integrations
        self._initialize_default_integrations()
    
    def _initialize_default_integrations(self):
        """Initialize default integration configurations."""
        default_integrations = [
            IntegrationConfig(
                name="shopify",
                type=IntegrationType.API_REST,
                base_url="https://your-shop.myshopify.com/admin/api/2023-10",
                api_key="your_api_key",
                headers={"X-Shopify-Access-Token": "your_access_token"},
                data_format=DataFormat.JSON
            ),
            IntegrationConfig(
                name="quickbooks",
                type=IntegrationType.API_REST,
                base_url="https://sandbox-quickbooks.api.intuit.com/v3",
                api_key="your_consumer_key",
                secret_key="your_consumer_secret",
                data_format=DataFormat.JSON
            ),
            IntegrationConfig(
                name="salesforce",
                type=IntegrationType.API_REST,
                base_url="https://your-instance.salesforce.com/services/data/v58.0",
                api_key="your_access_token",
                data_format=DataFormat.JSON
            ),
            IntegrationConfig(
                name="webhook_receiver",
                type=IntegrationType.WEBHOOK,
                webhook_url="https://your-domain.com/webhook/inventory",
                webhook_secret="your_webhook_secret",
                data_format=DataFormat.JSON
            )
        ]
        
        for config in default_integrations:
            self.integrations[config.name] = config
    
    def add_integration(self, config: IntegrationConfig):
        """Add or update integration configuration."""
        self.integrations[config.name] = config
        logger.info(f"Integration '{config.name}' added/updated")
    
    def remove_integration(self, name: str):
        """Remove integration configuration."""
        if name in self.integrations:
            del self.integrations[name]
            if name in self.connection_pools:
                asyncio.create_task(self.connection_pools[name].close())
                del self.connection_pools[name]
            logger.info(f"Integration '{name}' removed")
    
    def add_data_mapping(self, integration_name: str, mapping: DataMapping):
        """Add data mapping for integration."""
        self.data_mappings[integration_name].append(mapping)
        logger.info(f"Data mapping added for integration '{integration_name}'")
    
    def add_webhook_handler(self, integration_name: str, handler: Callable):
        """Add webhook handler for integration."""
        self.webhook_handlers[integration_name] = handler
        logger.info(f"Webhook handler added for integration '{integration_name}'")
    
    async def start(self):
        """Start integration manager."""
        if self.is_running:
            return
        
        self.is_running = True
        
        # Start health check thread
        self.health_check_thread = threading.Thread(
            target=self._health_check_loop,
            daemon=True
        )
        self.health_check_thread.start()
        
        # Initialize connection pools
        await self._initialize_connection_pools()
        
        logger.info("Integration manager started")
    
    async def stop(self):
        """Stop integration manager."""
        self.is_running = False
        
        # Close connection pools
        for session in self.connection_pools.values():
            await session.close()
        self.connection_pools.clear()
        
        if self.health_check_thread:
            self.health_check_thread.join(timeout=5)
        
        logger.info("Integration manager stopped")
    
    async def _initialize_connection_pools(self):
        """Initialize HTTP connection pools for integrations."""
        for name, config in self.integrations.items():
            if config.type in [IntegrationType.API_REST, IntegrationType.API_GRAPHQL, IntegrationType.WEBHOOK]:
                connector = aiohttp.TCPConnector(limit=100, limit_per_host=30)
                timeout = aiohttp.ClientTimeout(total=config.timeout)
                
                self.connection_pools[name] = aiohttp.ClientSession(
                    connector=connector,
                    timeout=timeout,
                    headers=config.headers
                )
    
    def _health_check_loop(self):
        """Health check background loop."""
        while self.is_running:
            try:
                asyncio.run(self._check_integration_health())
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Health check error: {e}")
                time.sleep(10)
    
    async def _check_integration_health(self):
        """Check health of all integrations."""
        for name, config in self.integrations.items():
            if not config.enabled:
                continue
            
            try:
                if config.type == IntegrationType.API_REST:
                    await self._check_api_health(name, config)
                elif config.type == IntegrationType.WEBHOOK:
                    await self._check_webhook_health(name, config)
            except Exception as e:
                logger.warning(f"Health check failed for {name}: {e}")
    
    async def _check_api_health(self, name: str, config: IntegrationConfig):
        """Check API integration health."""
        try:
            session = self.connection_pools.get(name)
            if not session:
                return
            
            # Try to make a simple request
            health_url = urljoin(config.base_url, "/health")
            async with session.get(health_url) as response:
                if response.status == 200:
                    logger.debug(f"Integration '{name}' is healthy")
                else:
                    logger.warning(f"Integration '{name}' health check returned {response.status}")
        except Exception as e:
            logger.warning(f"Integration '{name}' health check failed: {e}")
    
    async def _check_webhook_health(self, name: str, config: IntegrationConfig):
        """Check webhook integration health."""
        # For webhooks, we can't directly check health
        # Just log that it's configured
        logger.debug(f"Webhook integration '{name}' is configured")
    
    async def send_data(self, integration_name: str, endpoint: str, 
                       data: Dict[str, Any], method: str = "POST") -> IntegrationEvent:
        """Send data to integration."""
        if integration_name not in self.integrations:
            raise ValueError(f"Integration '{integration_name}' not found")
        
        config = self.integrations[integration_name]
        if not config.enabled:
            raise ValueError(f"Integration '{integration_name}' is disabled")
        
        # Check rate limit
        if not self._check_rate_limit(integration_name):
            raise Exception(f"Rate limit exceeded for integration '{integration_name}'")
        
        event_id = f"{integration_name}_{int(time.time() * 1000)}"
        start_time = time.time()
        
        try:
            # Transform data if mapping exists
            transformed_data = await self._transform_data(integration_name, data)
            
            # Send request
            response = await self._make_request(integration_name, endpoint, transformed_data, method)
            
            duration = time.time() - start_time
            
            event = IntegrationEvent(
                event_id=event_id,
                integration_name=integration_name,
                event_type="data_send",
                timestamp=datetime.now(),
                status="success",
                data=transformed_data,
                response=response,
                duration=duration
            )
            
            self.event_history.append(event)
            logger.info(f"Data sent to {integration_name}: {event_id}")
            
            return event
            
        except Exception as e:
            duration = time.time() - start_time
            
            event = IntegrationEvent(
                event_id=event_id,
                integration_name=integration_name,
                event_type="data_send",
                timestamp=datetime.now(),
                status="error",
                data=data,
                error=str(e),
                duration=duration
            )
            
            self.event_history.append(event)
            logger.error(f"Error sending data to {integration_name}: {e}")
            
            return event
    
    async def receive_webhook(self, integration_name: str, data: Dict[str, Any], 
                            signature: Optional[str] = None) -> IntegrationEvent:
        """Receive webhook data from integration."""
        if integration_name not in self.integrations:
            raise ValueError(f"Integration '{integration_name}' not found")
        
        config = self.integrations[integration_name]
        if not config.enabled:
            raise ValueError(f"Integration '{integration_name}' is disabled")
        
        # Verify webhook signature if secret is provided
        if config.webhook_secret and signature:
            if not self._verify_webhook_signature(data, signature, config.webhook_secret):
                raise ValueError("Invalid webhook signature")
        
        event_id = f"webhook_{integration_name}_{int(time.time() * 1000)}"
        
        try:
            # Process webhook data
            processed_data = await self._process_webhook_data(integration_name, data)
            
            # Call webhook handler if registered
            if integration_name in self.webhook_handlers:
                await self.webhook_handlers[integration_name](processed_data)
            
            event = IntegrationEvent(
                event_id=event_id,
                integration_name=integration_name,
                event_type="webhook_receive",
                timestamp=datetime.now(),
                status="success",
                data=processed_data
            )
            
            self.event_history.append(event)
            logger.info(f"Webhook received from {integration_name}: {event_id}")
            
            return event
            
        except Exception as e:
            event = IntegrationEvent(
                event_id=event_id,
                integration_name=integration_name,
                event_type="webhook_receive",
                timestamp=datetime.now(),
                status="error",
                data=data,
                error=str(e)
            )
            
            self.event_history.append(event)
            logger.error(f"Error processing webhook from {integration_name}: {e}")
            
            return event
    
    def _check_rate_limit(self, integration_name: str) -> bool:
        """Check if request is within rate limit."""
        config = self.integrations[integration_name]
        now = time.time()
        
        # Clean old requests
        cutoff_time = now - 60  # 1 minute
        requests = self.rate_limiters[integration_name]
        while requests and requests[0] < cutoff_time:
            requests.popleft()
        
        # Check if within limit
        if len(requests) >= config.rate_limit:
            return False
        
        # Add current request
        requests.append(now)
        return True
    
    async def _transform_data(self, integration_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform data using configured mappings."""
        mappings = self.data_mappings.get(integration_name, [])
        if not mappings:
            return data
        
        transformed_data = {}
        
        for mapping in mappings:
            source_value = data.get(mapping.source_field)
            
            if source_value is not None:
                if mapping.transformation:
                    try:
                        transformed_value = mapping.transformation(source_value)
                    except Exception as e:
                        logger.warning(f"Transformation failed for {mapping.source_field}: {e}")
                        transformed_value = source_value
                else:
                    transformed_value = source_value
                
                transformed_data[mapping.target_field] = transformed_value
            elif mapping.required and mapping.default_value is not None:
                transformed_data[mapping.target_field] = mapping.default_value
            elif mapping.required:
                logger.warning(f"Required field {mapping.source_field} not found")
        
        return transformed_data
    
    async def _make_request(self, integration_name: str, endpoint: str, 
                          data: Dict[str, Any], method: str) -> Dict[str, Any]:
        """Make HTTP request to integration."""
        config = self.integrations[integration_name]
        session = self.connection_pools.get(integration_name)
        
        if not session:
            raise Exception(f"No connection pool for integration '{integration_name}'")
        
        url = urljoin(config.base_url, endpoint)
        
        # Prepare request data
        if config.data_format == DataFormat.JSON:
            request_data = json.dumps(data)
            headers = {"Content-Type": "application/json"}
        elif config.data_format == DataFormat.XML:
            request_data = self._dict_to_xml(data)
            headers = {"Content-Type": "application/xml"}
        else:
            request_data = data
            headers = {}
        
        # Add authentication
        if config.api_key:
            if "Authorization" not in headers:
                headers["Authorization"] = f"Bearer {config.api_key}"
        
        # Make request with retries
        last_exception = None
        for attempt in range(config.retry_count):
            try:
                async with session.request(method, url, data=request_data, headers=headers) as response:
                    response_data = await response.json() if response.content_type == "application/json" else await response.text()
                    
                    if response.status >= 400:
                        raise Exception(f"HTTP {response.status}: {response_data}")
                    
                    return {
                        "status_code": response.status,
                        "data": response_data,
                        "headers": dict(response.headers)
                    }
                    
            except Exception as e:
                last_exception = e
                if attempt < config.retry_count - 1:
                    await asyncio.sleep(config.retry_delay)
                    continue
                else:
                    raise e
        
        raise last_exception
    
    def _dict_to_xml(self, data: Dict[str, Any], root_name: str = "root") -> str:
        """Convert dictionary to XML string."""
        root = ET.Element(root_name)
        
        def dict_to_xml(parent, data):
            for key, value in data.items():
                if isinstance(value, dict):
                    child = ET.SubElement(parent, key)
                    dict_to_xml(child, value)
                elif isinstance(value, list):
                    for item in value:
                        child = ET.SubElement(parent, key)
                        if isinstance(item, dict):
                            dict_to_xml(child, item)
                        else:
                            child.text = str(item)
                else:
                    child = ET.SubElement(parent, key)
                    child.text = str(value)
        
        dict_to_xml(root, data)
        return ET.tostring(root, encoding="unicode")
    
    def _verify_webhook_signature(self, data: Dict[str, Any], signature: str, secret: str) -> bool:
        """Verify webhook signature."""
        try:
            # Create signature
            payload = json.dumps(data, sort_keys=True)
            expected_signature = hmac.new(
                secret.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error(f"Webhook signature verification failed: {e}")
            return False
    
    async def _process_webhook_data(self, integration_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process received webhook data."""
        # Apply reverse transformation if mappings exist
        mappings = self.data_mappings.get(integration_name, [])
        if not mappings:
            return data
        
        processed_data = {}
        
        for mapping in mappings:
            # Reverse mapping
            source_value = data.get(mapping.target_field)
            if source_value is not None:
                processed_data[mapping.source_field] = source_value
        
        return processed_data
    
    def get_integration_status(self, integration_name: str) -> Dict[str, Any]:
        """Get integration status."""
        if integration_name not in self.integrations:
            return {"status": "not_found"}
        
        config = self.integrations[integration_name]
        
        # Get recent events
        recent_events = [e for e in self.event_history if e.integration_name == integration_name][-10:]
        
        # Calculate success rate
        success_count = len([e for e in recent_events if e.status == "success"])
        total_count = len(recent_events)
        success_rate = success_count / total_count if total_count > 0 else 0
        
        return {
            "name": integration_name,
            "type": config.type.value,
            "enabled": config.enabled,
            "status": "active" if config.enabled else "inactive",
            "success_rate": success_rate,
            "recent_events": len(recent_events),
            "last_event": recent_events[-1].timestamp.isoformat() if recent_events else None
        }
    
    def get_all_integrations_status(self) -> Dict[str, Any]:
        """Get status of all integrations."""
        return {
            name: self.get_integration_status(name)
            for name in self.integrations.keys()
        }
    
    def get_event_history(self, integration_name: Optional[str] = None, 
                         limit: int = 100) -> List[IntegrationEvent]:
        """Get integration event history."""
        events = list(self.event_history)
        
        if integration_name:
            events = [e for e in events if e.integration_name == integration_name]
        
        return events[-limit:]
    
    def generate_integration_report(self) -> Dict[str, Any]:
        """Generate comprehensive integration report."""
        all_events = list(self.event_history)
        
        # Calculate statistics
        total_events = len(all_events)
        success_events = len([e for e in all_events if e.status == "success"])
        error_events = len([e for e in all_events if e.status == "error"])
        
        # Group by integration
        events_by_integration = defaultdict(list)
        for event in all_events:
            events_by_integration[event.integration_name].append(event)
        
        # Calculate per-integration statistics
        integration_stats = {}
        for name, events in events_by_integration.items():
            success_count = len([e for e in events if e.status == "success"])
            total_count = len(events)
            
            integration_stats[name] = {
                "total_events": total_count,
                "success_events": success_count,
                "error_events": total_count - success_count,
                "success_rate": success_count / total_count if total_count > 0 else 0,
                "avg_duration": sum(e.duration for e in events if e.duration) / total_count if total_count > 0 else 0
            }
        
        return {
            "timestamp": datetime.now().isoformat(),
            "total_events": total_events,
            "success_events": success_events,
            "error_events": error_events,
            "overall_success_rate": success_events / total_events if total_events > 0 else 0,
            "integration_stats": integration_stats,
            "active_integrations": len([c for c in self.integrations.values() if c.enabled]),
            "total_integrations": len(self.integrations)
        }

def main():
    """Main function for testing integration manager."""
    async def test_integrations():
        manager = IntegrationManager()
        
        # Start manager
        await manager.start()
        
        # Test sending data
        test_data = {
            "sku": "TEST001",
            "quantity": 100,
            "price": 29.99
        }
        
        try:
            event = await manager.send_data("shopify", "/products.json", test_data)
            print(f"Data sent: {event.event_id} - Status: {event.status}")
        except Exception as e:
            print(f"Error sending data: {e}")
        
        # Test webhook
        webhook_data = {
            "id": "12345",
            "title": "Test Product",
            "inventory_quantity": 50
        }
        
        try:
            event = await manager.receive_webhook("webhook_receiver", webhook_data)
            print(f"Webhook received: {event.event_id} - Status: {event.status}")
        except Exception as e:
            print(f"Error receiving webhook: {e}")
        
        # Generate report
        report = manager.generate_integration_report()
        print(f"\n=== INTEGRATION REPORT ===")
        print(f"Total Events: {report['total_events']}")
        print(f"Success Rate: {report['overall_success_rate']:.2%}")
        print(f"Active Integrations: {report['active_integrations']}")
        
        # Stop manager
        await manager.stop()
    
    # Run test
    asyncio.run(test_integrations())

if __name__ == "__main__":
    main()

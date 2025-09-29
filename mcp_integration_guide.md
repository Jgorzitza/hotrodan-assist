# MCP Integration Guide for Inventory Intelligence Engineer

## Overview
This guide provides comprehensive documentation for integrating the Inventory Intelligence Engineer with MCP (Model Context Protocol) connectors. The integration is designed to be thin, typed, and feature-flagged for production use.

## Architecture

### Core Components
1. **Shopify API Integration** (`shopify_api_integration.py`)
2. **Vendor Data Mapping** (`vendor_data_mapping.py`)
3. **Error Handling & Retry Logic** (`api_error_handling.py`)
4. **Feature Flags** (`feature_flags.py`)
5. **Advanced Analytics** (existing modules)

### Integration Pattern
```
MCP Connectors → Feature Flags → Typed Clients → Data Mapping → Internal System
```

## API Integration Patterns

### 1. Shopify API Integration

#### Configuration
```python
from shopify_api_integration import ShopifyConfig, ShopifyIntegrationService

config = ShopifyConfig(
    shop_domain="your-shop",
    access_token="your-access-token",
    api_version="2024-01",
    timeout=30,
    max_retries=3,
    rate_limit_delay=0.5
)

service = ShopifyIntegrationService(config)
```

#### Key Features
- **Thin Client**: Minimal abstraction over Shopify API
- **Type Safety**: Dataclass-based data structures
- **Rate Limiting**: Built-in rate limiting and retry logic
- **Pagination**: Automatic pagination handling
- **Error Handling**: Comprehensive error classification

#### Usage Examples

**Sync Inventory Data**
```python
async with service as client:
    sync_result = await service.sync_inventory_data()
    print(f"Synced {sync_result['total_products']} products")
```

**Update Inventory Levels**
```python
updates = [
    {
        'inventory_item_id': 123456789,
        'location_id': 987654321,
        'available': 100
    }
]

update_result = await service.update_inventory_levels(updates)
```

### 2. Vendor Data Mapping

#### Supported Systems
- **Shopify**: E-commerce platform
- **WooCommerce**: WordPress e-commerce
- **Magento**: Enterprise e-commerce
- **Custom**: Generic API integration

#### Data Mapping
```python
from vendor_data_mapping import VendorDataMapper, VendorSystemRegistry

# Initialize registry
registry = VendorSystemRegistry()

# Register Shopify system
shopify_mapper = VendorDataMapper('shopify')
registry.register_system('shopify', shopify_config, shopify_mapper)

# Map products
standardized_products = registry.map_products('shopify', raw_products)
```

#### Standardized Data Structures
```python
@dataclass
class StandardizedProduct:
    id: str
    sku: str
    name: str
    price: float
    cost: float
    status: str
    vendor_id: str
    # ... other fields
```

### 3. Error Handling & Retry Logic

#### Retry Configuration
```python
from api_error_handling import RetryConfig, RetryStrategy

retry_config = RetryConfig(
    max_attempts=3,
    base_delay=1.0,
    strategy=RetryStrategy.EXPONENTIAL,
    jitter=True,
    retryable_errors=[
        ErrorType.NETWORK,
        ErrorType.TIMEOUT,
        ErrorType.RATE_LIMIT,
        ErrorType.SERVER_ERROR
    ]
)
```

#### Circuit Breaker
```python
from api_error_handling import CircuitBreaker

circuit_breaker = CircuitBreaker(
    failure_threshold=5,
    timeout=60.0
)
```

#### Robust API Client
```python
from api_error_handling import RobustAPIClient

async with RobustAPIClient(retry_config, circuit_breaker_config) as client:
    response = await client.request('GET', 'https://api.example.com/data')
```

### 4. Feature Flags

#### Configuration
```python
from feature_flags import FeatureFlagManager, FeatureFlag, FeatureFlagType

flag_manager = FeatureFlagManager()

# Check feature flags
if flag_manager.is_enabled('mcp_integration_enabled'):
    # MCP integration is enabled
    pass

if flag_manager.is_enabled('shopify_integration_enabled'):
    # Shopify integration is enabled
    pass
```

#### Available Feature Flags
- `mcp_integration_enabled`: Enable MCP connector integration
- `shopify_integration_enabled`: Enable Shopify API integration
- `real_time_sync_enabled`: Enable real-time inventory synchronization
- `bulk_operations_enabled`: Enable bulk operations for large datasets
- `advanced_analytics_enabled`: Enable advanced ML analytics
- `auto_reorder_enabled`: Enable automated purchase order generation
- `vendor_performance_tracking`: Enable vendor performance tracking
- `demand_forecasting_enabled`: Enable ML demand forecasting

## Integration Workflow

### 1. Initialization
```python
from feature_flags import FeatureFlagManager
from mcp_integration_service import MCPIntegrationService

# Initialize feature flag manager
flag_manager = FeatureFlagManager()

# Initialize MCP service
mcp_service = MCPIntegrationService(flag_manager)

# Set user context
flag_manager.set_user_context("user123", roles=["admin"])

# Initialize services based on feature flags
await mcp_service.initialize_services("user123")
```

### 2. Data Synchronization
```python
# Sync inventory data
if flag_manager.is_enabled('mcp_integration_enabled'):
    sync_result = await mcp_service.sync_inventory("user123")
    print(f"Sync result: {sync_result}")
```

### 3. Analytics Processing
```python
# Generate demand forecast
if flag_manager.is_enabled('demand_forecasting_enabled'):
    forecast_result = await mcp_service.generate_forecast(sku_data, "user123")
    print(f"Forecast result: {forecast_result}")
```

## Error Handling

### Error Types
- **Network Errors**: Connection issues, DNS failures
- **Timeout Errors**: Request timeouts
- **Rate Limit Errors**: API rate limiting (429)
- **Server Errors**: 5xx HTTP status codes
- **Client Errors**: 4xx HTTP status codes
- **Authentication Errors**: 401 Unauthorized
- **Authorization Errors**: 403 Forbidden
- **Validation Errors**: 422 Unprocessable Entity

### Retry Strategies
1. **Fixed Delay**: Constant delay between retries
2. **Linear Backoff**: Linear increase in delay
3. **Exponential Backoff**: Exponential increase in delay
4. **Custom Strategy**: Custom delay calculation

### Circuit Breaker
- **Closed**: Normal operation
- **Open**: Circuit is open, requests blocked
- **Half-Open**: Testing if service is back

## Performance Considerations

### Rate Limiting
- **Shopify API**: 2 requests per second (with burst)
- **Custom Rate Limiting**: Configurable per service
- **Jitter**: Random delay to prevent thundering herd

### Caching
- **Response Caching**: Cache API responses
- **Feature Flag Caching**: Cache feature flag values
- **TTL Configuration**: Configurable cache expiration

### Monitoring
- **Request Metrics**: Success rate, response time
- **Error Tracking**: Error counts by type
- **Health Checks**: Service health monitoring

## Security

### Authentication
- **API Keys**: Secure storage of API credentials
- **Token Management**: Automatic token refresh
- **Environment Variables**: Secure configuration

### Data Protection
- **Input Validation**: Validate all input data
- **Output Sanitization**: Sanitize output data
- **Encryption**: Encrypt sensitive data

### Access Control
- **Feature Flags**: Control feature access
- **User Context**: Role-based access control
- **Environment Isolation**: Separate environments

## Testing

### Unit Tests
```python
import pytest
from unittest.mock import Mock, patch

@pytest.mark.asyncio
async def test_shopify_integration():
    with patch('shopify_api_integration.ShopifyAPIClient') as mock_client:
        mock_client.return_value.__aenter__.return_value.get_products.return_value = {
            'products': [{'id': 1, 'title': 'Test Product'}]
        }
        
        service = ShopifyIntegrationService(config)
        result = await service.sync_inventory_data()
        
        assert result['total_products'] == 1
```

### Integration Tests
```python
@pytest.mark.asyncio
async def test_end_to_end_integration():
    flag_manager = FeatureFlagManager()
    mcp_service = MCPIntegrationService(flag_manager)
    
    # Test complete workflow
    await mcp_service.initialize_services("test_user")
    sync_result = await mcp_service.sync_inventory("test_user")
    forecast_result = await mcp_service.generate_forecast(sku_data, "test_user")
    
    assert sync_result['status'] == 'success'
    assert forecast_result['status'] == 'success'
```

## Deployment

### Environment Configuration
```bash
# Environment variables
export ENVIRONMENT=production
export SHOPIFY_SHOP_DOMAIN=your-shop
export SHOPIFY_ACCESS_TOKEN=your-token
export FEATURE_FLAGS_FILE=feature_flags.json
```

### Docker Configuration
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONPATH=/app
ENV ENVIRONMENT=production

# Run application
CMD ["python", "mcp_integration_service.py"]
```

### Health Checks
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "features": {
            "mcp_integration": flag_manager.is_enabled('mcp_integration_enabled'),
            "shopify_integration": flag_manager.is_enabled('shopify_integration_enabled')
        }
    }
```

## Monitoring and Alerting

### Metrics
- **API Response Times**: Average, P95, P99
- **Error Rates**: By error type and endpoint
- **Feature Flag Usage**: Flag evaluation counts
- **Cache Hit Rates**: Cache performance metrics

### Alerts
- **High Error Rate**: >5% error rate
- **Slow Response Time**: >2s average response time
- **Circuit Breaker Open**: Service unavailable
- **Feature Flag Changes**: Flag value changes

### Dashboards
- **API Health**: Real-time API status
- **Feature Flag Status**: Current flag values
- **Performance Metrics**: Response times and throughput
- **Error Tracking**: Error trends and patterns

## Troubleshooting

### Common Issues
1. **Authentication Failures**: Check API credentials
2. **Rate Limiting**: Implement proper backoff
3. **Timeout Errors**: Increase timeout values
4. **Data Mapping Errors**: Validate input data format
5. **Feature Flag Issues**: Check flag configuration

### Debug Mode
```python
# Enable debug mode
flag_manager.add_flag(FeatureFlag(
    name="debug_mode",
    type=FeatureFlagType.BOOLEAN,
    default_value=True,
    description="Enable debug logging",
    environment="development"
))
```

### Logging
```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if flag_manager.is_enabled('debug_mode') else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## Best Practices

### 1. Feature Flag Management
- Use descriptive flag names
- Set appropriate default values
- Implement gradual rollouts
- Monitor flag usage

### 2. Error Handling
- Implement comprehensive retry logic
- Use circuit breakers for resilience
- Log errors with context
- Monitor error rates

### 3. Performance
- Implement caching strategies
- Use connection pooling
- Monitor response times
- Optimize data mapping

### 4. Security
- Secure API credentials
- Validate all input data
- Implement proper authentication
- Use HTTPS for all communications

### 5. Testing
- Write comprehensive unit tests
- Implement integration tests
- Test error scenarios
- Validate data mapping

## Conclusion

This integration guide provides a comprehensive framework for integrating the Inventory Intelligence Engineer with MCP connectors. The system is designed to be robust, scalable, and maintainable with proper error handling, feature flags, and monitoring.

For additional support or questions, refer to the individual module documentation or contact the development team.

# Inventory Improvements System

## Overview

The Inventory Improvements System provides advanced machine learning integration, API gateway capabilities, and microservices architecture for enhanced inventory management. This system extends the core inventory functionality with intelligent automation, scalable architecture, and enterprise-grade features.

## Features

### 1. Machine Learning Integration (`sync/ml_integration.py`)

**Purpose**: Advanced ML-powered inventory intelligence and optimization

**Key Capabilities**:
- **Demand Forecasting**: Random Forest and Ridge regression models for demand prediction
- **Lead Time Prediction**: ML-based lead time estimation with supply chain factors
- **Price Optimization**: Linear regression for optimal pricing strategies
- **Anomaly Detection**: Isolation Forest for detecting unusual inventory patterns
- **Feature Engineering**: Automated feature preparation and scaling
- **Model Management**: Model training, evaluation, and persistence

**ML Models**:
- **Demand Forecast Model**: Predicts future demand using historical data, seasonality, trends, pricing, and promotions
- **Lead Time Prediction Model**: Estimates supplier lead times based on performance, quantity, seasonality, and supply chain health
- **Price Optimization Model**: Determines optimal pricing using demand, competitor prices, costs, seasonality, and inventory levels

**API Endpoints**:
- `POST /ml/train` - Train ML models
- `POST /ml/predict` - Make predictions
- `POST /ml/optimize` - ML-powered inventory optimization
- `GET /ml/report` - ML performance report
- `POST /ml/anomalies` - Detect anomalies

### 2. API Gateway (`sync/api_gateway.py`)

**Purpose**: Unified API gateway with load balancing, authentication, and rate limiting

**Key Capabilities**:
- **Load Balancing**: Round-robin load balancing with health checking
- **Circuit Breaker**: Automatic failure detection and service isolation
- **Rate Limiting**: Per-client and per-endpoint rate limiting with Redis support
- **Service Discovery**: Dynamic service registration and health monitoring
- **Request Proxying**: Transparent request forwarding to microservices
- **Authentication**: JWT-based authentication and authorization

**Gateway Features**:
- **Health Monitoring**: Continuous health checks for all services
- **Circuit Breaker**: Automatic service isolation on failures
- **Rate Limiting**: Configurable rate limits per endpoint
- **Load Balancing**: Intelligent traffic distribution
- **Service Management**: Dynamic service registration and discovery

**API Endpoints**:
- `GET /` - Gateway status and information
- `GET /health` - Gateway health check
- `GET /services` - List registered services
- `POST /services/{service_name}` - Register new service
- `GET /rate-limits` - List rate limit configurations
- `POST /rate-limits/{endpoint}` - Configure rate limits
- `/{service_name}/{path}` - Proxy requests to services

### 3. Microservices Architecture

**Purpose**: Scalable, distributed inventory management system

**Key Capabilities**:
- **Service Isolation**: Independent, deployable services
- **Horizontal Scaling**: Load balancing across multiple instances
- **Fault Tolerance**: Circuit breaker and retry mechanisms
- **Service Discovery**: Automatic service registration and discovery
- **API Gateway**: Unified entry point for all services

**Service Architecture**:
- **Inventory Service**: Core inventory management (Port 8004)
- **Analytics Service**: Business intelligence and reporting (Port 8005)
- **ML Service**: Machine learning and AI capabilities (Port 8006)
- **API Gateway**: Unified API entry point (Port 8000)

## Usage Examples

### Machine Learning Integration

```python
from sync.ml_integration import MLInventoryIntelligence
import pandas as pd
import numpy as np

# Initialize ML system
ml_system = MLInventoryIntelligence()

# Prepare training data
demand_data = pd.DataFrame({
    "historical_demand": np.random.normal(100, 20, 1000),
    "seasonality": np.sin(np.arange(1000) * 2 * np.pi / 365),
    "trend": np.arange(1000) * 0.1,
    "price": np.random.uniform(10, 100, 1000),
    "promotions": np.random.choice([0, 1], 1000, p=[0.8, 0.2]),
    "demand": np.random.normal(100, 20, 1000)
})

# Add training data
ml_system.add_training_data("demand", demand_data)

# Train model
success = ml_system.train_model("demand_forecast", "demand")
print(f"Training success: {success}")

# Make prediction
prediction = ml_system.predict("demand_forecast", {
    "historical_demand": 120,
    "seasonality": 0.5,
    "trend": 10,
    "price": 50,
    "promotions": 1
})

print(f"Predicted demand: {prediction.prediction:.2f}")
print(f"Confidence: {prediction.confidence:.2f}")

# ML-powered optimization
sku_data = {
    "historical_demand": 100,
    "seasonality": 0.5,
    "trend": 5,
    "price": 50,
    "promotions": 0,
    "supplier_performance": 0.8,
    "order_quantity": 100,
    "supply_chain_health": 0.9,
    "competitor_price": 45,
    "cost": 30,
    "inventory_level": 200,
    "holding_cost": 5,
    "ordering_cost": 50,
    "safety_stock_multiplier": 1.5
}

results = ml_system.optimize_inventory_with_ml(sku_data)
print(f"Optimal quantity: {results['optimal_quantity']:.2f}")
print(f"Reorder point: {results['reorder_point']:.2f}")

# Detect anomalies
anomalies = ml_system.detect_anomalies(demand_data, ["historical_demand", "seasonality", "trend"])
print(f"Anomalies detected: {len(anomalies)}")

# Generate ML report
report = ml_system.generate_ml_report()
print(f"Model accuracy: {report['overall_performance']['average_accuracy']:.3f}")
```

### API Gateway Usage

```python
from sync.api_gateway import APIGateway, ServiceEndpoint, RateLimit

# Initialize API gateway
gateway = APIGateway()

# Register services
gateway.add_service("inventory", ServiceEndpoint(
    name="inventory-1",
    url="http://localhost:8004",
    health_check_url="http://localhost:8004/health",
    weight=1,
    timeout=30
))

gateway.add_service("analytics", ServiceEndpoint(
    name="analytics-1",
    url="http://localhost:8005",
    health_check_url="http://localhost:8005/health",
    weight=1,
    timeout=30
))

# Configure rate limits
gateway.set_rate_limit("inventory/*", RateLimit(
    requests_per_minute=200,
    requests_per_hour=2000,
    burst_limit=50
))

gateway.set_rate_limit("analytics/*", RateLimit(
    requests_per_minute=100,
    requests_per_hour=1000,
    burst_limit=25
))

# Start gateway
import uvicorn
uvicorn.run(gateway.app, host="0.0.0.0", port=8000)
```

### Microservices Integration

```python
import requests

# Make requests through API gateway
base_url = "http://localhost:8000"

# Inventory service requests
inventory_response = requests.get(f"{base_url}/inventory/health")
print(f"Inventory health: {inventory_response.json()}")

# Analytics service requests
analytics_response = requests.get(f"{base_url}/analytics/metrics")
print(f"Analytics metrics: {analytics_response.json()}")

# ML service requests
ml_response = requests.post(f"{base_url}/ml/predict", json={
    "model_name": "demand_forecast",
    "features": {
        "historical_demand": 120,
        "seasonality": 0.5,
        "trend": 10,
        "price": 50,
        "promotions": 1
    }
})
print(f"ML prediction: {ml_response.json()}")
```

## Configuration

### Environment Variables

```bash
# ML Integration Configuration
export ML_MODEL_PATH=/models
export ML_TRAINING_DATA_PATH=/data
export ML_PREDICTION_CACHE_TTL=300
export ML_ANOMALY_THRESHOLD=0.1

# API Gateway Configuration
export GATEWAY_HOST=0.0.0.0
export GATEWAY_PORT=8000
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=your-jwt-secret-key
export GATEWAY_TIMEOUT=30

# Rate Limiting Configuration
export RATE_LIMIT_REDIS_URL=redis://localhost:6379
export RATE_LIMIT_DEFAULT_PER_MINUTE=100
export RATE_LIMIT_DEFAULT_PER_HOUR=1000

# Service Discovery Configuration
export SERVICE_REGISTRY_URL=http://localhost:8500
export HEALTH_CHECK_INTERVAL=30
export CIRCUIT_BREAKER_THRESHOLD=5
export CIRCUIT_BREAKER_TIMEOUT=60
```

### ML Model Configuration

```python
# Customize ML models
ml_system = MLInventoryIntelligence()

# Add custom model
from sklearn.ensemble import GradientBoostingRegressor

custom_model = MLModel(
    name="custom_forecast",
    model_type="regression",
    model=GradientBoostingRegressor(n_estimators=200),
    feature_columns=["feature1", "feature2", "feature3"],
    target_column="target"
)

ml_system.models["custom_forecast"] = custom_model
```

### API Gateway Configuration

```python
# Customize API gateway
gateway = APIGateway(redis_url="redis://localhost:6379")

# Add custom service
gateway.add_service("custom", ServiceEndpoint(
    name="custom-service",
    url="http://localhost:8007",
    health_check_url="http://localhost:8007/health",
    weight=2,
    timeout=60,
    retry_count=5,
    circuit_breaker_threshold=3,
    circuit_breaker_timeout=120
))

# Set custom rate limits
gateway.set_rate_limit("custom/*", RateLimit(
    requests_per_minute=500,
    requests_per_hour=5000,
    burst_limit=100
))
```

## Performance Optimization

### ML Performance

**Training Optimization**:
- Use appropriate data sizes for training
- Implement feature selection and engineering
- Use cross-validation for model evaluation
- Implement model versioning and A/B testing

**Prediction Optimization**:
- Cache frequently used predictions
- Use batch prediction for multiple items
- Implement prediction pipelines
- Monitor prediction accuracy and performance

### API Gateway Performance

**Load Balancing**:
- Configure appropriate service weights
- Monitor service health and performance
- Implement sticky sessions if needed
- Use geographic load balancing for global services

**Rate Limiting**:
- Set appropriate rate limits per service
- Use Redis for distributed rate limiting
- Implement burst handling
- Monitor rate limit violations

**Circuit Breaker**:
- Configure appropriate failure thresholds
- Set reasonable timeout values
- Implement fallback mechanisms
- Monitor circuit breaker states

## Monitoring and Alerting

### ML Model Monitoring

**Key Metrics**:
- Model accuracy and performance
- Prediction latency and throughput
- Training data quality and freshness
- Feature importance and drift

**Alerts**:
- Model accuracy below threshold
- Prediction latency above threshold
- Training data quality issues
- Feature drift detection

### API Gateway Monitoring

**Key Metrics**:
- Request latency and throughput
- Service health and availability
- Rate limit violations
- Circuit breaker activations

**Alerts**:
- Service health degradation
- High error rates
- Rate limit violations
- Circuit breaker activations

## Testing

### ML Integration Testing

```bash
# Run ML integration tests
python test_improvements.py::TestMLIntegration

# Run performance tests
python test_improvements.py::test_ml_integration_performance

# Run specific test
python -m pytest test_improvements.py::TestMLIntegration::test_train_model -v
```

### API Gateway Testing

```bash
# Run API gateway tests
python test_improvements.py::TestAPIGateway

# Run load balancer tests
python test_improvements.py::TestLoadBalancer

# Run integration tests
python test_improvements.py::test_api_gateway_integration
```

### End-to-End Testing

```bash
# Run all tests
python test_improvements.py

# Run with coverage
python -m pytest test_improvements.py --cov=sync --cov-report=html
```

## Troubleshooting

### Common Issues

1. **ML Model Training Failures**
   - Check training data quality and format
   - Verify feature columns and target variable
   - Ensure sufficient training data
   - Check for data leakage and overfitting

2. **API Gateway Connection Issues**
   - Verify service URLs and health check endpoints
   - Check network connectivity and firewall rules
   - Verify service authentication and authorization
   - Check rate limiting and circuit breaker settings

3. **Performance Issues**
   - Monitor resource usage (CPU, memory, network)
   - Check database and cache performance
   - Optimize ML model complexity
   - Review API gateway configuration

### Debug Mode

Enable debug logging for detailed troubleshooting:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Enable debug mode for ML system
ml_system.debug_mode = True

# Enable debug mode for API gateway
gateway.debug_mode = True
```

## Best Practices

### ML Integration Best Practices

1. **Data Quality**: Ensure high-quality training data
2. **Feature Engineering**: Create meaningful features
3. **Model Validation**: Use proper validation techniques
4. **Monitoring**: Continuously monitor model performance
5. **Versioning**: Implement model versioning and rollback

### API Gateway Best Practices

1. **Service Design**: Design services for failure
2. **Load Balancing**: Use appropriate load balancing strategies
3. **Rate Limiting**: Set reasonable rate limits
4. **Monitoring**: Implement comprehensive monitoring
5. **Security**: Implement proper authentication and authorization

### Microservices Best Practices

1. **Service Boundaries**: Define clear service boundaries
2. **Data Management**: Handle data consistency across services
3. **Communication**: Use appropriate communication patterns
4. **Deployment**: Implement proper deployment strategies
5. **Monitoring**: Monitor service health and performance

## Future Enhancements

### Planned Features

- **Deep Learning Models**: Neural networks for complex patterns
- **Real-time ML**: Streaming ML predictions
- **AutoML**: Automated model selection and tuning
- **MLOps**: ML model lifecycle management
- **Advanced Analytics**: Real-time analytics and insights

### Research Areas

- **Federated Learning**: Distributed ML training
- **Edge Computing**: ML inference at the edge
- **Quantum ML**: Quantum machine learning algorithms
- **Explainable AI**: Interpretable ML models
- **Continuous Learning**: Online learning and adaptation

## Support

For technical support and questions:
- Check the test suite for usage examples
- Review ML model performance reports
- Examine API gateway logs and metrics
- Contact the development team for advanced issues

The Inventory Improvements System provides enterprise-grade ML integration, API gateway capabilities, and microservices architecture for advanced inventory management.

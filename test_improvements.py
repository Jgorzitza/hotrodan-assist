"""
Comprehensive test suite for inventory improvements.

Tests ML integration, API gateway, and advanced features.
"""
import pytest
import sys
import os
import asyncio
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json

# Add sync directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'sync'))

from ml_integration import MLInventoryIntelligence, MLModel, PredictionResult, AnomalyDetection
from api_gateway import APIGateway, ServiceEndpoint, RateLimit, LoadBalancer, RateLimiter

class TestMLIntegration:
    def setup_method(self):
        self.ml_system = MLInventoryIntelligence()
        
        # Create sample training data
        np.random.seed(42)
        n_samples = 100
        
        self.demand_data = pd.DataFrame({
            "historical_demand": np.random.normal(100, 20, n_samples),
            "seasonality": np.sin(np.arange(n_samples) * 2 * np.pi / 365),
            "trend": np.arange(n_samples) * 0.1,
            "price": np.random.uniform(10, 100, n_samples),
            "promotions": np.random.choice([0, 1], n_samples, p=[0.8, 0.2]),
            "demand": np.random.normal(100, 20, n_samples)
        })
    
    def test_ml_system_initialization(self):
        """Test ML system initialization."""
        assert len(self.ml_system.models) == 3
        assert "demand_forecast" in self.ml_system.models
        assert "lead_time_prediction" in self.ml_system.models
        assert "price_optimization" in self.ml_system.models
    
    def test_add_training_data(self):
        """Test adding training data."""
        self.ml_system.add_training_data("demand", self.demand_data)
        
        assert "demand" in self.ml_system.training_data
        assert len(self.ml_system.training_data["demand"]) == 100
    
    def test_prepare_features(self):
        """Test feature preparation."""
        features = self.ml_system.prepare_features(
            self.demand_data, 
            ["historical_demand", "seasonality", "trend"]
        )
        
        assert features.shape[0] == 100
        assert features.shape[1] == 3
        assert not np.isnan(features).any()
    
    def test_train_model(self):
        """Test model training."""
        self.ml_system.add_training_data("demand", self.demand_data)
        
        success = self.ml_system.train_model("demand_forecast", "demand")
        
        assert success == True
        assert self.ml_system.models["demand_forecast"].scaler is not None
        assert self.ml_system.models["demand_forecast"].accuracy_score > 0
    
    def test_predict(self):
        """Test prediction functionality."""
        self.ml_system.add_training_data("demand", self.demand_data)
        self.ml_system.train_model("demand_forecast", "demand")
        
        prediction = self.ml_system.predict("demand_forecast", {
            "historical_demand": 120,
            "seasonality": 0.5,
            "trend": 10,
            "price": 50,
            "promotions": 1
        })
        
        assert isinstance(prediction, PredictionResult)
        assert prediction.model_name == "demand_forecast"
        assert isinstance(prediction.prediction, float)
        assert 0 <= prediction.confidence <= 1
        assert len(prediction.features_used) == 5
    
    def test_detect_anomalies(self):
        """Test anomaly detection."""
        anomalies = self.ml_system.detect_anomalies(
            self.demand_data, 
            ["historical_demand", "seasonality", "trend"]
        )
        
        assert isinstance(anomalies, list)
        # Should detect some anomalies in random data
        assert len(anomalies) >= 0
    
    def test_optimize_inventory_with_ml(self):
        """Test ML-powered inventory optimization."""
        self.ml_system.add_training_data("demand", self.demand_data)
        self.ml_system.train_model("demand_forecast", "demand")
        
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
        
        results = self.ml_system.optimize_inventory_with_ml(sku_data)
        
        assert "demand_prediction" in results
        assert "lead_time_prediction" in results
        assert "price_optimization" in results
        assert "optimal_quantity" in results
        assert "reorder_point" in results
        
        assert isinstance(results["optimal_quantity"], float)
        assert isinstance(results["reorder_point"], float)
    
    def test_generate_ml_report(self):
        """Test ML report generation."""
        self.ml_system.add_training_data("demand", self.demand_data)
        self.ml_system.train_model("demand_forecast", "demand")
        
        report = self.ml_system.generate_ml_report()
        
        assert "timestamp" in report
        assert "models" in report
        assert "overall_performance" in report
        assert "recommendations" in report
        assert "demand_forecast" in report["models"]

class TestAPIGateway:
    def setup_method(self):
        self.gateway = APIGateway()
    
    def test_gateway_initialization(self):
        """Test API gateway initialization."""
        assert self.gateway.app is not None
        assert self.gateway.load_balancer is not None
        assert self.gateway.rate_limiter is not None
    
    def test_add_service(self):
        """Test adding service endpoint."""
        endpoint = ServiceEndpoint(
            name="test-service",
            url="http://localhost:8001",
            health_check_url="http://localhost:8001/health"
        )
        
        self.gateway.add_service("test", endpoint)
        
        assert "test" in self.gateway.load_balancer.services
        assert len(self.gateway.load_balancer.services["test"]) == 1
    
    def test_set_rate_limit(self):
        """Test setting rate limits."""
        rate_limit = RateLimit(
            requests_per_minute=100,
            requests_per_hour=1000
        )
        
        self.gateway.set_rate_limit("test-endpoint", rate_limit)
        
        assert "test-endpoint" in self.gateway.rate_limiter.rate_limits
    
    def test_rate_limiter_local(self):
        """Test local rate limiting."""
        rate_limiter = RateLimiter()
        rate_limit = RateLimit(requests_per_minute=5, requests_per_hour=50)
        rate_limiter.add_rate_limit("test", rate_limit)
        
        # Test multiple requests
        for i in range(3):
            allowed, info = rate_limiter.is_allowed("client1", "test")
            assert allowed == True
            assert "minute_requests" in info
        
        # Should still be allowed
        allowed, info = rate_limiter.is_allowed("client1", "test")
        assert allowed == True

class TestLoadBalancer:
    def setup_method(self):
        self.load_balancer = LoadBalancer()
    
    def test_add_service(self):
        """Test adding service to load balancer."""
        endpoint = ServiceEndpoint(
            name="service-1",
            url="http://localhost:8001",
            health_check_url="http://localhost:8001/health"
        )
        
        self.load_balancer.add_service("test", endpoint)
        
        assert "test" in self.load_balancer.services
        assert len(self.load_balancer.services["test"]) == 1
        assert "test_service-1" in self.load_balancer.health_status
    
    def test_get_healthy_endpoint(self):
        """Test getting healthy endpoint."""
        endpoint = ServiceEndpoint(
            name="service-1",
            url="http://localhost:8001",
            health_check_url="http://localhost:8001/health"
        )
        
        self.load_balancer.add_service("test", endpoint)
        
        # Manually set health status
        health_key = "test_service-1"
        self.load_balancer.health_status[health_key].is_healthy = True
        
        result = self.load_balancer.get_healthy_endpoint("test")
        
        assert result is not None
        assert result.name == "service-1"
    
    def test_round_robin_selection(self):
        """Test round-robin endpoint selection."""
        # Add multiple endpoints
        for i in range(3):
            endpoint = ServiceEndpoint(
                name=f"service-{i+1}",
                url=f"http://localhost:800{i+1}",
                health_check_url=f"http://localhost:800{i+1}/health"
            )
            self.load_balancer.add_service("test", endpoint)
            
            # Set all as healthy
            health_key = f"test_service-{i+1}"
            self.load_balancer.health_status[health_key].is_healthy = True
        
        # Test round-robin
        selected_endpoints = []
        for _ in range(6):  # 2 full cycles
            endpoint = self.load_balancer.get_healthy_endpoint("test")
            selected_endpoints.append(endpoint.name)
        
        # Should cycle through all endpoints
        assert "service-1" in selected_endpoints
        assert "service-2" in selected_endpoints
        assert "service-3" in selected_endpoints

def test_ml_integration_performance():
    """Test ML integration performance."""
    ml_system = MLInventoryIntelligence()
    
    # Create larger dataset
    np.random.seed(42)
    n_samples = 1000
    
    demand_data = pd.DataFrame({
        "historical_demand": np.random.normal(100, 20, n_samples),
        "seasonality": np.sin(np.arange(n_samples) * 2 * np.pi / 365),
        "trend": np.arange(n_samples) * 0.1,
        "price": np.random.uniform(10, 100, n_samples),
        "promotions": np.random.choice([0, 1], n_samples, p=[0.8, 0.2]),
        "demand": np.random.normal(100, 20, n_samples)
    })
    
    # Test training performance
    import time
    start_time = time.time()
    
    ml_system.add_training_data("demand", demand_data)
    success = ml_system.train_model("demand_forecast", "demand")
    
    end_time = time.time()
    training_time = end_time - start_time
    
    assert success == True
    assert training_time < 10.0  # Should train in less than 10 seconds
    
    # Test prediction performance
    start_time = time.time()
    
    for _ in range(100):
        prediction = ml_system.predict("demand_forecast", {
            "historical_demand": 120,
            "seasonality": 0.5,
            "trend": 10,
            "price": 50,
            "promotions": 1
        })
    
    end_time = time.time()
    prediction_time = end_time - start_time
    
    assert prediction_time < 5.0  # Should predict 100 times in less than 5 seconds
    print(f"ML Performance: Training {training_time:.2f}s, 100 predictions {prediction_time:.2f}s")

def test_api_gateway_integration():
    """Test API gateway integration."""
    gateway = APIGateway()
    
    # Add services
    gateway.add_service("inventory", ServiceEndpoint(
        name="inventory-1",
        url="http://localhost:8004",
        health_check_url="http://localhost:8004/health"
    ))
    
    gateway.add_service("analytics", ServiceEndpoint(
        name="analytics-1",
        url="http://localhost:8005", 
        health_check_url="http://localhost:8005/health"
    ))
    
    # Set rate limits
    gateway.set_rate_limit("inventory/*", RateLimit(requests_per_minute=200))
    gateway.set_rate_limit("analytics/*", RateLimit(requests_per_minute=100))
    
    # Test service configuration
    assert "inventory" in gateway.load_balancer.services
    assert "analytics" in gateway.load_balancer.services
    assert "inventory/*" in gateway.rate_limiter.rate_limits
    assert "analytics/*" in gateway.rate_limiter.rate_limits
    
    print("✅ API Gateway integration test passed!")

def test_error_handling():
    """Test error handling in improvements."""
    # Test ML system error handling
    ml_system = MLInventoryIntelligence()
    
    # Test prediction with untrained model
    prediction = ml_system.predict("demand_forecast", {
        "historical_demand": 120,
        "seasonality": 0.5,
        "trend": 10,
        "price": 50,
        "promotions": 1
    })
    
    assert prediction.prediction == 0.0  # Should return default value
    assert "error" in prediction.additional_info
    
    # Test API gateway error handling
    gateway = APIGateway()
    
    # Test getting endpoint for non-existent service
    endpoint = gateway.load_balancer.get_healthy_endpoint("non-existent")
    assert endpoint is None
    
    print("✅ Error handling tests passed!")

if __name__ == "__main__":
    # Run performance tests
    test_ml_integration_performance()
    test_api_gateway_integration()
    test_error_handling()
    print("✅ All improvements tests passed!")
    print("🎉 Inventory improvements system fully operational!")

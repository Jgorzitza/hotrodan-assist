"""
Comprehensive test suite for advanced inventory engines.

Tests analytics, forecasting, and optimization engines.
"""
import pytest
import sys
import os
from datetime import datetime, timedelta
import statistics
import math
import random

# Add sync directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'sync'))

from analytics_engine import InventoryAnalyticsEngine, InventoryMetrics, PerformanceKPIs, TrendAnalysis
from advanced_forecasting import AdvancedForecastingEngine, ForecastResult, ForecastAccuracy
from optimization_engine import IntelligentOptimizationEngine, OptimizationResult, OptimizationConstraint, OptimizationObjective

class TestAnalyticsEngine:
    def setup_method(self):
        self.engine = InventoryAnalyticsEngine()
        self.sample_data = [
            {"sku": "SKU001", "type": "receipt", "quantity": 100, "value": 1000, "timestamp": datetime.now() - timedelta(days=30), "location": "warehouse1"},
            {"sku": "SKU001", "type": "shipment", "quantity": 20, "value": 200, "timestamp": datetime.now() - timedelta(days=25), "location": "warehouse1"},
            {"sku": "SKU001", "type": "shipment", "quantity": 15, "value": 150, "timestamp": datetime.now() - timedelta(days=20), "location": "warehouse1"},
            {"sku": "SKU002", "type": "receipt", "quantity": 50, "value": 500, "timestamp": datetime.now() - timedelta(days=15), "location": "warehouse2"},
            {"sku": "SKU002", "type": "shipment", "quantity": 10, "value": 100, "timestamp": datetime.now() - timedelta(days=10), "location": "warehouse2"},
        ]
        
        for data in self.sample_data:
            self.engine.add_transaction(data["sku"], data["type"], data["quantity"], 
                                      data["value"], data["timestamp"], data["location"])
    
    def test_add_transaction(self):
        assert len(self.engine.historical_data["SKU001"]) == 3
        assert len(self.engine.historical_data["SKU002"]) == 2
    
    def test_calculate_inventory_metrics(self):
        metrics = self.engine.calculate_inventory_metrics()
        
        assert metrics.total_skus == 2
        assert metrics.total_value > 0
        assert metrics.turnover_rate >= 0
        assert metrics.carrying_cost >= 0
        assert metrics.stockout_rate >= 0
        assert metrics.fill_rate >= 0
        assert "A" in metrics.abc_analysis
        assert "B" in metrics.abc_analysis
        assert "C" in metrics.abc_analysis
        assert "Fast" in metrics.velocity_analysis
        assert "Medium" in metrics.velocity_analysis
        assert "Slow" in metrics.velocity_analysis
    
    def test_calculate_performance_kpis(self):
        kpis = self.engine.calculate_performance_kpis()
        
        assert 0 <= kpis.inventory_accuracy <= 1
        assert 0 <= kpis.order_fulfillment_rate <= 1
        assert 0 <= kpis.lead_time_performance <= 1
        assert 0 <= kpis.supplier_performance <= 1
        assert kpis.cost_efficiency > 0
        assert 0 <= kpis.customer_satisfaction <= 1
    
    def test_analyze_trends(self):
        trend = self.engine.analyze_trends("SKU001")
        
        assert trend.period in ["30 days", "N/A"]
        assert trend.trend_direction in ["increasing", "decreasing", "stable", "unknown", "insufficient_data"]
        assert 0 <= trend.trend_strength <= 1
        assert isinstance(trend.seasonality, bool)
        assert 0 <= trend.forecast_accuracy <= 1
        assert 0 <= trend.confidence_level <= 1
    
    def test_generate_analytics_report(self):
        report = self.engine.generate_analytics_report()
        
        assert "timestamp" in report
        assert "inventory_metrics" in report
        assert "performance_kpis" in report
        assert "trend_analyses" in report
        assert "recommendations" in report
        assert isinstance(report["recommendations"], list)

class TestAdvancedForecastingEngine:
    def setup_method(self):
        self.engine = AdvancedForecastingEngine()
        
        # Add sample demand data
        base_date = datetime.now() - timedelta(days=365)
        for i in range(365):
            date = base_date + timedelta(days=i)
            # Create seasonal pattern
            demand = 100 + 20 * math.sin(2 * math.pi * i / 365) + random.uniform(-10, 10)
            self.engine.add_demand_data("SKU001", date, max(0, demand))
    
    def test_add_demand_data(self):
        assert "SKU001" in self.engine.historical_data
        assert len(self.engine.historical_data["SKU001"]) == 365
    
    def test_simple_moving_average(self):
        forecasts = self.engine.simple_moving_average("SKU001", periods=12)
        assert len(forecasts) > 0
        assert all(f >= 0 for f in forecasts)
    
    def test_exponential_smoothing(self):
        forecasts = self.engine.exponential_smoothing("SKU001", periods=12)
        assert len(forecasts) > 0
        assert all(f >= 0 for f in forecasts)
    
    def test_holt_winters(self):
        forecasts = self.engine.holt_winters("SKU001", periods=12)
        assert len(forecasts) > 0
        assert all(f >= 0 for f in forecasts)
    
    def test_detect_seasonality(self):
        seasonality = self.engine.detect_seasonality("SKU001")
        assert isinstance(seasonality, bool)
    
    def test_detect_trend(self):
        trend = self.engine.detect_trend("SKU001")
        assert trend in ["increasing", "decreasing", "stable", "unknown"]
    
    def test_calculate_accuracy_metrics(self):
        actual = [100, 110, 95, 105, 120]
        forecast = [105, 108, 98, 102, 118]
        
        accuracy = self.engine.calculate_accuracy_metrics("SKU001", actual, forecast)
        
        assert accuracy.mae >= 0
        assert accuracy.mape >= 0
        assert accuracy.rmse >= 0
        assert isinstance(accuracy.bias, float)
        assert isinstance(accuracy.tracking_signal, float)
    
    def test_generate_forecast(self):
        result = self.engine.generate_forecast("SKU001", periods=12)
        
        assert isinstance(result, ForecastResult)
        assert result.sku == "SKU001"
        assert result.forecast_period == "12 periods"
        assert len(result.forecast_values) > 0
        assert len(result.confidence_intervals) == len(result.forecast_values)
        assert result.model_used in ["holt_winters", "exponential_smoothing", "moving_average", "insufficient_data"]
        assert isinstance(result.seasonality_detected, bool)
        assert isinstance(result.trend_detected, bool)
        assert 0 <= result.confidence_score <= 1
    
    def test_generate_multi_sku_forecast(self):
        # Add another SKU
        base_date = datetime.now() - timedelta(days=100)
        for i in range(100):
            date = base_date + timedelta(days=i)
            demand = 50 + random.uniform(-5, 5)
            self.engine.add_demand_data("SKU002", date, max(0, demand))
        
        results = self.engine.generate_multi_sku_forecast(["SKU001", "SKU002"], periods=6)
        
        assert len(results) == 2
        assert "SKU001" in results
        assert "SKU002" in results
        assert all(isinstance(r, ForecastResult) for r in results.values())

class TestIntelligentOptimizationEngine:
    def setup_method(self):
        self.engine = IntelligentOptimizationEngine()
        
        # Add sample SKUs
        self.engine.add_sku("SKU001", 100, 10.0, 1.0, 7, "SupplierA")
        self.engine.add_sku("SKU002", 50, 20.0, 2.0, 14, "SupplierB")
        
        # Add constraints
        self.engine.add_constraint("budget", "budget", 10000, 0, 1.0)
        self.engine.add_constraint("space", "space", 1000, 0, 0.8)
        
        # Add objectives
        self.engine.add_objective("minimize_cost", "minimize", 1.0, 1000)
        self.engine.add_objective("maximize_service", "maximize", 0.8, 0.95)
    
    def test_add_sku(self):
        assert "SKU001" in self.engine.skus
        assert "SKU002" in self.engine.skus
        assert len(self.engine.historical_data["SKU001"]) == 1
    
    def test_add_constraint(self):
        assert "budget" in self.engine.constraints
        assert "space" in self.engine.constraints
        assert self.engine.constraints["budget"].constraint_type == "budget"
        assert self.engine.constraints["space"].constraint_type == "space"
    
    def test_add_objective(self):
        assert "minimize_cost" in self.engine.objectives
        assert "maximize_service" in self.engine.objectives
        assert self.engine.objectives["minimize_cost"].objective_type == "minimize"
        assert self.engine.objectives["maximize_service"].objective_type == "maximize"
    
    def test_calculate_economic_order_quantity(self):
        eoq = self.engine.calculate_economic_order_quantity("SKU001", 1000, 50, 1.0)
        assert eoq > 0
        assert isinstance(eoq, float)
    
    def test_calculate_safety_stock(self):
        # Add some demand data
        for i in range(20):
            date = datetime.now() - timedelta(days=i)
            demand = random.uniform(5, 15)
            self.engine.historical_data["SKU001"].append({
                "timestamp": date,
                "quantity": 100 - i * 2,
                "unit_cost": 10.0,
                "storage_cost": 1.0,
                "lead_time": 7,
                "supplier": "SupplierA",
                "demand": demand
            })
        
        safety_stock = self.engine.calculate_safety_stock("SKU001")
        assert safety_stock >= 0
        assert isinstance(safety_stock, float)
    
    def test_calculate_reorder_point(self):
        reorder_point = self.engine.calculate_reorder_point("SKU001", 7, 10.0)
        assert reorder_point >= 0
        assert isinstance(reorder_point, float)
    
    def test_optimize_single_sku(self):
        result = self.engine.optimize_single_sku("SKU001")
        
        assert isinstance(result, OptimizationResult)
        assert result.sku == "SKU001"
        assert result.recommended_quantity >= 0
        assert result.current_quantity >= 0
        assert isinstance(result.improvement_potential, float)
        assert isinstance(result.constraints_satisfied, list)
        assert isinstance(result.objectives_improved, list)
        assert 0 <= result.confidence_score <= 1
        assert isinstance(result.reasoning, str)
    
    def test_optimize_multi_sku(self):
        results = self.engine.optimize_multi_sku()
        
        assert len(results) == 2
        assert "SKU001" in results
        assert "SKU002" in results
        assert all(isinstance(r, OptimizationResult) for r in results.values())
    
    def test_optimize_with_constraints(self):
        results = self.engine.optimize_with_constraints()
        
        assert len(results) == 2
        assert all(isinstance(r, OptimizationResult) for r in results.values())
    
    def test_generate_optimization_report(self):
        report = self.engine.generate_optimization_report()
        
        assert "timestamp" in report
        assert "total_skus" in report
        assert "total_improvement_potential" in report
        assert "average_confidence" in report
        assert "constraint_violations" in report
        assert "recommendations" in report
        assert "summary" in report
        assert isinstance(report["recommendations"], list)
        assert isinstance(report["summary"], dict)

def test_integration_advanced_engines():
    """Integration test for all advanced engines working together."""
    # Create engines
    analytics = InventoryAnalyticsEngine()
    forecasting = AdvancedForecastingEngine()
    optimization = IntelligentOptimizationEngine()
    
    # Add sample data
    base_date = datetime.now() - timedelta(days=100)
    for i in range(100):
        date = base_date + timedelta(days=i)
        demand = 100 + 20 * math.sin(2 * math.pi * i / 30) + random.uniform(-10, 10)
        
        # Add to analytics
        analytics.add_transaction("SKU001", "shipment", int(demand), demand * 10, date)
        
        # Add to forecasting
        forecasting.add_demand_data("SKU001", date, demand)
        
        # Add to optimization
        if i == 0:
            optimization.add_sku("SKU001", 100, 10.0, 1.0, 7, "SupplierA")
    
    # Run analytics
    metrics = analytics.calculate_inventory_metrics()
    assert metrics.total_skus == 1
    assert metrics.total_value > 0
    
    # Run forecasting
    forecast = forecasting.generate_forecast("SKU001", periods=12)
    assert len(forecast.forecast_values) > 0
    assert forecast.confidence_score > 0
    
    # Run optimization
    optimization.add_constraint("budget", "budget", 10000, 0)
    optimization.add_objective("minimize_cost", "minimize", 1.0, 1000)
    
    result = optimization.optimize_single_sku("SKU001")
    assert result.recommended_quantity >= 0
    assert result.confidence_score > 0
    
    print("✅ All advanced engines integration test passed!")

if __name__ == "__main__":
    # Run the integration test
    test_integration_advanced_engines()
    print("🎉 All advanced inventory engines working together successfully!")

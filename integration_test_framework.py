#!/usr/bin/env python3
"""
Comprehensive Integration Test Framework
End-to-end testing for inventory optimization and scaling
"""

import unittest
import asyncio
import time
import json
from typing import List, Dict, Any
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

# Import our modules
try:
    from advanced_demand_forecasting import AdvancedDemandForecaster, ForecastConfig, DemandForecast
    from vendor_performance_analytics import AdvancedVendorAnalyzer, VendorMetrics
    from automated_purchase_orders import AutomatedPurchaseOrderGenerator, PurchaseOrder
    FORECASTING_AVAILABLE = True
except ImportError:
    FORECASTING_AVAILABLE = False
    print("Warning: Advanced modules not available. Some tests will be skipped.")

class InventoryIntegrationTestSuite(unittest.TestCase):
    """
    Comprehensive integration test suite for inventory optimization
    """
    
    def setUp(self):
        """Set up test data and configurations"""
        self.test_skus = self._generate_test_sku_data(1000)  # 1000 SKUs for scaling test
        self.test_vendors = self._generate_test_vendor_data(10)
        self.test_forecasts = self._generate_test_forecast_data()
        
        # Initialize components
        if FORECASTING_AVAILABLE:
            self.forecaster = AdvancedDemandForecaster()
            self.vendor_analyzer = AdvancedVendorAnalyzer()
            self.po_generator = AutomatedPurchaseOrderGenerator()
    
    def _generate_test_sku_data(self, count: int) -> List[Dict]:
        """Generate test SKU data for performance testing"""
        skus = []
        vendors = ['VENDOR001', 'VENDOR002', 'VENDOR003', 'VENDOR004', 'VENDOR005']
        statuses = ['healthy', 'low', 'backorder', 'preorder']
        
        for i in range(count):
            sku = {
                'id': f'SKU{i:04d}',
                'sku': f'TEST-{i:04d}',
                'name': f'Test Product {i}',
                'onHand': np.random.randint(0, 1000),
                'committed': np.random.randint(0, 100),
                'reorderPoint': np.random.randint(10, 200),
                'vendorId': np.random.choice(vendors),
                'unitCost': {'amount': np.random.uniform(10, 500)},
                'status': np.random.choice(statuses),
                'minimumOrderQuantity': np.random.randint(1, 50),
                'maximumOrderQuantity': np.random.randint(100, 10000),
                'velocity': {
                    'lastWeekUnits': np.random.randint(0, 100),
                    'lastMonthUnits': np.random.randint(0, 500)
                },
                'trend': self._generate_trend_data()
            }
            skus.append(sku)
        
        return skus
    
    def _generate_trend_data(self) -> List[Dict]:
        """Generate historical trend data for a SKU"""
        trend = []
        base_demand = np.random.randint(10, 100)
        
        for i in range(12):  # 12 weeks of data
            # Add some seasonality and noise
            seasonal_factor = 1 + 0.3 * np.sin(2 * np.pi * i / 12)
            noise = np.random.normal(0, 0.1)
            demand = max(0, int(base_demand * seasonal_factor * (1 + noise)))
            
            trend.append({
                'units': demand,
                'date': (datetime.now() - timedelta(weeks=12-i)).isoformat()
            })
        
        return trend
    
    def _generate_test_vendor_data(self, count: int) -> Dict[str, Dict]:
        """Generate test vendor data"""
        vendors = {}
        
        for i in range(count):
            vendor_id = f'VENDOR{i:03d}'
            vendors[vendor_id] = {
                'id': vendor_id,
                'name': f'Test Supplier {i}',
                'average_lead_time': np.random.randint(7, 45),
                'overall_score': np.random.uniform(0.3, 1.0),
                'lead_times': [np.random.randint(5, 30) for _ in range(10)],
                'delivery_performance': [
                    {'on_time': np.random.choice([True, False], p=[0.8, 0.2]), 'date': f'2024-01-{i+1:02d}'}
                    for i in range(20)
                ],
                'return_rate': np.random.uniform(0.01, 0.1),
                'avg_response_time_hours': np.random.randint(2, 48),
                'support_rating': np.random.uniform(0.5, 1.0),
                'modification_success_rate': np.random.uniform(0.7, 1.0),
                'market_average_cost': np.random.uniform(20, 300),
                'fulfillment_rate': np.random.uniform(0.8, 1.0),
                'volume_discount_threshold': np.random.randint(1000, 10000)
            }
        
        return vendors
    
    def _generate_test_forecast_data(self) -> List[Dict]:
        """Generate test forecast data"""
        forecasts = []
        
        for i in range(1000):  # Match SKU count
            sku_id = f'SKU{i:04d}'
            base_demand = np.random.randint(10, 100)
            
            # Generate 12-period forecast with trend and seasonality
            forecast_demand = []
            for period in range(12):
                trend = 1 + 0.02 * period  # 2% growth per period
                seasonal = 1 + 0.2 * np.sin(2 * np.pi * period / 12)
                noise = np.random.normal(0, 0.1)
                demand = max(0, int(base_demand * trend * seasonal * (1 + noise)))
                forecast_demand.append(demand)
            
            forecasts.append({
                'sku_id': sku_id,
                'forecasted_demand': forecast_demand,
                'confidence_interval': (base_demand * 0.8, base_demand * 1.2),
                'trend': np.random.choice(['increasing', 'decreasing', 'stable']),
                'seasonality_strength': np.random.uniform(0, 1),
                'model_accuracy': np.random.uniform(0.6, 0.95)
            })
        
        return forecasts
    
    def test_demand_forecasting_performance(self):
        """Test demand forecasting performance with large dataset"""
        if not FORECASTING_AVAILABLE:
            self.skipTest("Advanced forecasting modules not available")
        
        print("\n=== Testing Demand Forecasting Performance ===")
        
        # Test with subset of data for performance
        test_skus = self.test_skus[:100]  # 100 SKUs for performance test
        start_time = time.time()
        
        forecasts = []
        for sku in test_skus:
            forecast = self.forecaster.forecast_demand(sku)
            forecasts.append(forecast)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        print(f"Processed {len(test_skus)} SKUs in {processing_time:.2f} seconds")
        print(f"Average time per SKU: {processing_time/len(test_skus):.4f} seconds")
        
        # Performance assertions
        self.assertLess(processing_time, 30, "Forecasting should complete within 30 seconds")
        self.assertEqual(len(forecasts), len(test_skus), "Should generate forecast for each SKU")
        
        # Validate forecast quality
        valid_forecasts = [f for f in forecasts if f.model_accuracy > 0]
        if valid_forecasts:
            avg_accuracy = np.mean([f.model_accuracy for f in valid_forecasts])
            print(f"Average forecast accuracy: {avg_accuracy:.3f}")
            self.assertGreater(avg_accuracy, 0.5, "Average accuracy should be above 0.5")
    
    def test_vendor_analytics_performance(self):
        """Test vendor analytics performance with large dataset"""
        if not FORECASTING_AVAILABLE:
            self.skipTest("Advanced vendor analytics modules not available")
        
        print("\n=== Testing Vendor Analytics Performance ===")
        
        # Test vendor analysis
        start_time = time.time()
        
        vendor_metrics = []
        for vendor_id, vendor_data in self.test_vendors.items():
            metrics = self.vendor_analyzer.analyze_vendor_performance(vendor_data)
            vendor_metrics.append(metrics)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        print(f"Processed {len(self.test_vendors)} vendors in {processing_time:.2f} seconds")
        print(f"Average time per vendor: {processing_time/len(self.test_vendors):.4f} seconds")
        
        # Performance assertions
        self.assertLess(processing_time, 10, "Vendor analysis should complete within 10 seconds")
        self.assertEqual(len(vendor_metrics), len(self.test_vendors), "Should analyze each vendor")
        
        # Validate metrics quality
        overall_scores = [m.overall_score for m in vendor_metrics]
        avg_score = np.mean(overall_scores)
        print(f"Average vendor score: {avg_score:.3f}")
        self.assertGreater(avg_score, 0, "Vendor scores should be positive")
    
    def test_purchase_order_generation_performance(self):
        """Test purchase order generation performance"""
        if not FORECASTING_AVAILABLE:
            self.skipTest("Advanced PO generation modules not available")
        
        print("\n=== Testing Purchase Order Generation Performance ===")
        
        # Test with subset for performance
        test_skus = self.test_skus[:200]  # 200 SKUs
        test_forecasts = self.test_forecasts[:200]
        
        start_time = time.time()
        
        purchase_orders = self.po_generator.generate_purchase_orders(
            test_skus, self.test_vendors, test_forecasts
        )
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        print(f"Generated {len(purchase_orders)} POs for {len(test_skus)} SKUs in {processing_time:.2f} seconds")
        print(f"Average time per SKU: {processing_time/len(test_skus):.4f} seconds")
        
        # Performance assertions
        self.assertLess(processing_time, 20, "PO generation should complete within 20 seconds")
        self.assertGreater(len(purchase_orders), 0, "Should generate at least one PO")
        
        # Validate PO quality
        total_amount = sum(po.total_amount for po in purchase_orders)
        total_items = sum(len(po.items) for po in purchase_orders)
        print(f"Total PO value: ${total_amount:.2f}")
        print(f"Total items: {total_items}")
        
        self.assertGreater(total_amount, 0, "Total PO amount should be positive")
        self.assertGreater(total_items, 0, "Should have items in POs")
    
    def test_end_to_end_workflow(self):
        """Test complete end-to-end workflow"""
        if not FORECASTING_AVAILABLE:
            self.skipTest("Advanced modules not available")
        
        print("\n=== Testing End-to-End Workflow ===")
        
        # Use smaller dataset for end-to-end test
        test_skus = self.test_skus[:50]
        test_forecasts = self.test_forecasts[:50]
        
        start_time = time.time()
        
        # Step 1: Generate forecasts
        forecasts = []
        for sku in test_skus:
            forecast = self.forecaster.forecast_demand(sku)
            forecasts.append(forecast)
        
        # Step 2: Analyze vendors
        vendor_metrics = []
        for vendor_id, vendor_data in self.test_vendors.items():
            metrics = self.vendor_analyzer.analyze_vendor_performance(vendor_data)
            vendor_metrics.append(metrics)
        
        # Step 3: Generate purchase orders
        purchase_orders = self.po_generator.generate_purchase_orders(
            test_skus, self.test_vendors, test_forecasts
        )
        
        end_time = time.time()
        total_time = end_time - start_time
        
        print(f"Complete workflow processed in {total_time:.2f} seconds")
        print(f"Generated {len(forecasts)} forecasts")
        print(f"Analyzed {len(vendor_metrics)} vendors")
        print(f"Generated {len(purchase_orders)} purchase orders")
        
        # Validate workflow completion
        self.assertEqual(len(forecasts), len(test_skus), "Should generate forecast for each SKU")
        self.assertEqual(len(vendor_metrics), len(self.test_vendors), "Should analyze each vendor")
        self.assertGreater(len(purchase_orders), 0, "Should generate purchase orders")
        self.assertLess(total_time, 60, "Complete workflow should finish within 60 seconds")
    
    def test_memory_usage(self):
        """Test memory usage with large datasets"""
        print("\n=== Testing Memory Usage ===")
        
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Process large dataset
        large_sku_count = 5000
        large_skus = self._generate_test_sku_data(large_sku_count)
        
        memory_after_data = process.memory_info().rss / 1024 / 1024  # MB
        data_memory = memory_after_data - initial_memory
        
        print(f"Memory usage for {large_sku_count} SKUs: {data_memory:.2f} MB")
        print(f"Memory per SKU: {data_memory/large_sku_count:.4f} MB")
        
        # Memory usage should be reasonable
        self.assertLess(data_memory, 1000, "Memory usage should be less than 1GB for 5000 SKUs")
        self.assertLess(data_memory/large_sku_count, 0.2, "Memory per SKU should be less than 0.2MB")
    
    def test_error_handling(self):
        """Test error handling with invalid data"""
        if not FORECASTING_AVAILABLE:
            self.skipTest("Advanced modules not available")
        
        print("\n=== Testing Error Handling ===")
        
        # Test with invalid SKU data
        invalid_sku = {
            'id': 'INVALID',
            'name': 'Invalid SKU'
            # Missing required fields
        }
        
        # Should not crash, should return default forecast
        forecast = self.forecaster.forecast_demand(invalid_sku)
        self.assertIsNotNone(forecast, "Should return forecast even for invalid data")
        self.assertEqual(forecast.sku_id, 'INVALID', "Should preserve SKU ID")
        
        # Test with invalid vendor data
        invalid_vendor = {
            'id': 'INVALID_VENDOR'
            # Missing required fields
        }
        
        # Should not crash, should return default metrics
        metrics = self.vendor_analyzer.analyze_vendor_performance(invalid_vendor)
        self.assertIsNotNone(metrics, "Should return metrics even for invalid data")
        self.assertEqual(metrics.vendor_id, 'INVALID_VENDOR', "Should preserve vendor ID")
    
    def test_concurrent_processing(self):
        """Test concurrent processing capabilities"""
        if not FORECASTING_AVAILABLE:
            self.skipTest("Advanced modules not available")
        
        print("\n=== Testing Concurrent Processing ===")
        
        async def process_sku_batch(skus):
            """Process a batch of SKUs concurrently"""
            tasks = []
            for sku in skus:
                # Simulate async processing
                task = asyncio.create_task(self._async_forecast(sku))
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            return results
        
        async def _async_forecast(self, sku):
            """Async wrapper for forecasting"""
            await asyncio.sleep(0.001)  # Simulate async work
            return self.forecaster.forecast_demand(sku)
        
        # Test concurrent processing
        test_skus = self.test_skus[:100]
        
        start_time = time.time()
        results = asyncio.run(process_sku_batch(test_skus))
        end_time = time.time()
        
        processing_time = end_time - start_time
        print(f"Concurrent processing of {len(test_skus)} SKUs in {processing_time:.2f} seconds")
        
        # Should be faster than sequential processing
        self.assertLess(processing_time, 10, "Concurrent processing should be efficient")
        self.assertEqual(len(results), len(test_skus), "Should process all SKUs")
    
    async def _async_forecast(self, sku):
        """Async wrapper for forecasting"""
        await asyncio.sleep(0.001)  # Simulate async work
        return self.forecaster.forecast_demand(sku)

class PerformanceBenchmark:
    """
    Performance benchmarking utilities
    """
    
    @staticmethod
    def benchmark_forecasting(sku_count: int = 1000) -> Dict[str, float]:
        """Benchmark demand forecasting performance"""
        if not FORECASTING_AVAILABLE:
            return {"error": "Forecasting modules not available"}
        
        # Generate test data
        test_skus = []
        for i in range(sku_count):
            sku = {
                'id': f'SKU{i:04d}',
                'name': f'Test Product {i}',
                'onHand': np.random.randint(0, 1000),
                'velocity': {'lastWeekUnits': np.random.randint(0, 100)},
                'trend': [{'units': np.random.randint(10, 100)} for _ in range(6)]
            }
            test_skus.append(sku)
        
        # Benchmark
        forecaster = AdvancedDemandForecaster()
        start_time = time.time()
        
        forecasts = []
        for sku in test_skus:
            forecast = forecaster.forecast_demand(sku)
            forecasts.append(forecast)
        
        end_time = time.time()
        
        return {
            "sku_count": sku_count,
            "total_time": end_time - start_time,
            "time_per_sku": (end_time - start_time) / sku_count,
            "skus_per_second": sku_count / (end_time - start_time)
        }
    
    @staticmethod
    def benchmark_vendor_analytics(vendor_count: int = 100) -> Dict[str, float]:
        """Benchmark vendor analytics performance"""
        if not FORECASTING_AVAILABLE:
            return {"error": "Vendor analytics modules not available"}
        
        # Generate test data
        test_vendors = {}
        for i in range(vendor_count):
            vendor_id = f'VENDOR{i:03d}'
            test_vendors[vendor_id] = {
                'id': vendor_id,
                'name': f'Test Supplier {i}',
                'skus': [{'id': f'SKU{j}', 'status': 'healthy', 'unit_cost': {'amount': 25}} for j in range(10)],
                'lead_times': [np.random.randint(5, 30) for _ in range(10)],
                'delivery_performance': [{'on_time': True} for _ in range(20)],
                'return_rate': 0.02,
                'avg_response_time_hours': 4,
                'support_rating': 0.85
            }
        
        # Benchmark
        analyzer = AdvancedVendorAnalyzer()
        start_time = time.time()
        
        metrics = []
        for vendor_id, vendor_data in test_vendors.items():
            metric = analyzer.analyze_vendor_performance(vendor_data)
            metrics.append(metric)
        
        end_time = time.time()
        
        return {
            "vendor_count": vendor_count,
            "total_time": end_time - start_time,
            "time_per_vendor": (end_time - start_time) / vendor_count,
            "vendors_per_second": vendor_count / (end_time - start_time)
        }

def run_performance_tests():
    """Run comprehensive performance tests"""
    print("=== INVENTORY OPTIMIZATION PERFORMANCE TESTS ===")
    
    # Run unit tests
    unittest.main(argv=[''], exit=False, verbosity=2)
    
    # Run benchmarks
    print("\n=== PERFORMANCE BENCHMARKS ===")
    
    # Benchmark forecasting
    forecast_benchmark = PerformanceBenchmark.benchmark_forecasting(1000)
    if "error" not in forecast_benchmark:
        print(f"Forecasting Benchmark (1000 SKUs):")
        print(f"  Total Time: {forecast_benchmark['total_time']:.2f}s")
        print(f"  Time per SKU: {forecast_benchmark['time_per_sku']:.4f}s")
        print(f"  SKUs per Second: {forecast_benchmark['skus_per_second']:.2f}")
    
    # Benchmark vendor analytics
    vendor_benchmark = PerformanceBenchmark.benchmark_vendor_analytics(100)
    if "error" not in vendor_benchmark:
        print(f"\nVendor Analytics Benchmark (100 vendors):")
        print(f"  Total Time: {vendor_benchmark['total_time']:.2f}s")
        print(f"  Time per Vendor: {vendor_benchmark['time_per_vendor']:.4f}s")
        print(f"  Vendors per Second: {vendor_benchmark['vendors_per_second']:.2f}")

if __name__ == "__main__":
    run_performance_tests()

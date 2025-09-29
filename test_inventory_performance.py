#!/usr/bin/env python3
"""
Comprehensive Performance Test Suite for Inventory Intelligence
Tests performance with various dataset sizes and scenarios
"""

import os
import sys
import time
import json
import asyncio
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import statistics

# Import our optimized modules
from query_chroma_router_optimized import OptimizedQueryRouter, PerformanceConfig
from inventory_analytics_optimized import OptimizedInventoryAnalytics, InventorySkuDemand
from mcp_inventory_integration import McpInventoryIntegration, McpConfig

@dataclass
class TestResult:
    """Test result data structure"""
    test_name: str
    dataset_size: int
    processing_time: float
    memory_usage: float
    success: bool
    error: Optional[str] = None
    metrics: Dict[str, Any] = None

class InventoryPerformanceTester:
    """
    Comprehensive performance testing for inventory intelligence system
    """
    
    def __init__(self):
        self.results: List[TestResult] = []
        self.test_datasets = {
            100: self._generate_test_data(100),
            500: self._generate_test_data(500),
            1000: self._generate_test_data(1000),
            2000: self._generate_test_data(2000),
            5000: self._generate_test_data(5000)
        }
    
    def _generate_test_data(self, sku_count: int) -> List[InventorySkuDemand]:
        """Generate test data for performance testing"""
        sku_demands = []
        
        for i in range(sku_count):
            # Generate realistic demand history
            base_demand = np.random.poisson(5)
            trend = np.random.uniform(-0.5, 0.5)
            seasonality = np.sin(np.arange(30) * 2 * np.pi / 30) * 0.2
            noise = np.random.normal(0, 0.1, 30)
            
            demand_history = base_demand + trend * np.arange(30) + seasonality + noise
            demand_history = np.maximum(demand_history, 0)  # Ensure non-negative
            
            sku = InventorySkuDemand(
                sku_id=f"TEST{i:04d}",
                sku=f"Test Product {i}",
                current_stock=np.random.randint(0, 200),
                demand_history=demand_history.tolist(),
                lead_time=np.random.randint(3, 30),
                service_level=np.random.choice([0.90, 0.95, 0.99]),
                cost_per_unit=np.random.uniform(5, 100),
                reorder_cost=np.random.uniform(25, 100),
                holding_cost_rate=np.random.uniform(0.15, 0.25)
            )
            sku_demands.append(sku)
        
        return sku_demands
    
    def _measure_memory_usage(self) -> float:
        """Measure current memory usage in MB"""
        try:
            import psutil
            process = psutil.Process()
            return process.memory_info().rss / 1024 / 1024  # Convert to MB
        except ImportError:
            return 0.0
    
    def test_query_router_performance(self, dataset_size: int) -> TestResult:
        """Test query router performance"""
        print(f"🧪 Testing Query Router with {dataset_size} SKUs...")
        
        start_time = time.time()
        start_memory = self._measure_memory_usage()
        
        try:
            # Initialize router with optimized config
            config = PerformanceConfig(
                max_workers=min(8, dataset_size // 100),
                cache_size=min(1000, dataset_size),
                enable_parallel=True,
                enable_caching=True
            )
            router = OptimizedQueryRouter(config)
            
            # Generate test queries
            queries = [
                f"Analyze inventory for SKU {i:04d}" for i in range(min(10, dataset_size))
            ]
            
            # Test single query
            single_result = router.query("What is the overall inventory status?")
            
            # Test batch queries
            batch_results = router.batch_query(queries)
            
            # Test inventory-specific query
            sku_ids = [f"TEST{i:04d}" for i in range(min(50, dataset_size))]
            inventory_result = router.inventory_query(sku_ids, "analysis")
            
            processing_time = time.time() - start_time
            end_memory = self._measure_memory_usage()
            memory_usage = end_memory - start_memory
            
            # Get performance metrics
            metrics = router.get_performance_metrics()
            
            return TestResult(
                test_name="query_router",
                dataset_size=dataset_size,
                processing_time=processing_time,
                memory_usage=memory_usage,
                success=True,
                metrics=metrics
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            return TestResult(
                test_name="query_router",
                dataset_size=dataset_size,
                processing_time=processing_time,
                memory_usage=0,
                success=False,
                error=str(e)
            )
    
    def test_analytics_performance(self, dataset_size: int) -> TestResult:
        """Test analytics engine performance"""
        print(f"🧪 Testing Analytics Engine with {dataset_size} SKUs...")
        
        start_time = time.time()
        start_memory = self._measure_memory_usage()
        
        try:
            # Get test data
            sku_demands = self.test_datasets[dataset_size]
            
            # Initialize analytics engine
            analytics = OptimizedInventoryAnalytics(
                max_workers=min(8, dataset_size // 100),
                cache_size=min(1000, dataset_size)
            )
            
            # Run comprehensive analysis
            results = analytics.analyze_inventory(sku_demands)
            
            processing_time = time.time() - start_time
            end_memory = self._measure_memory_usage()
            memory_usage = end_memory - start_memory
            
            # Get performance metrics
            metrics = analytics.get_performance_metrics()
            
            return TestResult(
                test_name="analytics_engine",
                dataset_size=dataset_size,
                processing_time=processing_time,
                memory_usage=memory_usage,
                success=True,
                metrics=metrics
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            return TestResult(
                test_name="analytics_engine",
                dataset_size=dataset_size,
                processing_time=processing_time,
                memory_usage=0,
                success=False,
                error=str(e)
            )
    
    async def test_mcp_integration_performance(self, dataset_size: int) -> TestResult:
        """Test MCP integration performance"""
        print(f"🧪 Testing MCP Integration with {dataset_size} SKUs...")
        
        start_time = time.time()
        start_memory = self._measure_memory_usage()
        
        try:
            # Initialize MCP integration
            config = McpConfig(
                use_mock_data=True,  # Use mock data for testing
                enable_mcp=True
            )
            integration = McpInventoryIntegration(config)
            
            # Generate test SKU IDs
            sku_ids = [f"TEST{i:04d}" for i in range(min(100, dataset_size))]
            
            # Test various MCP operations
            products = await integration.get_shopify_products(limit=50)
            ga4_data = await integration.get_ga4_traffic_data('2024-01-01', '2024-01-31')
            gsc_data = await integration.get_search_console_data('2024-01-01', '2024-01-31')
            signals = await integration.get_inventory_signals(sku_ids)
            
            processing_time = time.time() - start_time
            end_memory = self._measure_memory_usage()
            memory_usage = end_memory - start_memory
            
            # Get performance metrics
            metrics = integration.get_performance_metrics()
            
            # Close integration
            await integration.close()
            
            return TestResult(
                test_name="mcp_integration",
                dataset_size=dataset_size,
                processing_time=processing_time,
                memory_usage=memory_usage,
                success=True,
                metrics=metrics
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            return TestResult(
                test_name="mcp_integration",
                dataset_size=dataset_size,
                processing_time=processing_time,
                memory_usage=0,
                success=False,
                error=str(e)
            )
    
    def test_end_to_end_performance(self, dataset_size: int) -> TestResult:
        """Test end-to-end performance with all components"""
        print(f"🧪 Testing End-to-End Performance with {dataset_size} SKUs...")
        
        start_time = time.time()
        start_memory = self._measure_memory_usage()
        
        try:
            # Get test data
            sku_demands = self.test_datasets[dataset_size]
            
            # Initialize all components
            router_config = PerformanceConfig(
                max_workers=min(8, dataset_size // 100),
                cache_size=min(1000, dataset_size)
            )
            router = OptimizedQueryRouter(router_config)
            
            analytics = OptimizedInventoryAnalytics(
                max_workers=min(8, dataset_size // 100),
                cache_size=min(1000, dataset_size)
            )
            
            # Run analytics
            analytics_results = analytics.analyze_inventory(sku_demands)
            
            # Generate insights from analytics
            insights = analytics_results.get('insights', [])
            reorder_points = analytics_results.get('reorder_points', [])
            
            # Test query router with analytics results
            query = f"Based on the analysis of {len(sku_demands)} SKUs, what are the key insights?"
            context = {
                'insights_count': len(insights),
                'reorder_points_count': len(reorder_points),
                'dataset_size': dataset_size
            }
            
            router_result = router.query(query, context)
            
            processing_time = time.time() - start_time
            end_memory = self._measure_memory_usage()
            memory_usage = end_memory - start_memory
            
            # Combine metrics
            combined_metrics = {
                'analytics_metrics': analytics.get_performance_metrics(),
                'router_metrics': router.get_performance_metrics(),
                'insights_generated': len(insights),
                'reorder_points_calculated': len(reorder_points)
            }
            
            return TestResult(
                test_name="end_to_end",
                dataset_size=dataset_size,
                processing_time=processing_time,
                memory_usage=memory_usage,
                success=True,
                metrics=combined_metrics
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            return TestResult(
                test_name="end_to_end",
                dataset_size=dataset_size,
                processing_time=processing_time,
                memory_usage=0,
                success=False,
                error=str(e)
            )
    
    def run_performance_tests(self, dataset_sizes: List[int] = None) -> Dict[str, Any]:
        """Run comprehensive performance tests"""
        if dataset_sizes is None:
            dataset_sizes = [100, 500, 1000, 2000]
        
        print("🚀 Starting Comprehensive Performance Tests")
        print(f"📊 Testing with dataset sizes: {dataset_sizes}")
        print("=" * 60)
        
        all_results = []
        
        for dataset_size in dataset_sizes:
            print(f"\n📈 Testing with {dataset_size} SKUs")
            print("-" * 40)
            
            # Test Query Router
            router_result = self.test_query_router_performance(dataset_size)
            all_results.append(router_result)
            
            # Test Analytics Engine
            analytics_result = self.test_analytics_performance(dataset_size)
            all_results.append(analytics_result)
            
            # Test MCP Integration (async)
            mcp_result = asyncio.run(self.test_mcp_integration_performance(dataset_size))
            all_results.append(mcp_result)
            
            # Test End-to-End
            e2e_result = self.test_end_to_end_performance(dataset_size)
            all_results.append(e2e_result)
        
        # Store results
        self.results = all_results
        
        # Generate performance report
        report = self._generate_performance_report()
        
        return report
    
    def _generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        report = {
            'test_summary': {
                'total_tests': len(self.results),
                'successful_tests': len([r for r in self.results if r.success]),
                'failed_tests': len([r for r in self.results if not r.success]),
                'dataset_sizes_tested': sorted(list(set(r.dataset_size for r in self.results)))
            },
            'performance_by_dataset': {},
            'performance_by_component': {},
            'recommendations': [],
            'detailed_results': []
        }
        
        # Group results by dataset size
        for result in self.results:
            dataset_size = result.dataset_size
            if dataset_size not in report['performance_by_dataset']:
                report['performance_by_dataset'][dataset_size] = {
                    'total_time': 0,
                    'total_memory': 0,
                    'component_times': {},
                    'component_memory': {},
                    'success_rate': 0,
                    'total_tests': 0
                }
            
            dataset_data = report['performance_by_dataset'][dataset_size]
            dataset_data['total_time'] += result.processing_time
            dataset_data['total_memory'] += result.memory_usage
            dataset_data['component_times'][result.test_name] = result.processing_time
            dataset_data['component_memory'][result.test_name] = result.memory_usage
            dataset_data['total_tests'] += 1
            if result.success:
                dataset_data['success_rate'] += 1
        
        # Calculate success rates
        for dataset_size in report['performance_by_dataset']:
            data = report['performance_by_dataset'][dataset_size]
            data['success_rate'] = data['success_rate'] / data['total_tests'] * 100
        
        # Group results by component
        for result in self.results:
            component = result.test_name
            if component not in report['performance_by_component']:
                report['performance_by_component'][component] = {
                    'avg_time': 0,
                    'avg_memory': 0,
                    'success_rate': 0,
                    'total_tests': 0,
                    'times_by_dataset': {}
                }
            
            comp_data = report['performance_by_component'][component]
            comp_data['avg_time'] += result.processing_time
            comp_data['avg_memory'] += result.memory_usage
            comp_data['total_tests'] += 1
            if result.success:
                comp_data['success_rate'] += 1
            
            if result.dataset_size not in comp_data['times_by_dataset']:
                comp_data['times_by_dataset'][result.dataset_size] = []
            comp_data['times_by_dataset'][result.dataset_size].append(result.processing_time)
        
        # Calculate averages
        for component in report['performance_by_component']:
            comp_data = report['performance_by_component'][component]
            comp_data['avg_time'] /= comp_data['total_tests']
            comp_data['avg_memory'] /= comp_data['total_tests']
            comp_data['success_rate'] = comp_data['success_rate'] / comp_data['total_tests'] * 100
        
        # Generate recommendations
        report['recommendations'] = self._generate_recommendations()
        
        # Add detailed results
        report['detailed_results'] = [
            {
                'test_name': r.test_name,
                'dataset_size': r.dataset_size,
                'processing_time': r.processing_time,
                'memory_usage': r.memory_usage,
                'success': r.success,
                'error': r.error,
                'metrics': r.metrics
            }
            for r in self.results
        ]
        
        return report
    
    def _generate_recommendations(self) -> List[str]:
        """Generate performance optimization recommendations"""
        recommendations = []
        
        # Analyze performance trends
        successful_results = [r for r in self.results if r.success]
        
        if not successful_results:
            return ["No successful tests to analyze"]
        
        # Check if performance scales linearly
        times_by_dataset = {}
        for result in successful_results:
            if result.dataset_size not in times_by_dataset:
                times_by_dataset[result.dataset_size] = []
            times_by_dataset[result.dataset_size].append(result.processing_time)
        
        # Calculate scaling efficiency
        if len(times_by_dataset) >= 2:
            sizes = sorted(times_by_dataset.keys())
            avg_times = [np.mean(times_by_dataset[size]) for size in sizes]
            
            # Check if scaling is linear
            scaling_ratio = avg_times[-1] / avg_times[0] if avg_times[0] > 0 else 0
            size_ratio = sizes[-1] / sizes[0] if sizes[0] > 0 else 0
            
            if scaling_ratio > size_ratio * 1.5:
                recommendations.append("Performance scaling is sub-linear. Consider optimizing algorithms for better scalability.")
            elif scaling_ratio < size_ratio * 0.5:
                recommendations.append("Excellent performance scaling. System is well-optimized for large datasets.")
        
        # Check memory usage
        memory_usage = [r.memory_usage for r in successful_results if r.memory_usage > 0]
        if memory_usage:
            avg_memory = np.mean(memory_usage)
            max_memory = max(memory_usage)
            
            if avg_memory > 100:  # More than 100MB average
                recommendations.append("High memory usage detected. Consider implementing more memory-efficient data structures.")
            
            if max_memory > 500:  # More than 500MB peak
                recommendations.append("Peak memory usage is high. Consider implementing memory management strategies.")
        
        # Check processing times
        processing_times = [r.processing_time for r in successful_results]
        if processing_times:
            avg_time = np.mean(processing_times)
            max_time = max(processing_times)
            
            if avg_time > 10:  # More than 10 seconds average
                recommendations.append("Average processing time is high. Consider optimizing algorithms or increasing parallelism.")
            
            if max_time > 30:  # More than 30 seconds peak
                recommendations.append("Peak processing time is high. Consider implementing caching or batch processing.")
        
        # Check success rate
        success_rate = len(successful_results) / len(self.results) * 100
        if success_rate < 90:
            recommendations.append(f"Success rate is {success_rate:.1f}%. Investigate and fix failing tests.")
        
        if not recommendations:
            recommendations.append("All performance metrics are within acceptable ranges. System is well-optimized.")
        
        return recommendations
    
    def save_report(self, filename: str = None):
        """Save performance report to file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"inventory_performance_report_{timestamp}.json"
        
        report = self._generate_performance_report()
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"📄 Performance report saved to: {filename}")
        return filename

def main():
    """Main function to run performance tests"""
    print("🧪 Inventory Intelligence Performance Test Suite")
    print("=" * 60)
    
    # Initialize tester
    tester = InventoryPerformanceTester()
    
    # Run tests with different dataset sizes
    dataset_sizes = [100, 500, 1000]  # Start with smaller sizes for testing
    
    try:
        # Run performance tests
        report = tester.run_performance_tests(dataset_sizes)
        
        # Print summary
        print("\n📊 Performance Test Summary")
        print("=" * 40)
        print(f"Total tests: {report['test_summary']['total_tests']}")
        print(f"Successful: {report['test_summary']['successful_tests']}")
        print(f"Failed: {report['test_summary']['failed_tests']}")
        print(f"Success rate: {report['test_summary']['successful_tests'] / report['test_summary']['total_tests'] * 100:.1f}%")
        
        # Print performance by dataset size
        print("\n📈 Performance by Dataset Size")
        print("-" * 40)
        for size, data in report['performance_by_dataset'].items():
            print(f"{size} SKUs: {data['total_time']:.2f}s, {data['total_memory']:.1f}MB, {data['success_rate']:.1f}% success")
        
        # Print performance by component
        print("\n🔧 Performance by Component")
        print("-" * 40)
        for component, data in report['performance_by_component'].items():
            print(f"{component}: {data['avg_time']:.2f}s avg, {data['avg_memory']:.1f}MB avg, {data['success_rate']:.1f}% success")
        
        # Print recommendations
        print("\n💡 Recommendations")
        print("-" * 40)
        for i, rec in enumerate(report['recommendations'], 1):
            print(f"{i}. {rec}")
        
        # Save report
        filename = tester.save_report()
        
        print(f"\n✅ Performance testing completed!")
        print(f"📄 Detailed report saved to: {filename}")
        
    except Exception as e:
        print(f"❌ Performance testing failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

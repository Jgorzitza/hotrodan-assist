#!/usr/bin/env python3
"""
Production Deployment Validation Tests
Validates that all inventory components are working in production
"""

import os
import sys
import time
import json
import asyncio
import requests
from typing import Dict, List, Any
from datetime import datetime

class ProductionValidator:
    """Validates production deployment of inventory system"""
    
    def __init__(self):
        self.base_url = "http://localhost:8004"
        self.connectors_url = "http://localhost:8003"
        self.results = []
    
    def log_test(self, test_name: str, success: bool, message: str, duration: float = 0):
        """Log test result"""
        result = {
            'test_name': test_name,
            'success': success,
            'message': message,
            'duration': duration,
            'timestamp': datetime.now().isoformat()
        }
        self.results.append(result)
        
        status = "✅" if success else "❌"
        print(f"{status} {test_name}: {message} ({duration:.2f}s)")
    
    def test_api_health(self) -> bool:
        """Test API health endpoint"""
        start_time = time.time()
        
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 'healthy':
                    self.log_test("API Health Check", True, "API is healthy", duration)
                    return True
                else:
                    self.log_test("API Health Check", False, f"API status: {data['status']}", duration)
                    return False
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}", duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("API Health Check", False, f"Error: {str(e)}", duration)
            return False
    
    def test_analytics_engine(self) -> bool:
        """Test analytics engine functionality"""
        start_time = time.time()
        
        try:
            # Create test data
            test_data = {
                "sku_demands": [
                    {
                        "sku_id": "TEST001",
                        "sku": "Test Product 1",
                        "current_stock": 100,
                        "demand_history": [5, 6, 4, 7, 5, 6, 8, 4, 5, 6],
                        "lead_time": 7,
                        "service_level": 0.95,
                        "cost_per_unit": 25.0,
                        "reorder_cost": 50.0,
                        "holding_cost_rate": 0.2
                    },
                    {
                        "sku_id": "TEST002",
                        "sku": "Test Product 2",
                        "current_stock": 50,
                        "demand_history": [3, 4, 2, 5, 3, 4, 6, 2, 3, 4],
                        "lead_time": 14,
                        "service_level": 0.90,
                        "cost_per_unit": 15.0,
                        "reorder_cost": 30.0,
                        "holding_cost_rate": 0.15
                    }
                ],
                "analysis_type": "comprehensive"
            }
            
            response = requests.post(
                f"{self.base_url}/analyze",
                json=test_data,
                timeout=30
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data['success'] and 'velocity_deciles' in data['data']:
                    self.log_test("Analytics Engine", True, f"Analyzed {data['sku_count']} SKUs", duration)
                    return True
                else:
                    self.log_test("Analytics Engine", False, "Invalid response format", duration)
                    return False
            else:
                self.log_test("Analytics Engine", False, f"HTTP {response.status_code}", duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("Analytics Engine", False, f"Error: {str(e)}", duration)
            return False
    
    def test_mcp_integration(self) -> bool:
        """Test MCP integration functionality"""
        start_time = time.time()
        
        try:
            response = requests.get(f"{self.base_url}/mcp/signals?sku_ids=TEST001,TEST002", timeout=15)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data['success'] and 'signals' in data:
                    self.log_test("MCP Integration", True, f"Retrieved {data['count']} signals", duration)
                    return True
                else:
                    self.log_test("MCP Integration", False, "Invalid response format", duration)
                    return False
            else:
                self.log_test("MCP Integration", False, f"HTTP {response.status_code}", duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("MCP Integration", False, f"Error: {str(e)}", duration)
            return False
    
    def test_shopify_products(self) -> bool:
        """Test Shopify products endpoint"""
        start_time = time.time()
        
        try:
            response = requests.get(f"{self.base_url}/mcp/shopify/products?limit=5", timeout=15)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data['success'] and 'products' in data:
                    self.log_test("Shopify Products", True, f"Retrieved {data['count']} products", duration)
                    return True
                else:
                    self.log_test("Shopify Products", False, "Invalid response format", duration)
                    return False
            else:
                self.log_test("Shopify Products", False, f"HTTP {response.status_code}", duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("Shopify Products", False, f"Error: {str(e)}", duration)
            return False
    
    def test_performance_metrics(self) -> bool:
        """Test performance metrics endpoint"""
        start_time = time.time()
        
        try:
            response = requests.get(f"{self.base_url}/performance/metrics", timeout=10)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data['success'] and 'metrics' in data:
                    self.log_test("Performance Metrics", True, "Metrics retrieved successfully", duration)
                    return True
                else:
                    self.log_test("Performance Metrics", False, "Invalid response format", duration)
                    return False
            else:
                self.log_test("Performance Metrics", False, f"HTTP {response.status_code}", duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("Performance Metrics", False, f"Error: {str(e)}", duration)
            return False
    
    def test_performance_optimization(self) -> bool:
        """Test performance optimization endpoint"""
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{self.base_url}/performance/optimize",
                json={"sku_count": 1000},
                timeout=10
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data['success']:
                    self.log_test("Performance Optimization", True, "Optimization completed", duration)
                    return True
                else:
                    self.log_test("Performance Optimization", False, "Optimization failed", duration)
                    return False
            else:
                self.log_test("Performance Optimization", False, f"HTTP {response.status_code}", duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("Performance Optimization", False, f"Error: {str(e)}", duration)
            return False
    
    def test_connectors_health(self) -> bool:
        """Test MCP connectors health"""
        start_time = time.time()
        
        try:
            response = requests.get(f"{self.connectors_url}/health", timeout=10)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                self.log_test("MCP Connectors", True, "Connectors are healthy", duration)
                return True
            else:
                self.log_test("MCP Connectors", False, f"HTTP {response.status_code}", duration)
                return False
                
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("MCP Connectors", False, f"Error: {str(e)}", duration)
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all production validation tests"""
        print("🧪 Starting Production Deployment Validation...")
        print("=" * 60)
        
        # Run all tests
        tests = [
            self.test_api_health,
            self.test_analytics_engine,
            self.test_mcp_integration,
            self.test_shopify_products,
            self.test_performance_metrics,
            self.test_performance_optimization,
            self.test_connectors_health
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        # Generate summary
        success_rate = (passed / total) * 100
        
        summary = {
            'total_tests': total,
            'passed_tests': passed,
            'failed_tests': total - passed,
            'success_rate': success_rate,
            'timestamp': datetime.now().isoformat(),
            'results': self.results
        }
        
        print("\n" + "=" * 60)
        print("📊 PRODUCTION VALIDATION SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("✅ PRODUCTION DEPLOYMENT VALIDATED")
        elif success_rate >= 60:
            print("⚠️  PRODUCTION DEPLOYMENT PARTIALLY VALIDATED")
        else:
            print("❌ PRODUCTION DEPLOYMENT FAILED VALIDATION")
        
        return summary
    
    def save_report(self, filename: str = None):
        """Save validation report to file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"production_validation_report_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        print(f"\n📄 Validation report saved to: {filename}")
        return filename

def main():
    """Main function to run production validation"""
    validator = ProductionValidator()
    
    try:
        summary = validator.run_all_tests()
        validator.save_report()
        
        if summary['success_rate'] >= 80:
            print("\n🎉 Production deployment validation successful!")
            return 0
        else:
            print("\n❌ Production deployment validation failed!")
            return 1
            
    except Exception as e:
        print(f"\n💥 Validation failed with error: {e}")
        return 1

if __name__ == "__main__":
    exit(main())

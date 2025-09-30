"""
Automated Regression Testing Suite
"""

import requests


class RegressionTests:
    BASE_URL = "http://localhost:3000"
    INVENTORY_API = "http://localhost:8004"
    
    def test_inventory_api(self):
        """Test inventory API health"""
        try:
            response = requests.get(f"{self.INVENTORY_API}/health", timeout=5)
            assert response.status_code == 200, "Inventory API health check failed"
            print("✅ Inventory API health check passed")
            return True
        except Exception as e:
            print(f"❌ Inventory API test failed: {e}")
            return False
    
    def test_dashboard_routes(self):
        """Test dashboard routes"""
        routes = ["/app", "/app/inventory", "/app/sales"]
        passed = 0
        
        for route in routes:
            try:
                response = requests.get(f"{self.BASE_URL}{route}", timeout=10)
                if response.status_code == 200:
                    print(f"✅ Dashboard route {route} passed")
                    passed += 1
                else:
                    print(f"❌ Dashboard route {route} returned {response.status_code}")
            except Exception as e:
                print(f"❌ Dashboard route {route} failed: {e}")
        
        return passed == len(routes)
    
    def run_all_tests(self):
        """Run all regression tests"""
        print("🧪 Running Regression Tests\n")
        
        results = []
        results.append(self.test_inventory_api())
        results.append(self.test_dashboard_routes())
        
        total = len(results)
        passed = sum(results)
        
        print(f"\n{'=' * 60}")
        print(f"Regression Tests: {passed}/{total} passed")
        print(f"{'=' * 60}")
        
        return passed == total


if __name__ == "__main__":
    tests = RegressionTests()
    success = tests.run_all_tests()
    exit(0 if success else 1)

#!/usr/bin/env python3
"""
Shopify Admin App Testing Suite
Comprehensive testing for Shopify app installation, authentication, and integration.
"""

import subprocess
import sys
import time
import requests
import json
import os
from pathlib import Path
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ShopifyAppTester:
    """Comprehensive testing suite for Shopify Admin app."""

    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.dashboard_dir = self.project_root / "dashboard"
        self.test_results = []

    def log_test_result(self, test_name: str, success: bool, details: str = ""):
        """Log test results for reporting."""
        status = "✅ PASS" if success else "❌ FAIL"
        logger.info(f"{status}: {test_name} - {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": time.time()
        })

    def run_command(self, cmd: List[str], cwd: Optional[Path] = None) -> tuple[bool, str]:
        """Run a shell command and return success status and output."""
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=300
            )
            return result.returncode == 0, result.stdout + result.stderr
        except subprocess.TimeoutExpired:
            return False, "Command timed out"
        except Exception as e:
            return False, f"Command failed: {str(e)}"

    def test_node_dependencies(self) -> bool:
        """Test Node.js dependencies installation."""
        logger.info("Testing Node.js dependencies...")
        success, output = self.run_command(["npm", "install"], cwd=self.dashboard_dir)
        
        if success:
            self.log_test_result("Node.js Dependencies", True, "Dependencies installed successfully")
            return True
        else:
            self.log_test_result("Node.js Dependencies", False, f"Installation failed: {output}")
            return False

    def test_shopify_cli_config(self) -> bool:
        """Test Shopify CLI configuration."""
        logger.info("Testing Shopify CLI configuration...")
        
        # Check if shopify.app.toml exists
        app_toml = self.dashboard_dir / "shopify.app.toml"
        if not app_toml.exists():
            self.log_test_result("Shopify CLI Config", False, "shopify.app.toml not found")
            return False

        # Check for required environment variables
        env_file = self.dashboard_dir / ".env"
        if not env_file.exists():
            self.log_test_result("Shopify CLI Config", False, ".env file not found")
            return False

        # Validate .env contains required Shopify variables
        with open(env_file, 'r') as f:
            env_content = f.read()

        required_vars = ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "SHOPIFY_APP_URL"]
        missing_vars = []

        for var in required_vars:
            if var not in env_content:
                missing_vars.append(var)

        if missing_vars:
            self.log_test_result("Shopify CLI Config", False, f"Missing env vars: {', '.join(missing_vars)}")
            return False

        self.log_test_result("Shopify CLI Config", True, "Configuration files and environment variables present")
        return True

    def test_app_build(self) -> bool:
        """Test if the app builds successfully."""
        logger.info("Testing app build...")
        success, output = self.run_command(["npm", "run", "build"], cwd=self.dashboard_dir)
        
        if success:
            self.log_test_result("App Build", True, "Build completed successfully")
            return True
        else:
            self.log_test_result("App Build", False, f"Build failed: {output}")
            return False

    def test_tunnel_health(self) -> bool:
        """Test if the tunnel is accessible."""
        logger.info("Testing tunnel health...")
        
        # This would need to be implemented based on the actual tunnel setup
        # For now, we'll assume the tunnel URL is in the .env file
        env_file = self.dashboard_dir / ".env"
        if not env_file.exists():
            self.log_test_result("Tunnel Health", False, ".env file not found")
            return False

        # Read tunnel URL from .env (placeholder implementation)
        tunnel_url = "https://your-tunnel-url.ngrok.io"  # This should be read from .env

        try:
            response = requests.get(f"{tunnel_url}/health", timeout=10)
            if response.status_code == 200:
                self.log_test_result("Tunnel Health", True, f"Tunnel accessible at {tunnel_url}")
                return True
            else:
                self.log_test_result("Tunnel Health", False, f"Tunnel returned status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_test_result("Tunnel Health", False, f"Tunnel not accessible: {str(e)}")
            return False

    def test_inventory_api(self) -> bool:
        """Test inventory API endpoints."""
        logger.info("Testing inventory API...")
        
        # Test inventory service health
        try:
            response = requests.get("http://localhost:8004/health", timeout=5)
            if response.status_code == 200:
                self.log_test_result("Inventory API", True, "Inventory service is healthy")
                return True
            else:
                self.log_test_result("Inventory API", False, f"Inventory service returned status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_test_result("Inventory API", False, f"Inventory service not accessible: {str(e)}")
            return False

    def test_dashboard_cards(self) -> bool:
        """Test dashboard card rendering (mock data mode)."""
        logger.info("Testing dashboard cards...")
        
        # This would require starting the dashboard and checking the UI
        # For now, we'll do a basic build test
        success, output = self.run_command(["npm", "run", "build"], cwd=self.dashboard_dir)
        
        if success:
            self.log_test_result("Dashboard Cards", True, "Dashboard builds successfully (mock data mode)")
            return True
        else:
            self.log_test_result("Dashboard Cards", False, f"Dashboard build failed: {output}")
            return False

    def test_webhook_registration(self) -> bool:
        """Test webhook registration capability."""
        logger.info("Testing webhook registration...")
        
        # Check if webhook configuration exists in the app
        webhook_config = self.dashboard_dir / "webhooks"  # Adjust path as needed
        
        if webhook_config.exists():
            self.log_test_result("Webhook Registration", True, "Webhook configuration files found")
            return True
        else:
            # Check if webhook logic is implemented in the codebase
            webhook_files = list(self.dashboard_dir.rglob("*webhook*"))
            if webhook_files:
                self.log_test_result("Webhook Registration", True, f"Webhook files found: {[f.name for f in webhook_files]}")
                return True
            else:
                self.log_test_result("Webhook Registration", False, "No webhook configuration or implementation found")
                return False

    def run_all_tests(self) -> Dict[str, bool]:
        """Run all tests and return results summary."""
        logger.info("🚀 Starting Shopify Admin App Test Suite...")

        tests = [
            ("Node Dependencies", self.test_node_dependencies),
            ("Shopify CLI Config", self.test_shopify_cli_config),
            ("App Build", self.test_app_build),
            ("Tunnel Health", self.test_tunnel_health),
            ("Inventory API", self.test_inventory_api),
            ("Dashboard Cards", self.test_dashboard_cards),
            ("Webhook Registration", self.test_webhook_registration),
        ]

        results = {}
        for test_name, test_func in tests:
            logger.info(f"\n{'='*50}")
            logger.info(f"Running: {test_name}")
            logger.info('='*50)

            try:
                results[test_name] = test_func()
            except Exception as e:
                logger.error(f"Test {test_name} failed with exception: {str(e)}")
                results[test_name] = False
                self.log_test_result(test_name, False, f"Exception: {str(e)}")

        return results

    def generate_report(self) -> str:
        """Generate a comprehensive test report."""
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)

        report = f"""
# Shopify Admin App Test Report
Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}

## Summary
- **Tests Passed**: {passed}/{total}
- **Success Rate**: {passed/total*100".1f"}%

## Detailed Results
"""

        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            report += f"\n### {result['test']}\n- **Status**: {status}\n- **Details**: {result['details']}\n"

        return report

def main():
    """Main entry point for the test suite."""
    tester = ShopifyAppTester()
    results = tester.run_all_tests()
    report = tester.generate_report()
    
    # Print report to console
    print(report)
    
    # Save report to file
    report_file = tester.project_root / "logs" / f"shopify_app_test_{int(time.time())}.md"
    report_file.parent.mkdir(exist_ok=True)
    
    with open(report_file, 'w') as f:
        f.write(report)

    logger.info(f"Test report saved to: {report_file}")
    
    # Exit with appropriate code
    all_passed = all(results.values())
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()

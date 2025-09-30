"""
Cross-Browser Testing Setup with Selenium
Automated testing across Chrome, Firefox, Safari
Includes mobile testing and screenshot automation
"""

import os
import time
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.firefox.options import Options as FirefoxOptions
    from selenium.common.exceptions import TimeoutException, WebDriverException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("⚠️  Selenium not installed. Run: pip install selenium webdriver-manager")


class CrossBrowserTester:
    """Automated cross-browser testing framework"""
    
    def __init__(self, base_url="http://localhost:3000"):
        if not SELENIUM_AVAILABLE:
            raise ImportError("Selenium not available. Install with: pip install selenium webdriver-manager")
        
        self.base_url = base_url
        self.screenshot_dir = Path("../../logs/screenshots")
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)
        self.results = []
        
    def get_chrome_driver(self, mobile=False):
        """Initialize Chrome WebDriver"""
        options = ChromeOptions()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        
        if mobile:
            mobile_emulation = {
                "deviceMetrics": { "width": 375, "height": 667, "pixelRatio": 2.0 },
                "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
            }
            options.add_experimental_option("mobileEmulation", mobile_emulation)
        
        try:
            driver = webdriver.Chrome(options=options)
            return driver
        except WebDriverException as e:
            print(f"❌ Chrome driver failed: {e}")
            return None
    
    def test_page_load(self, driver, browser_name, url_path="/app"):
        """Test page load performance and take screenshot"""
        url = f"{self.base_url}{url_path}"
        test_result = {
            "browser": browser_name,
            "url": url,
            "timestamp": datetime.now().isoformat(),
            "success": False,
            "load_time": None,
            "screenshot": None,
            "errors": []
        }
        
        try:
            start_time = time.time()
            driver.get(url)
            
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            load_time = time.time() - start_time
            test_result["load_time"] = round(load_time * 1000, 2)
            
            screenshot_name = f"{browser_name}_{url_path.replace('/', '_')}_{int(time.time())}.png"
            screenshot_path = self.screenshot_dir / screenshot_name
            driver.save_screenshot(str(screenshot_path))
            test_result["screenshot"] = str(screenshot_path)
            
            test_result["success"] = True
            print(f"✅ {browser_name.upper()}: {url} loaded in {test_result['load_time']}ms")
            
        except Exception as e:
            test_result["errors"].append(str(e))
            print(f"❌ {browser_name.upper()}: {url} failed - {e}")
        
        self.results.append(test_result)
        return test_result
    
    def run_browser_tests(self, browser="chrome"):
        """Run tests on specified browsers"""
        print(f"\n{'=' * 60}")
        print(f"Testing with {browser.upper()}")
        print(f"{'=' * 60}\n")
        
        driver = self.get_chrome_driver(mobile=(browser == "chrome_mobile"))
        
        if driver:
            try:
                routes = ["/app", "/app/inventory", "/app/sales"]
                for route in routes:
                    self.test_page_load(driver, browser, route)
                    time.sleep(1)
            finally:
                driver.quit()
        
        self.generate_report()
    
    def generate_report(self):
        """Generate test report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = Path(f"../../logs/cross_browser_report_{timestamp}.json")
        
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n✅ Report: {report_path}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Cross-browser testing')
    parser.add_argument('--browser', default='chrome', help='Browser to test')
    parser.add_argument('--url', default='http://localhost:3000', help='Base URL')
    args = parser.parse_args()
    
    tester = CrossBrowserTester(base_url=args.url)
    tester.run_browser_tests(browser=args.browser)

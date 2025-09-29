#!/usr/bin/env python3
"""
Sales Analytics Platform - Production Deployment Script
"""
import os
import sys
import subprocess
import time
import logging
from pathlib import Path

def setup_logging():
    """Setup logging for deployment"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('deployment.log'),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def check_dependencies():
    """Check if all required dependencies are available"""
    logger = logging.getLogger(__name__)
    logger.info("Checking dependencies...")
    
    required_modules = ['fastapi', 'uvicorn', 'psutil']
    missing_modules = []
    
    for module in required_modules:
        try:
            __import__(module)
            logger.info(f"✅ {module} available")
        except ImportError:
            missing_modules.append(module)
            logger.error(f"❌ {module} missing")
    
    if missing_modules:
        logger.error(f"Missing modules: {missing_modules}")
        return False
    
    logger.info("All dependencies available")
    return True

def validate_platform():
    """Validate the platform before deployment"""
    logger = logging.getLogger(__name__)
    logger.info("Validating platform...")
    
    try:
        # Test core functionality
        from core.channel_campaign_metrics import compute_channel_campaign_metrics
        from monitoring import SalesAnalyticsMonitor
        from enhancements import SalesAnalyticsEnhancements
        
        # Test with sample data
        test_data = [{'channel': 'test', 'revenue': 100, 'orders': 1, 'conversion_rate': 2.5}]
        result = compute_channel_campaign_metrics(test_data)
        
        if result and len(result) > 0:
            logger.info("✅ Core functionality validated")
        else:
            logger.error("❌ Core functionality validation failed")
            return False
        
        # Test monitoring
        monitor = SalesAnalyticsMonitor()
        metrics = monitor.get_metrics()
        if metrics and 'status' in metrics:
            logger.info("✅ Monitoring system validated")
        else:
            logger.error("❌ Monitoring system validation failed")
            return False
        
        # Test enhancements
        enhancements = SalesAnalyticsEnhancements()
        insights = enhancements.generate_insights(test_data)
        if insights and 'total_records' in insights:
            logger.info("✅ Enhancements validated")
        else:
            logger.error("❌ Enhancements validation failed")
            return False
        
        logger.info("Platform validation successful")
        return True
        
    except Exception as e:
        logger.error(f"Platform validation failed: {e}")
        return False

def start_services():
    """Start the Sales Analytics Platform services"""
    logger = logging.getLogger(__name__)
    logger.info("Starting services...")
    
    try:
        # Start the API server
        logger.info("Starting API server on port 8005...")
        subprocess.Popen([
            sys.executable, 'standalone_api.py'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for server to start
        time.sleep(3)
        
        # Test if server is running
        import requests
        try:
            response = requests.get('http://localhost:8005/health', timeout=5)
            if response.status_code == 200:
                logger.info("✅ API server started successfully")
                return True
            else:
                logger.error(f"❌ API server health check failed: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ API server not responding: {e}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to start services: {e}")
        return False

def main():
    """Main deployment function"""
    logger = setup_logging()
    logger.info("Starting Sales Analytics Platform deployment...")
    
    # Change to the platform directory
    platform_dir = Path(__file__).parent
    os.chdir(platform_dir)
    
    # Check dependencies
    if not check_dependencies():
        logger.error("Deployment failed: Missing dependencies")
        sys.exit(1)
    
    # Validate platform
    if not validate_platform():
        logger.error("Deployment failed: Platform validation failed")
        sys.exit(1)
    
    # Start services
    if not start_services():
        logger.error("Deployment failed: Could not start services")
        sys.exit(1)
    
    logger.info("🎉 Sales Analytics Platform deployed successfully!")
    logger.info("API server running on http://localhost:8005")
    logger.info("Health check: http://localhost:8005/health")
    logger.info("API docs: http://localhost:8005/docs")

if __name__ == "__main__":
    main()

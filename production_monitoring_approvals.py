#!/usr/bin/env python3
"""
Production Monitoring Dashboard for Approvals System
"""

import asyncio
import json
import time
from datetime import datetime
import httpx
import psutil
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ApprovalsProductionMonitor:
    def __init__(self):
        self.approvals_url = "http://localhost:8005"
        self.metrics = {"uptime": 0, "requests_total": 0, "error_count": 0, "status": "healthy"}
        self.start_time = time.time()
        
    async def check_health(self):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.approvals_url}/docs")
                return {"status": "healthy" if response.status_code == 200 else "unhealthy", "timestamp": datetime.now().isoformat()}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e), "timestamp": datetime.now().isoformat()}
    
    def get_system_metrics(self):
        try:
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            return {"cpu_usage": cpu_percent, "memory_usage": memory.percent}
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {"cpu_usage": 0.0, "memory_usage": 0.0}
    
    async def run_monitoring_cycle(self):
        logger.info("🔍 Starting approvals monitoring cycle...")
        health_data = await self.check_health()
        system_data = self.get_system_metrics()
        
        self.metrics["uptime"] = time.time() - self.start_time
        self.metrics["status"] = health_data.get("status", "unknown")
        
        if health_data.get("status") == "healthy":
            self.metrics["requests_total"] += 1
        else:
            self.metrics["error_count"] += 1
        
        logger.info(f"Health: {health_data['status']}, CPU: {system_data['cpu_usage']:.1f}%, Memory: {system_data['memory_usage']:.1f}%")
        return {"health": health_data, "system": system_data}
    
    async def start_monitoring(self, interval=60):
        logger.info("🚀 Starting Approvals Production Monitoring...")
        while True:
            try:
                await self.run_monitoring_cycle()
                await asyncio.sleep(interval)
            except KeyboardInterrupt:
                logger.info("🛑 Monitoring stopped")
                break
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                await asyncio.sleep(interval)

async def main():
    monitor = ApprovalsProductionMonitor()
    await monitor.start_monitoring(interval=60)

if __name__ == "__main__":
    asyncio.run(main())

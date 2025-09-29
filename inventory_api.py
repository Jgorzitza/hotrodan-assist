#!/usr/bin/env python3
"""
Production Inventory API Service
High-performance inventory intelligence with MCP integration
"""

import os
import sys
import asyncio
import time
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Import our optimized components
from inventory_analytics_optimized import OptimizedInventoryAnalytics, InventorySkuDemand
from mcp_inventory_integration import McpInventoryIntegration, McpConfig

# Initialize FastAPI app
app = FastAPI(
    title="Inventory Intelligence API",
    description="High-performance inventory analytics with MCP integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
analytics_engine: Optional[OptimizedInventoryAnalytics] = None
mcp_integration: Optional[McpInventoryIntegration] = None

# Pydantic models
class InventoryAnalysisRequest(BaseModel):
    sku_demands: List[Dict[str, Any]]
    vendor_data: Optional[Dict[str, Any]] = None
    analysis_type: str = "comprehensive"

class InventoryAnalysisResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    processing_time: float
    sku_count: int
    timestamp: str

class HealthCheckResponse(BaseModel):
    status: str
    timestamp: str
    components: Dict[str, str]
    performance_metrics: Dict[str, Any]

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global analytics_engine, mcp_integration
    
    print("🚀 Starting Inventory Intelligence API...")
    
    # Initialize analytics engine
    analytics_engine = OptimizedInventoryAnalytics(
        max_workers=int(os.getenv('INVENTORY_MAX_WORKERS', '8')),
        cache_size=int(os.getenv('INVENTORY_CACHE_SIZE', '1000'))
    )
    
    # Initialize MCP integration
    mcp_config = McpConfig(
        connectors_api_url=os.getenv('CONNECTORS_API_URL', 'http://localhost:8003'),
        use_mock_data=os.getenv('USE_MOCK_DATA', 'true').lower() == 'true',
        enable_mcp=os.getenv('ENABLE_MCP', 'true').lower() == 'true'
    )
    mcp_integration = McpInventoryIntegration(mcp_config)
    
    print("✅ Inventory Intelligence API initialized successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global mcp_integration
    
    if mcp_integration:
        await mcp_integration.close()
    
    print("🛑 Inventory Intelligence API shutdown complete")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Inventory Intelligence API",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    components = {
        "analytics_engine": "operational" if analytics_engine else "error",
        "mcp_integration": "operational" if mcp_integration else "error"
    }
    
    performance_metrics = {}
    if analytics_engine:
        performance_metrics.update(analytics_engine.get_performance_metrics())
    if mcp_integration:
        performance_metrics.update(mcp_integration.get_performance_metrics())
    
    return HealthCheckResponse(
        status="healthy" if all(c == "operational" for c in components.values()) else "degraded",
        timestamp=datetime.now().isoformat(),
        components=components,
        performance_metrics=performance_metrics
    )

@app.post("/analyze", response_model=InventoryAnalysisResponse)
async def analyze_inventory(request: InventoryAnalysisRequest):
    """Analyze inventory with comprehensive analytics"""
    if not analytics_engine:
        raise HTTPException(status_code=503, detail="Analytics engine not available")
    
    start_time = time.time()
    
    try:
        # Convert request data to InventorySkuDemand objects
        sku_demands = []
        for sku_data in request.sku_demands:
            sku = InventorySkuDemand(
                sku_id=sku_data.get('sku_id', ''),
                sku=sku_data.get('sku', ''),
                current_stock=sku_data.get('current_stock', 0),
                demand_history=sku_data.get('demand_history', []),
                lead_time=sku_data.get('lead_time', 7),
                service_level=sku_data.get('service_level', 0.95),
                cost_per_unit=sku_data.get('cost_per_unit', 0.0),
                reorder_cost=sku_data.get('reorder_cost', 0.0),
                holding_cost_rate=sku_data.get('holding_cost_rate', 0.2)
            )
            sku_demands.append(sku)
        
        # Run analysis
        results = analytics_engine.analyze_inventory(sku_demands, request.vendor_data)
        
        processing_time = time.time() - start_time
        
        return InventoryAnalysisResponse(
            success=True,
            data=results,
            processing_time=processing_time,
            sku_count=len(sku_demands),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        processing_time = time.time() - start_time
        raise HTTPException(
            status_code=500, 
            detail=f"Analysis failed: {str(e)}"
        )

@app.get("/mcp/signals")
async def get_inventory_signals(sku_ids: str = ""):
    """Get inventory signals from MCP connectors"""
    if not mcp_integration:
        raise HTTPException(status_code=503, detail="MCP integration not available")
    
    try:
        sku_list = [sku.strip() for sku in sku_ids.split(',') if sku.strip()]
        signals = await mcp_integration.get_inventory_signals(sku_list)
        
        return {
            "success": True,
            "signals": [
                {
                    "sku_id": signal.sku_id,
                    "sku": signal.sku,
                    "source": signal.source,
                    "signal_type": signal.signal_type,
                    "value": signal.value,
                    "confidence": signal.confidence,
                    "timestamp": signal.timestamp,
                    "metadata": signal.metadata
                }
                for signal in signals
            ],
            "count": len(signals),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get inventory signals: {str(e)}"
        )

@app.get("/mcp/shopify/products")
async def get_shopify_products(limit: int = 100, page: int = 1):
    """Get products from Shopify via MCP"""
    if not mcp_integration:
        raise HTTPException(status_code=503, detail="MCP integration not available")
    
    try:
        products = await mcp_integration.get_shopify_products(limit=limit, page=page)
        
        return {
            "success": True,
            "products": [
                {
                    "id": product.id,
                    "title": product.title,
                    "sku": product.sku,
                    "inventory_quantity": product.inventory_quantity,
                    "price": product.price,
                    "vendor": product.vendor,
                    "product_type": product.product_type,
                    "tags": product.tags,
                    "created_at": product.created_at,
                    "updated_at": product.updated_at
                }
                for product in products
            ],
            "count": len(products),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get Shopify products: {str(e)}"
        )

@app.get("/performance/metrics")
async def get_performance_metrics():
    """Get performance metrics for monitoring"""
    metrics = {}
    
    if analytics_engine:
        metrics["analytics"] = analytics_engine.get_performance_metrics()
    
    if mcp_integration:
        metrics["mcp_integration"] = mcp_integration.get_performance_metrics()
    
    return {
        "success": True,
        "metrics": metrics,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/performance/optimize")
async def optimize_performance(sku_count: int):
    """Optimize performance for specific SKU count"""
    if not analytics_engine:
        raise HTTPException(status_code=503, detail="Analytics engine not available")
    
    try:
        analytics_engine.optimize_for_scale(sku_count)
        
        return {
            "success": True,
            "message": f"Optimized for {sku_count} SKUs",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Optimization failed: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(
        "inventory_api:app",
        host="0.0.0.0",
        port=8004,
        reload=True
    )

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json
import os
from datetime import datetime

app = FastAPI(
    title="MCP Connectors API",
    description="Mock MCP connectors for inventory integration",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data directory
MOCK_DATA_DIR = os.path.join(os.path.dirname(__file__), "mock_data")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "MCP Connectors API",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "MCP Connectors API",
        "version": "1.0.0",
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/shopify/products")
async def get_shopify_products():
    """Mock Shopify products endpoint"""
    try:
        mock_file = os.path.join(MOCK_DATA_DIR, "shopify_products.json")
        if os.path.exists(mock_file):
            with open(mock_file, "r") as f:
                return json.load(f)
        else:
            # Return mock data if file doesn't exist
            return {
                "products": [
                    {
                        "id": "mock-1",
                        "title": "Sample Product 1",
                        "inventory_quantity": 100,
                        "price": 29.99,
                        "vendor": "Mock Vendor 1",
                    },
                    {
                        "id": "mock-2",
                        "title": "Sample Product 2",
                        "inventory_quantity": 50,
                        "price": 49.99,
                        "vendor": "Mock Vendor 2",
                    },
                ]
            }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error loading Shopify data: {str(e)}"
        )


@app.get("/ga4/traffic-summary")
async def get_ga4_traffic():
    """Mock GA4 traffic summary endpoint"""
    try:
        mock_file = os.path.join(MOCK_DATA_DIR, "ga4_traffic.json")
        if os.path.exists(mock_file):
            with open(mock_file, "r") as f:
                return json.load(f)
        else:
            # Return mock data if file doesn't exist
            return {
                "sessions": 1250,
                "page_views": 3400,
                "bounce_rate": 0.35,
                "avg_session_duration": 180,
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading GA4 data: {str(e)}")


@app.get("/gsc/search-queries")
async def get_gsc_queries():
    """Mock GSC search queries endpoint"""
    try:
        mock_file = os.path.join(MOCK_DATA_DIR, "gsc_queries.json")
        if os.path.exists(mock_file):
            with open(mock_file, "r") as f:
                return json.load(f)
        else:
            # Return mock data if file doesn't exist
            return {
                "queries": [
                    {"query": "sample product", "clicks": 45, "impressions": 120},
                    {"query": "inventory management", "clicks": 23, "impressions": 67},
                ]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading GSC data: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)

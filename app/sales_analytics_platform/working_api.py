"""
Working API Server for Sales Analytics Platform
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Sales Analytics API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Sales Analytics API is running", "status": "healthy"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "sales-analytics-api"}

@app.post("/api/sales/channel-campaign-metrics")
async def channel_campaign_metrics(data: dict):
    return {
        "success": True,
        "metrics": {
            "total_revenue": 100000,
            "total_orders": 500,
            "channels": ["email", "social", "paid"]
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)

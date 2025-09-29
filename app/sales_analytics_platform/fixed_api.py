"""
Fixed Sales Analytics API Server

This server properly handles JSON data parsing for all analytics endpoints.
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os
import json

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import analytics modules
try:
    from core.channel_campaign_metrics import compute_channel_campaign_metrics
    from core.attribution_models import compare_attribution_models
    from core.funnel_dropoff import analyze_funnel_dropoff
    from core.forecast_rollup import compute_forecast_rollup
    from core.pricing_elasticity import compute_pricing_elasticity
    from core.margin_analysis import compute_margin_analysis
    from core.churn_indicator import compute_churn_risk
    from core.nudge_system import compute_next_best_actions
    from core.qbr_mbr_generator import generate_qbr_mbr_pack
    from core.rep_performance import compute_rep_performance
    MODULES_LOADED = True
except ImportError as e:
    print(f"Warning: Some modules failed to load: {e}")
    MODULES_LOADED = False

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
    return {
        "message": "Sales Analytics API is running", 
        "status": "healthy",
        "modules_loaded": MODULES_LOADED,
        "endpoints": [
            "/health",
            "/api/sales/channel-campaign-metrics",
            "/api/sales/attribution-models",
            "/api/sales/funnel-dropoff",
            "/api/sales/forecast-rollup",
            "/api/sales/pricing-elasticity",
            "/api/sales/margin-analysis",
            "/api/sales/churn-risk",
            "/api/sales/nudge-actions",
            "/api/sales/qbr-mbr-pack",
            "/api/sales/rep-performance"
        ]
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy", 
        "service": "sales-analytics-api",
        "modules_loaded": MODULES_LOADED
    }

async def parse_request_data(request: Request) -> dict:
    """Parse request data from JSON body."""
    try:
        body = await request.body()
        if body:
            return json.loads(body)
        return {}
    except Exception as e:
        print(f"Error parsing request data: {e}")
        return {}

@app.post("/api/sales/channel-campaign-metrics")
async def channel_campaign_metrics(request: Request):
    if not MODULES_LOADED:
        return {"error": "Analytics modules not loaded", "fallback": True}
    
    try:
        data = await parse_request_data(request)
        result = compute_channel_campaign_metrics(data)
        return result
    except Exception as e:
        return {"error": f"Channel campaign metrics failed: {str(e)}"}

@app.post("/api/sales/attribution-models")
async def attribution_models(request: Request):
    if not MODULES_LOADED:
        return {"error": "Analytics modules not loaded", "fallback": True}
    
    try:
        data = await parse_request_data(request)
        result = compare_attribution_models(data)
        return result
    except Exception as e:
        return {"error": f"Attribution models failed: {str(e)}"}

@app.post("/api/sales/funnel-dropoff")
async def funnel_dropoff(request: Request):
    if not MODULES_LOADED:
        return {"error": "Analytics modules not loaded", "fallback": True}
    
    try:
        data = await parse_request_data(request)
        result = analyze_funnel_dropoff(data)
        return result
    except Exception as e:
        return {"error": f"Funnel dropoff analysis failed: {str(e)}"}

@app.post("/api/sales/forecast-rollup")
async def forecast_rollup(request: Request):
    if not MODULES_LOADED:
        return {"error": "Analytics modules not loaded", "fallback": True}
    
    try:
        data = await parse_request_data(request)
        result = compute_forecast_rollup(data)
        return result
    except Exception as e:
        return {"error": f"Forecast rollup failed: {str(e)}"}

@app.post("/api/sales/pricing-elasticity")
async def pricing_elasticity(request: Request):
    if not MODULES_LOADED:
        return {"error": "Analytics modules not loaded", "fallback": True}
    
    try:
        data = await parse_request_data(request)
        result = compute_pricing_elasticity(data)
        return result
    except Exception as e:
        return {"error": f"Pricing elasticity failed: {str(e)}"}

@app.post("/api/sales/margin-analysis")
async def margin_analysis(request: Request):
    if not MODULES_LOADED:
        return {"error": "Analytics modules not loaded", "fallback": True}
    
    try:
        data = await parse_request_data(request)
        result = compute_margin_analysis(data)
        return result
    except Exception as e:
        return {"error": f"Margin analysis failed: {str(e)}"}

@app.post("/api/sales/churn-risk")
async def churn_risk(request: Request):
    if not MODULES_LOADED:
        return {"error": "Analytics modules not loaded", "fallback": True}
    
    try:
        data = await parse_request_data(request)
        result = compute_churn_risk(data)
        return result
    except Exception as e:
        return {"error": f"Churn risk analysis failed: {str(e)}"}

@app.post("/api/sales/nudge-actions")
async def nudge_actions(request: Request):
    if not MODULES_LOADED:
        return {"error": "Analytics modules not loaded", "fallback": True}
    
    try:
        data = await parse_request_data(request)
        result = compute_next_best_actions(data)
        return result
    except Exception as e:
        return {"error": f"Nudge actions failed: {str(e)}"}

@app.post("/api/sales/qbr-mbr-pack")
async def qbr_mbr_pack(request: Request):
    if not MODULES_LOADED:
        return {"error": "Analytics modules not loaded", "fallback": True}
    
    try:
        data = await parse_request_data(request)
        result = generate_qbr_mbr_pack(data)
        return result
    except Exception as e:
        return {"error": f"QBR/MBR pack generation failed: {str(e)}"}

@app.post("/api/sales/rep-performance")
async def rep_performance(request: Request):
    if not MODULES_LOADED:
        return {"error": "Analytics modules not loaded", "fallback": True}
    
    try:
        data = await parse_request_data(request)
        result = compute_rep_performance(data)
        return result
    except Exception as e:
        return {"error": f"Rep performance analysis failed: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)

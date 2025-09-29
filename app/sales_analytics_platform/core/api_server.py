import logging
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from .channel_campaign_metrics import compute_channel_campaign_metrics
from .attribution_models import compare_attribution_models
from .funnel_dropoff import analyze_funnel_dropoff
from .forecast_rollup import compute_forecast_rollup
from .pricing_elasticity import compute_pricing_elasticity
from .margin_analysis import compute_margin_analysis
from .churn_indicator import compute_churn_risk
from .nudge_system import compute_next_best_actions
from .qbr_mbr_generator import generate_qbr_mbr_pack
from .rep_performance import compute_rep_performance

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Sales Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/sales/channel-campaign-metrics")
async def post_channel_campaign_metrics(payload: Dict[str, Any]):
    try:
        records = payload.get("records", [])
        results = compute_channel_campaign_metrics(records)
        return {"success": True, "results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/attribution/compare")
async def post_attribution_comparison(payload: Dict[str, Any]):
    try:
        conversions = payload.get("conversions", [])
        results = compare_attribution_models(conversions)
        return {"success": True, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/funnel-dropoff")
async def post_funnel_dropoff_analysis(payload: Dict[str, Any]):
    try:
        events = payload.get("events", [])
        funnel_steps = payload.get("funnel_steps", [])
        results = analyze_funnel_dropoff(events, funnel_steps)
        return {"success": True, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/forecast/rollup")
async def post_forecast_rollup(payload: Dict[str, Any]):
    try:
        series = payload.get("series", [])
        group_by = payload.get("group_by", [])
        value_field = payload.get("value_field", "value")
        ci = payload.get("ci", 0.95)
        result = compute_forecast_rollup(series, group_by, value_field=value_field, ci=ci)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/pricing/elasticity")
async def post_pricing_elasticity(payload: Dict[str, Any]):
    try:
        data = payload.get("data", [])
        product_field = payload.get("product_field", "product_id")
        price_field = payload.get("price_field", "price")
        quantity_field = payload.get("quantity_field", "quantity")
        min_data_points = payload.get("min_data_points", 3)
        result = compute_pricing_elasticity(data, product_field=product_field, price_field=price_field, quantity_field=quantity_field, min_data_points=min_data_points)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/margin/analysis")
async def post_margin_analysis(payload: Dict[str, Any]):
    try:
        data = payload.get("data", [])
        revenue_field = payload.get("revenue_field", "revenue")
        cost_field = payload.get("cost_field", "cost")
        fees_field = payload.get("fees_field", "fees")
        discounts_field = payload.get("discounts_field", "discounts")
        returns_field = payload.get("returns_field", "returns")
        group_by = payload.get("group_by", [])
        result = compute_margin_analysis(data, revenue_field=revenue_field, cost_field=cost_field, fees_field=fees_field, discounts_field=discounts_field, returns_field=returns_field, group_by=group_by)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/churn/risk")
async def post_churn_risk(payload: Dict[str, Any]):
    try:
        customers = payload.get("customers", [])
        days_since_last_purchase = payload.get("days_since_last_purchase", 30)
        min_purchase_frequency = payload.get("min_purchase_frequency", 0.5)
        min_avg_order_value = payload.get("min_avg_order_value", 50.0)
        result = compute_churn_risk(customers, days_since_last_purchase=days_since_last_purchase, min_purchase_frequency=min_purchase_frequency, min_avg_order_value=min_avg_order_value)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/nudge/next-best-actions")
async def post_next_best_actions(payload: Dict[str, Any]):
    try:
        customers = payload.get("customers", [])
        segments = payload.get("segments")
        actions = payload.get("actions")
        result = compute_next_best_actions(customers, segments=segments, actions=actions)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/reports/qbr-mbr")
async def post_qbr_mbr_generator(payload: Dict[str, Any]):
    try:
        data = payload.get("data", {})
        report_type = payload.get("report_type", "QBR")
        period = payload.get("period")
        company_name = payload.get("company_name", "Company")
        include_charts = payload.get("include_charts", True)
        result = generate_qbr_mbr_pack(data, report_type=report_type, period=period, company_name=company_name, include_charts=include_charts)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sales/reps/performance")
async def post_rep_performance(payload: Dict[str, Any]):
    try:
        reps = payload.get("reps", [])
        period_days = payload.get("period_days", 30)
        team_averages = payload.get("team_averages", {})
        result = compute_rep_performance(reps, period_days=period_days, team_averages=team_averages)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "sales-analytics-api"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8004)

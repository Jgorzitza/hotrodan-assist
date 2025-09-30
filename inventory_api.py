"""
Production Inventory API - FastAPI application with all inventory modules.
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import logging
from datetime import datetime

# Import all inventory modules
from sync.stock_sync import MultiLocationStockSync, SkuStockState, LocationStock
from sync.safety_stock import DemandSeries, z_service_level, fixed_minimum, mad_service_level
from sync.demand_forecast import simple_moving_average, exponential_smoothing, seasonal_adjustment, holt_winters
from sync.purchase_orders import generate_purchase_recommendations, calculate_eoq, calculate_reorder_point
from sync.backorder_policy import BackorderConfig, BackorderRequest, BackorderPolicy, evaluate_backorder_request
from sync.low_stock_webhooks import LowStockWebhookManager, AlertConfig, AlertChannel, AlertUrgency
from sync.cycle_counts import CycleCountManager, CycleCountPlan, CountStatus
from sync.bom_kitting import BOMKittingManager, BOM, BOMItem
from sync.audit_ledger import AuditLedger, AdjustmentType, AdjustmentStatus
from sync.lead_time_variability import LeadTimeVariabilityModel, LeadTimeRecord

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Inventory Management API",
    description="Production inventory management system with all modules",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global managers
stock_sync = MultiLocationStockSync()
webhook_manager = LowStockWebhookManager()
cycle_count_manager = CycleCountManager()
bom_manager = BOMKittingManager()
audit_ledger = AuditLedger()
lead_time_model = LeadTimeVariabilityModel()

# Pydantic models
class StockUpdate(BaseModel):
    sku: str
    location_id: str
    available: int
    updated_at: str
    source: str
    metadata: Optional[Dict[str, Any]] = {}

class SafetyStockRequest(BaseModel):
    sku: str
    location_id: str
    demand_history: List[float]
    lead_time_periods: float
    service_level: float = 0.95
    method: str = "z_service_level"  # z_service_level, fixed_minimum, mad_service_level

class DemandForecastRequest(BaseModel):
    sku: str
    history: List[float]
    method: str = "simple_moving_average"
    periods: int = 3
    forecast_horizon: int = 12
    alpha: float = 0.3
    season_length: int = 12

class PurchaseOrderRequest(BaseModel):
    sku_data: List[Dict[str, Any]]
    current_stock: Dict[str, int]
    safety_stock: Dict[str, int]
    costs: Dict[str, Dict[str, float]]

class BackorderRequestModel(BaseModel):
    sku: str
    location_id: str
    requested_quantity: int
    customer_id: str
    priority: str = "normal"

class CycleCountRequest(BaseModel):
    plan_id: str
    location_id: str
    skus: List[str]
    scheduled_date: str
    assigned_to: str
    priority: str = "normal"

class BOMRequest(BaseModel):
    assembly_sku: str
    version: str
    items: List[Dict[str, Any]]
    is_active: bool = True

class AuditAdjustmentRequest(BaseModel):
    sku: str
    location_id: str
    adjustment_type: str
    quantity_change: int
    previous_quantity: int
    reason: str
    user_id: str
    reference_number: Optional[str] = None

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Stock sync endpoints
@app.post("/api/v1/stock/sync")
async def sync_stock(updates: List[StockUpdate], current_state: Optional[Dict[str, Any]] = None):
    """Sync stock across multiple locations with conflict resolution."""
    try:
        current = current_state or {}
        updates_data = [update.dict() for update in updates]
        merged_state, decisions = stock_sync.merge(current, updates_data)
        return {
            "merged_state": merged_state,
            "decisions": [decision.__dict__ for decision in decisions],
            "summary": stock_sync.decisions_summary(decisions)
        }
    except Exception as e:
        logger.error(f"Stock sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Safety stock endpoints
@app.post("/api/v1/safety-stock/calculate")
async def calculate_safety_stock(request: SafetyStockRequest):
    """Calculate safety stock for a SKU/location."""
    try:
        demand = DemandSeries(values=request.demand_history)
        
        if request.method == "z_service_level":
            result = z_service_level(demand, request.lead_time_periods, request.service_level)
        elif request.method == "fixed_minimum":
            result = fixed_minimum(int(request.lead_time_periods))
        elif request.method == "mad_service_level":
            result = mad_service_level(demand, request.lead_time_periods, request.service_level)
        else:
            raise HTTPException(status_code=400, detail="Invalid method")
        
        return {
            "sku": request.sku,
            "location_id": request.location_id,
            "safety_stock": result,
            "method": request.method,
            "service_level": request.service_level
        }
    except Exception as e:
        logger.error(f"Safety stock calculation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Demand forecasting endpoints
@app.post("/api/v1/forecast/demand")
async def forecast_demand(request: DemandForecastRequest):
    """Generate demand forecast using various methods."""
    try:
        if request.method == "simple_moving_average":
            result = simple_moving_average(request.history, request.periods, request.forecast_horizon)
        elif request.method == "exponential_smoothing":
            result = exponential_smoothing(request.history, request.alpha, request.forecast_horizon)
        elif request.method == "seasonal_adjustment":
            result = seasonal_adjustment(request.history, request.season_length, request.forecast_horizon)
        elif request.method == "holt_winters":
            result = holt_winters(request.history, request.alpha, 0.1, 0.1, request.season_length, request.forecast_horizon)
        else:
            raise HTTPException(status_code=400, detail="Invalid method")
        
        return {
            "sku": request.sku,
            "method": request.method,
            "forecast": {
                "periods": result.periods,
                "values": result.values,
                "method": result.method
            }
        }
    except Exception as e:
        logger.error(f"Demand forecast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Purchase order endpoints
@app.post("/api/v1/purchase-orders/recommendations")
async def get_purchase_recommendations(request: PurchaseOrderRequest):
    """Generate purchase order recommendations."""
    try:
        recommendations = generate_purchase_recommendations(
            request.sku_data,
            request.current_stock,
            request.safety_stock,
            request.costs
        )
        return {
            "recommendations": [rec.__dict__ for rec in recommendations]
        }
    except Exception as e:
        logger.error(f"Purchase order recommendations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Backorder policy endpoints
@app.post("/api/v1/backorder/evaluate")
async def evaluate_backorder(request: BackorderRequestModel):
    """Evaluate backorder request."""
    try:
        config = BackorderConfig(
            sku=request.sku,
            location_id=request.location_id,
            policy=BackorderPolicy.ALLOW,
            max_backorder_days=30,
            supplier_lead_time_days=14
        )
        
        backorder_request = BackorderRequest(
            sku=request.sku,
            location_id=request.location_id,
            requested_quantity=request.requested_quantity,
            customer_id=request.customer_id,
            priority=request.priority
        )
        
        result = evaluate_backorder_request(config, backorder_request)
        return result
    except Exception as e:
        logger.error(f"Backorder evaluation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Cycle count endpoints
@app.post("/api/v1/cycle-counts/plan")
async def create_cycle_count_plan(request: CycleCountRequest):
    """Create a cycle count plan."""
    try:
        plan = CycleCountPlan(
            plan_id=request.plan_id,
            location_id=request.location_id,
            skus=request.skus,
            scheduled_date=datetime.fromisoformat(request.scheduled_date),
            assigned_to=request.assigned_to,
            priority=request.priority
        )
        
        plan_id = cycle_count_manager.create_plan(plan)
        return {"plan_id": plan_id, "status": "created"}
    except Exception as e:
        logger.error(f"Cycle count plan creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# BOM/kitting endpoints
@app.post("/api/v1/bom/create")
async def create_bom(request: BOMRequest):
    """Create a BOM."""
    try:
        items = [BOMItem(**item) for item in request.items]
        bom = BOM(
            assembly_sku=request.assembly_sku,
            version=request.version,
            items=items,
            created_at=datetime.now(),
            is_active=request.is_active
        )
        
        key = bom_manager.add_bom(bom)
        return {"bom_key": key, "status": "created"}
    except Exception as e:
        logger.error(f"BOM creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Audit ledger endpoints
@app.post("/api/v1/audit/adjustment")
async def create_audit_adjustment(request: AuditAdjustmentRequest):
    """Create an audit adjustment entry."""
    try:
        adj_type = AdjustmentType(request.adjustment_type)
        entry_id = audit_ledger.create_adjustment(
            sku=request.sku,
            location_id=request.location_id,
            adjustment_type=adj_type,
            quantity_change=request.quantity_change,
            previous_quantity=request.previous_quantity,
            reason=request.reason,
            user_id=request.user_id,
            reference_number=request.reference_number
        )
        return {"entry_id": entry_id, "status": "created"}
    except Exception as e:
        logger.error(f"Audit adjustment creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Dashboard inventory endpoint
@app.get("/api/v1/dashboard/inventory")
async def get_dashboard_inventory(range: str = "7d", scenario: str = "base"):
    """Get dashboard inventory summary with metrics."""
    try:
        # Mock data for now - will be replaced with real data from stock_sync
        inventory_data = {
            "scenario": scenario,
            "state": "ok",
            "summary": {
                "skusAtRisk": 12,
                "averageCoverDays": 28.5,
                "openPoBudget": {
                    "amount": 45000.00,
                    "currency": "USD",
                    "formatted": "$45,000.00"
                }
            },
            "buckets": [
                {
                    "id": "urgent",
                    "label": "Urgent (< 7 days)",
                    "description": "SKUs requiring immediate replenishment",
                    "leadTimeDays": 3,
                    "skuCount": 3,
                    "valueAtRisk": {
                        "amount": 12500.00,
                        "currency": "USD",
                        "formatted": "$12,500.00"
                    }
                },
                {
                    "id": "air",
                    "label": "Air Freight (7-14 days)",
                    "description": "SKUs needing air freight replenishment",
                    "leadTimeDays": 10,
                    "skuCount": 5,
                    "valueAtRisk": {
                        "amount": 18750.00,
                        "currency": "USD",
                        "formatted": "$18,750.00"
                    }
                },
                {
                    "id": "sea",
                    "label": "Sea Freight (14-30 days)",
                    "description": "SKUs suitable for sea freight",
                    "leadTimeDays": 21,
                    "skuCount": 4,
                    "valueAtRisk": {
                        "amount": 8900.00,
                        "currency": "USD",
                        "formatted": "$8,900.00"
                    }
                },
                {
                    "id": "overstock",
                    "label": "Overstock",
                    "description": "SKUs with excess inventory",
                    "leadTimeDays": 0,
                    "skuCount": 2,
                    "valueAtRisk": {
                        "amount": 4850.00,
                        "currency": "USD",
                        "formatted": "$4,850.00"
                    }
                }
            ],
            "skus": [],
            "vendors": []
        }
        
        return {"success": True, "data": inventory_data}
    except Exception as e:
        logger.error(f"Dashboard inventory error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

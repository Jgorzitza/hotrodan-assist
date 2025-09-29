"""
Enhanced inventory API with advanced analytics, forecasting, and optimization.

Integrates all advanced engines into a comprehensive API.
"""
from __future__ import annotations
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json

from analytics_engine import InventoryAnalyticsEngine, InventoryMetrics, PerformanceKPIs
from advanced_forecasting import AdvancedForecastingEngine, ForecastResult
from optimization_engine import IntelligentOptimizationEngine, OptimizationResult

# Pydantic models for API
class TransactionRequest(BaseModel):
    sku: str
    transaction_type: str
    quantity: int
    value: float
    timestamp: datetime
    location: str = "default"

class DemandDataRequest(BaseModel):
    sku: str
    date: datetime
    demand: float
    additional_features: Optional[Dict[str, float]] = None

class SKURequest(BaseModel):
    sku: str
    current_quantity: float
    unit_cost: float
    storage_cost: float
    lead_time: int
    supplier: str

class ConstraintRequest(BaseModel):
    name: str
    constraint_type: str
    limit: float
    current_usage: float = 0.0
    weight: float = 1.0

class ObjectiveRequest(BaseModel):
    name: str
    objective_type: str
    weight: float
    current_value: float
    target_value: Optional[float] = None

class ForecastRequest(BaseModel):
    sku: str
    periods: int = 12
    confidence_level: float = 0.95

class OptimizationRequest(BaseModel):
    skus: List[str]
    include_constraints: bool = True

# Initialize FastAPI app
app = FastAPI(
    title="Enhanced Inventory Intelligence API",
    description="Advanced inventory management with analytics, forecasting, and optimization",
    version="2.0.0"
)

# Initialize engines
analytics_engine = InventoryAnalyticsEngine()
forecasting_engine = AdvancedForecastingEngine()
optimization_engine = IntelligentOptimizationEngine()

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Enhanced Inventory Intelligence API",
        "version": "2.0.0",
        "features": [
            "Advanced Analytics",
            "Demand Forecasting", 
            "Intelligent Optimization",
            "Multi-location Sync",
            "Real-time Monitoring"
        ],
        "endpoints": {
            "analytics": "/analytics/*",
            "forecasting": "/forecasting/*",
            "optimization": "/optimization/*",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "engines": {
            "analytics": "operational",
            "forecasting": "operational", 
            "optimization": "operational"
        }
    }

# Analytics endpoints
@app.post("/analytics/transaction")
async def add_transaction(transaction: TransactionRequest):
    """Add a transaction to analytics engine."""
    try:
        analytics_engine.add_transaction(
            transaction.sku,
            transaction.transaction_type,
            transaction.quantity,
            transaction.value,
            transaction.timestamp,
            transaction.location
        )
        return {"message": "Transaction added successfully", "sku": transaction.sku}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/analytics/metrics")
async def get_inventory_metrics(sku: Optional[str] = None):
    """Get comprehensive inventory metrics."""
    try:
        metrics = analytics_engine.calculate_inventory_metrics(sku)
        return {
            "total_skus": metrics.total_skus,
            "total_value": metrics.total_value,
            "turnover_rate": metrics.turnover_rate,
            "carrying_cost": metrics.carrying_cost,
            "stockout_rate": metrics.stockout_rate,
            "fill_rate": metrics.fill_rate,
            "abc_analysis": metrics.abc_analysis,
            "velocity_analysis": metrics.velocity_analysis,
            "seasonality_index": metrics.seasonality_index,
            "demand_variability": metrics.demand_variability
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/analytics/kpis")
async def get_performance_kpis():
    """Get key performance indicators."""
    try:
        kpis = analytics_engine.calculate_performance_kpis()
        return {
            "inventory_accuracy": kpis.inventory_accuracy,
            "order_fulfillment_rate": kpis.order_fulfillment_rate,
            "lead_time_performance": kpis.lead_time_performance,
            "supplier_performance": kpis.supplier_performance,
            "cost_efficiency": kpis.cost_efficiency,
            "customer_satisfaction": kpis.customer_satisfaction
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/analytics/trends/{sku}")
async def get_trend_analysis(sku: str, period_days: int = 30):
    """Get trend analysis for a SKU."""
    try:
        trend = analytics_engine.analyze_trends(sku, period_days)
        return {
            "sku": sku,
            "period": trend.period,
            "trend_direction": trend.trend_direction,
            "trend_strength": trend.trend_strength,
            "seasonality": trend.seasonality,
            "forecast_accuracy": trend.forecast_accuracy,
            "confidence_level": trend.confidence_level
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/analytics/report")
async def get_analytics_report():
    """Get comprehensive analytics report."""
    try:
        report = analytics_engine.generate_analytics_report()
        return report
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Forecasting endpoints
@app.post("/forecasting/demand")
async def add_demand_data(demand_data: DemandDataRequest):
    """Add demand data to forecasting engine."""
    try:
        forecasting_engine.add_demand_data(
            demand_data.sku,
            demand_data.date,
            demand_data.demand,
            demand_data.additional_features
        )
        return {"message": "Demand data added successfully", "sku": demand_data.sku}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/forecasting/forecast")
async def generate_forecast(request: ForecastRequest):
    """Generate demand forecast for a SKU."""
    try:
        result = forecasting_engine.generate_forecast(
            request.sku,
            request.periods,
            request.confidence_level
        )
        return {
            "sku": result.sku,
            "forecast_period": result.forecast_period,
            "forecast_values": result.forecast_values,
            "confidence_intervals": result.confidence_intervals,
            "accuracy_metrics": result.accuracy_metrics,
            "model_used": result.model_used,
            "seasonality_detected": result.seasonality_detected,
            "trend_detected": result.trend_detected,
            "confidence_score": result.confidence_score
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/forecasting/multi-sku")
async def generate_multi_sku_forecast(skus: List[str], periods: int = 12):
    """Generate forecasts for multiple SKUs."""
    try:
        results = forecasting_engine.generate_multi_sku_forecast(skus, periods)
        return {
            sku: {
                "forecast_period": result.forecast_period,
                "forecast_values": result.forecast_values,
                "model_used": result.model_used,
                "confidence_score": result.confidence_score
            }
            for sku, result in results.items()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/forecasting/seasonality/{sku}")
async def detect_seasonality(sku: str, season_length: int = 12):
    """Detect seasonality in demand data."""
    try:
        seasonality = forecasting_engine.detect_seasonality(sku, season_length)
        return {"sku": sku, "seasonality_detected": seasonality}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/forecasting/trend/{sku}")
async def detect_trend(sku: str):
    """Detect trend in demand data."""
    try:
        trend = forecasting_engine.detect_trend(sku)
        return {"sku": sku, "trend_direction": trend}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Optimization endpoints
@app.post("/optimization/sku")
async def add_sku(sku_data: SKURequest):
    """Add SKU to optimization engine."""
    try:
        optimization_engine.add_sku(
            sku_data.sku,
            sku_data.current_quantity,
            sku_data.unit_cost,
            sku_data.storage_cost,
            sku_data.lead_time,
            sku_data.supplier
        )
        return {"message": "SKU added successfully", "sku": sku_data.sku}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/optimization/constraint")
async def add_constraint(constraint: ConstraintRequest):
    """Add constraint to optimization engine."""
    try:
        optimization_engine.add_constraint(
            constraint.name,
            constraint.constraint_type,
            constraint.limit,
            constraint.current_usage,
            constraint.weight
        )
        return {"message": "Constraint added successfully", "name": constraint.name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/optimization/objective")
async def add_objective(objective: ObjectiveRequest):
    """Add objective to optimization engine."""
    try:
        optimization_engine.add_objective(
            objective.name,
            objective.objective_type,
            objective.weight,
            objective.current_value,
            objective.target_value
        )
        return {"message": "Objective added successfully", "name": objective.name}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/optimization/optimize")
async def optimize_inventory(request: OptimizationRequest):
    """Optimize inventory for specified SKUs."""
    try:
        if request.include_constraints:
            results = optimization_engine.optimize_with_constraints()
        else:
            results = optimization_engine.optimize_multi_sku()
        
        # Filter results for requested SKUs
        filtered_results = {sku: results[sku] for sku in request.skus if sku in results}
        
        return {
            "optimization_results": {
                sku: {
                    "recommended_quantity": result.recommended_quantity,
                    "current_quantity": result.current_quantity,
                    "improvement_potential": result.improvement_potential,
                    "constraints_satisfied": result.constraints_satisfied,
                    "objectives_improved": result.objectives_improved,
                    "confidence_score": result.confidence_score,
                    "reasoning": result.reasoning
                }
                for sku, result in filtered_results.items()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/optimization/report")
async def get_optimization_report():
    """Get comprehensive optimization report."""
    try:
        report = optimization_engine.generate_optimization_report()
        return report
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/optimization/constraints")
async def get_constraints():
    """Get all constraints."""
    try:
        return {
            constraint_name: {
                "constraint_type": constraint.constraint_type,
                "limit": constraint.limit,
                "current_usage": constraint.current_usage,
                "weight": constraint.weight
            }
            for constraint_name, constraint in optimization_engine.constraints.items()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/optimization/objectives")
async def get_objectives():
    """Get all objectives."""
    try:
        return {
            objective_name: {
                "objective_type": objective.objective_type,
                "weight": objective.weight,
                "current_value": objective.current_value,
                "target_value": objective.target_value
            }
            for objective_name, objective in optimization_engine.objectives.items()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Combined intelligence endpoints
@app.get("/intelligence/dashboard")
async def get_intelligence_dashboard():
    """Get comprehensive intelligence dashboard."""
    try:
        # Get analytics report
        analytics_report = analytics_engine.generate_analytics_report()
        
        # Get optimization report
        optimization_report = optimization_engine.generate_optimization_report()
        
        # Get top SKUs for forecasting
        top_skus = list(analytics_engine.historical_data.keys())[:5]
        forecasts = {}
        for sku in top_skus:
            try:
                forecast = forecasting_engine.generate_forecast(sku, periods=6)
                forecasts[sku] = {
                    "forecast_values": forecast.forecast_values[:6],
                    "confidence_score": forecast.confidence_score,
                    "model_used": forecast.model_used
                }
            except:
                forecasts[sku] = {"error": "Insufficient data for forecasting"}
        
        return {
            "timestamp": datetime.now().isoformat(),
            "analytics": analytics_report,
            "optimization": optimization_report,
            "forecasts": forecasts,
            "summary": {
                "total_skus": analytics_report["inventory_metrics"]["total_skus"],
                "total_value": analytics_report["inventory_metrics"]["total_value"],
                "optimization_potential": optimization_report["total_improvement_potential"],
                "forecasted_skus": len(forecasts)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/intelligence/recommendations")
async def get_intelligence_recommendations(skus: List[str]):
    """Get intelligent recommendations for specified SKUs."""
    try:
        recommendations = []
        
        for sku in skus:
            sku_recommendations = {
                "sku": sku,
                "analytics": {},
                "forecasting": {},
                "optimization": {}
            }
            
            # Analytics recommendations
            try:
                trend = analytics_engine.analyze_trends(sku)
                sku_recommendations["analytics"] = {
                    "trend_direction": trend.trend_direction,
                    "trend_strength": trend.trend_strength,
                    "seasonality": trend.seasonality,
                    "confidence_level": trend.confidence_level
                }
            except:
                sku_recommendations["analytics"] = {"error": "Insufficient data"}
            
            # Forecasting recommendations
            try:
                forecast = forecasting_engine.generate_forecast(sku, periods=12)
                sku_recommendations["forecasting"] = {
                    "next_month_demand": forecast.forecast_values[0] if forecast.forecast_values else 0,
                    "confidence_score": forecast.confidence_score,
                    "model_used": forecast.model_used,
                    "seasonality_detected": forecast.seasonality_detected
                }
            except:
                sku_recommendations["forecasting"] = {"error": "Insufficient data"}
            
            # Optimization recommendations
            try:
                if sku in optimization_engine.skus:
                    result = optimization_engine.optimize_single_sku(sku)
                    sku_recommendations["optimization"] = {
                        "recommended_quantity": result.recommended_quantity,
                        "improvement_potential": result.improvement_potential,
                        "confidence_score": result.confidence_score,
                        "reasoning": result.reasoning
                    }
                else:
                    sku_recommendations["optimization"] = {"error": "SKU not in optimization engine"}
            except:
                sku_recommendations["optimization"] = {"error": "Optimization failed"}
            
            recommendations.append(sku_recommendations)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "recommendations": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)

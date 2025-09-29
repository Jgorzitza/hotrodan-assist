"""
Advanced inventory analytics engine.

Provides comprehensive analytics, reporting, and business intelligence
for inventory management operations.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import statistics
import math
from collections import defaultdict, Counter

@dataclass
class InventoryMetrics:
    """Comprehensive inventory metrics."""
    total_skus: int
    total_value: float
    turnover_rate: float
    carrying_cost: float
    stockout_rate: float
    fill_rate: float
    abc_analysis: Dict[str, int]
    velocity_analysis: Dict[str, int]
    seasonality_index: Dict[str, float]
    demand_variability: Dict[str, float]

@dataclass
class PerformanceKPIs:
    """Key performance indicators."""
    inventory_accuracy: float
    order_fulfillment_rate: float
    lead_time_performance: float
    supplier_performance: float
    cost_efficiency: float
    customer_satisfaction: float

@dataclass
class TrendAnalysis:
    """Trend analysis results."""
    period: str
    trend_direction: str  # increasing, decreasing, stable
    trend_strength: float  # 0-1
    seasonality: bool
    forecast_accuracy: float
    confidence_level: float

class InventoryAnalyticsEngine:
    def __init__(self):
        self.historical_data: Dict[str, List[Dict]] = defaultdict(list)
        self.metrics_cache: Dict[str, Any] = {}
        self.last_calculation: Optional[datetime] = None
    
    def add_transaction(self, sku: str, transaction_type: str, quantity: int, 
                       value: float, timestamp: datetime, location: str = "default"):
        """Add a transaction to historical data."""
        transaction = {
            "sku": sku,
            "type": transaction_type,
            "quantity": quantity,
            "value": value,
            "timestamp": timestamp,
            "location": location
        }
        self.historical_data[sku].append(transaction)
        self.historical_data[sku].sort(key=lambda x: x["timestamp"])
    
    def calculate_inventory_metrics(self, sku: Optional[str] = None) -> InventoryMetrics:
        """Calculate comprehensive inventory metrics."""
        if sku:
            skus = [sku]
        else:
            skus = list(self.historical_data.keys())
        
        total_skus = len(skus)
        total_value = 0.0
        turnover_rates = []
        carrying_costs = []
        stockout_events = 0
        total_orders = 0
        filled_orders = 0
        
        abc_counts = {"A": 0, "B": 0, "C": 0}
        velocity_counts = {"Fast": 0, "Medium": 0, "Slow": 0}
        seasonality_data = defaultdict(list)
        demand_variability = {}
        
        for sku in skus:
            if not self.historical_data[sku]:
                continue
            
            # Calculate value and turnover
            sku_value = sum(t["value"] for t in self.historical_data[sku] if t["type"] == "receipt")
            total_value += sku_value
            
            # Calculate turnover rate
            receipts = [t for t in self.historical_data[sku] if t["type"] == "receipt"]
            shipments = [t for t in self.historical_data[sku] if t["type"] == "shipment"]
            
            if receipts and shipments:
                avg_inventory = sum(t["quantity"] for t in receipts) / len(receipts)
                annual_demand = sum(t["quantity"] for t in shipments) * 12  # Annualize
                turnover_rate = annual_demand / avg_inventory if avg_inventory > 0 else 0
                turnover_rates.append(turnover_rate)
            
            # Calculate carrying cost (simplified)
            carrying_cost = sku_value * 0.25  # 25% annual carrying cost
            carrying_costs.append(carrying_cost)
            
            # Track stockouts and fill rates
            current_stock = sum(t["quantity"] for t in self.historical_data[sku] if t["type"] == "receipt") - \
                           sum(t["quantity"] for t in self.historical_data[sku] if t["type"] == "shipment")
            
            if current_stock <= 0:
                stockout_events += 1
            
            # Track orders
            orders = [t for t in self.historical_data[sku] if t["type"] == "order"]
            total_orders += len(orders)
            filled_orders += len([t for t in orders if t["quantity"] > 0])
            
            # ABC Analysis (by value)
            if sku_value > total_value * 0.8 / total_skus:
                abc_counts["A"] += 1
            elif sku_value > total_value * 0.15 / total_skus:
                abc_counts["B"] += 1
            else:
                abc_counts["C"] += 1
            
            # Velocity Analysis (by turnover)
            if turnover_rates and turnover_rates[-1] > 6:
                velocity_counts["Fast"] += 1
            elif turnover_rates and turnover_rates[-1] > 2:
                velocity_counts["Medium"] += 1
            else:
                velocity_counts["Slow"] += 1
            
            # Seasonality analysis
            monthly_demand = defaultdict(int)
            for t in self.historical_data[sku]:
                if t["type"] == "shipment":
                    month = t["timestamp"].month
                    monthly_demand[month] += t["quantity"]
            
            if monthly_demand:
                avg_demand = sum(monthly_demand.values()) / len(monthly_demand)
                seasonality_index = {str(m): monthly_demand[m] / avg_demand for m in monthly_demand}
                seasonality_data[sku] = seasonality_index
                
                # Calculate demand variability
                demands = list(monthly_demand.values())
                if len(demands) > 1:
                    cv = statistics.stdev(demands) / statistics.mean(demands) if statistics.mean(demands) > 0 else 0
                    demand_variability[sku] = cv
        
        # Calculate aggregate metrics
        avg_turnover = statistics.mean(turnover_rates) if turnover_rates else 0
        total_carrying_cost = sum(carrying_costs)
        stockout_rate = stockout_events / total_skus if total_skus > 0 else 0
        fill_rate = filled_orders / total_orders if total_orders > 0 else 0
        
        # Calculate seasonality index
        seasonality_index = {}
        if seasonality_data:
            all_months = set()
            for sku_data in seasonality_data.values():
                all_months.update(sku_data.keys())
            
            for month in all_months:
                month_values = [data.get(month, 1.0) for data in seasonality_data.values()]
                seasonality_index[month] = statistics.mean(month_values)
        
        return InventoryMetrics(
            total_skus=total_skus,
            total_value=total_value,
            turnover_rate=avg_turnover,
            carrying_cost=total_carrying_cost,
            stockout_rate=stockout_rate,
            fill_rate=fill_rate,
            abc_analysis=abc_counts,
            velocity_analysis=velocity_counts,
            seasonality_index=seasonality_index,
            demand_variability=demand_variability
        )
    
    def calculate_performance_kpis(self) -> PerformanceKPIs:
        """Calculate key performance indicators."""
        # Inventory accuracy (simplified)
        accuracy_checks = 0
        accurate_checks = 0
        
        for sku, transactions in self.historical_data.items():
            if len(transactions) > 10:  # Only for SKUs with sufficient data
                accuracy_checks += 1
                # Simulate accuracy check (in real system, compare with cycle counts)
                accurate_checks += 1  # Simplified for demo
        
        inventory_accuracy = accurate_checks / accuracy_checks if accuracy_checks > 0 else 0.95
        
        # Order fulfillment rate
        total_orders = sum(1 for transactions in self.historical_data.values() 
                          for t in transactions if t["type"] == "order")
        fulfilled_orders = sum(1 for transactions in self.historical_data.values() 
                              for t in transactions if t["type"] == "shipment")
        order_fulfillment_rate = fulfilled_orders / total_orders if total_orders > 0 else 0.96
        
        # Lead time performance (simplified)
        lead_times = []
        for sku, transactions in self.historical_data.items():
            orders = [t for t in transactions if t["type"] == "order"]
            receipts = [t for t in transactions if t["type"] == "receipt"]
            
            for order in orders:
                # Find next receipt after order
                for receipt in receipts:
                    if receipt["timestamp"] > order["timestamp"]:
                        lead_time = (receipt["timestamp"] - order["timestamp"]).days
                        lead_times.append(lead_time)
                        break
        
        avg_lead_time = statistics.mean(lead_times) if lead_times else 5
        target_lead_time = 7
        lead_time_performance = max(0, 1 - (avg_lead_time - target_lead_time) / target_lead_time)
        
        # Supplier performance (simplified)
        supplier_performance = 0.92  # Simulated
        
        # Cost efficiency
        total_revenue = sum(t["value"] for transactions in self.historical_data.values() 
                           for t in transactions if t["type"] == "shipment")
        total_costs = sum(t["value"] for transactions in self.historical_data.values() 
                         for t in transactions if t["type"] == "receipt")
        cost_efficiency = total_revenue / total_costs if total_costs > 0 else 1.0
        
        # Customer satisfaction (simplified)
        customer_satisfaction = 0.94  # Simulated
        
        return PerformanceKPIs(
            inventory_accuracy=inventory_accuracy,
            order_fulfillment_rate=order_fulfillment_rate,
            lead_time_performance=lead_time_performance,
            supplier_performance=supplier_performance,
            cost_efficiency=cost_efficiency,
            customer_satisfaction=customer_satisfaction
        )
    
    def analyze_trends(self, sku: str, period_days: int = 30) -> TrendAnalysis:
        """Analyze trends for a specific SKU."""
        if sku not in self.historical_data:
            return TrendAnalysis("N/A", "unknown", 0.0, False, 0.0, 0.0)
        
        transactions = self.historical_data[sku]
        if len(transactions) < 5:
            return TrendAnalysis("N/A", "insufficient_data", 0.0, False, 0.0, 0.0)
        
        # Get recent data
        cutoff_date = datetime.now() - timedelta(days=period_days)
        recent_transactions = [t for t in transactions if t["timestamp"] >= cutoff_date]
        
        if len(recent_transactions) < 3:
            return TrendAnalysis("N/A", "insufficient_data", 0.0, False, 0.0, 0.0)
        
        # Calculate trend
        shipments = [t for t in recent_transactions if t["type"] == "shipment"]
        if len(shipments) < 3:
            return TrendAnalysis("N/A", "insufficient_data", 0.0, False, 0.0, 0.0)
        
        # Simple linear trend
        quantities = [t["quantity"] for t in shipments]
        x_values = list(range(len(quantities)))
        
        n = len(quantities)
        sum_x = sum(x_values)
        sum_y = sum(quantities)
        sum_xy = sum(x * y for x, y in zip(x_values, quantities))
        sum_x2 = sum(x * x for x in x_values)
        
        if n * sum_x2 - sum_x * sum_x == 0:
            slope = 0
        else:
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        
        # Determine trend direction
        if slope > 0.1:
            trend_direction = "increasing"
        elif slope < -0.1:
            trend_direction = "decreasing"
        else:
            trend_direction = "stable"
        
        trend_strength = min(1.0, abs(slope) / max(quantities) if max(quantities) > 0 else 0)
        
        # Check for seasonality (simplified)
        monthly_data = defaultdict(list)
        for t in shipments:
            month = t["timestamp"].month
            monthly_data[month].append(t["quantity"])
        
        seasonality = len(monthly_data) > 3 and any(len(data) > 1 for data in monthly_data.values())
        
        # Calculate forecast accuracy (simplified)
        forecast_accuracy = 0.85  # Simulated
        
        # Calculate confidence level
        confidence_level = min(1.0, len(shipments) / 20)  # More data = higher confidence
        
        return TrendAnalysis(
            period=f"{period_days} days",
            trend_direction=trend_direction,
            trend_strength=trend_strength,
            seasonality=seasonality,
            forecast_accuracy=forecast_accuracy,
            confidence_level=confidence_level
        )
    
    def generate_analytics_report(self) -> Dict[str, Any]:
        """Generate comprehensive analytics report."""
        metrics = self.calculate_inventory_metrics()
        kpis = self.calculate_performance_kpis()
        
        # Analyze trends for top SKUs
        top_skus = sorted(self.historical_data.keys(), 
                         key=lambda x: len(self.historical_data[x]), reverse=True)[:10]
        
        trend_analyses = {}
        for sku in top_skus:
            trend_analyses[sku] = self.analyze_trends(sku)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "inventory_metrics": {
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
            },
            "performance_kpis": {
                "inventory_accuracy": kpis.inventory_accuracy,
                "order_fulfillment_rate": kpis.order_fulfillment_rate,
                "lead_time_performance": kpis.lead_time_performance,
                "supplier_performance": kpis.supplier_performance,
                "cost_efficiency": kpis.cost_efficiency,
                "customer_satisfaction": kpis.customer_satisfaction
            },
            "trend_analyses": {
                sku: {
                    "period": analysis.period,
                    "trend_direction": analysis.trend_direction,
                    "trend_strength": analysis.trend_strength,
                    "seasonality": analysis.seasonality,
                    "forecast_accuracy": analysis.forecast_accuracy,
                    "confidence_level": analysis.confidence_level
                }
                for sku, analysis in trend_analyses.items()
            },
            "recommendations": self._generate_recommendations(metrics, kpis, trend_analyses)
        }
    
    def _generate_recommendations(self, metrics: InventoryMetrics, kpis: PerformanceKPIs, 
                                 trends: Dict[str, TrendAnalysis]) -> List[str]:
        """Generate actionable recommendations based on analytics."""
        recommendations = []
        
        # Inventory optimization recommendations
        if metrics.stockout_rate > 0.05:
            recommendations.append("High stockout rate detected - consider increasing safety stock levels")
        
        if metrics.turnover_rate < 2:
            recommendations.append("Low inventory turnover - review slow-moving items and consider promotions")
        
        if metrics.carrying_cost > metrics.total_value * 0.3:
            recommendations.append("High carrying costs - optimize inventory levels and reduce excess stock")
        
        # Performance improvement recommendations
        if kpis.inventory_accuracy < 0.95:
            recommendations.append("Inventory accuracy below target - implement more frequent cycle counts")
        
        if kpis.order_fulfillment_rate < 0.95:
            recommendations.append("Order fulfillment rate below target - review stock levels and supplier performance")
        
        if kpis.lead_time_performance < 0.8:
            recommendations.append("Lead time performance below target - work with suppliers to improve delivery times")
        
        # Trend-based recommendations
        for sku, trend in trends.items():
            if trend.trend_direction == "increasing" and trend.trend_strength > 0.5:
                recommendations.append(f"SKU {sku} showing strong upward trend - consider increasing stock levels")
            elif trend.trend_direction == "decreasing" and trend.trend_strength > 0.5:
                recommendations.append(f"SKU {sku} showing downward trend - consider reducing stock levels")
        
        return recommendations

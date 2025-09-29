"""
Purchase order recommendations generator.

Methods:
- EOQ (Economic Order Quantity)
- Reorder point calculation
- Order quantity optimization
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional
import math


@dataclass
class PurchaseOrderRecommendation:
    sku: str
    location_id: str
    recommended_quantity: int
    reorder_point: int
    current_stock: int
    urgency: str  # low, medium, high, critical
    reasoning: str
    estimated_cost: Optional[float] = None


def calculate_eoq(demand_rate: float, ordering_cost: float, holding_cost_rate: float, unit_cost: float) -> int:
    """Calculate Economic Order Quantity."""
    if demand_rate <= 0 or ordering_cost <= 0 or holding_cost_rate <= 0 or unit_cost <= 0:
        return 0
    
    holding_cost_per_unit = unit_cost * holding_cost_rate
    eoq = math.sqrt((2 * demand_rate * ordering_cost) / holding_cost_per_unit)
    return max(1, int(round(eoq)))


def calculate_reorder_point(demand_rate: float, lead_time: float, safety_stock: int) -> int:
    """Calculate reorder point."""
    if demand_rate <= 0 or lead_time <= 0:
        return safety_stock
    
    reorder_point = int(demand_rate * lead_time) + safety_stock
    return max(safety_stock, reorder_point)


def generate_purchase_recommendations(
    sku_data: List[dict],
    current_stock: dict,
    safety_stock: dict,
    costs: dict
) -> List[PurchaseOrderRecommendation]:
    """Generate purchase order recommendations for multiple SKUs."""
    recommendations = []
    
    for sku_info in sku_data:
        sku = sku_info.get('sku', '')
        location_id = sku_info.get('location_id', '')
        demand_rate = sku_info.get('demand_rate', 0.0)
        lead_time = sku_info.get('lead_time', 1.0)
        
        if not sku or not location_id:
            continue
        
        # Get current stock and safety stock
        stock_key = f"{sku}_{location_id}"
        current = current_stock.get(stock_key, 0)
        safety = safety_stock.get(stock_key, 0)
        
        # Get costs
        cost_key = f"{sku}_{location_id}"
        unit_cost = costs.get(cost_key, {}).get('unit_cost', 1.0)
        ordering_cost = costs.get(cost_key, {}).get('ordering_cost', 10.0)
        holding_cost_rate = costs.get(cost_key, {}).get('holding_cost_rate', 0.2)
        
        # Calculate recommendations
        eoq = calculate_eoq(demand_rate, ordering_cost, holding_cost_rate, unit_cost)
        reorder_point = calculate_reorder_point(demand_rate, lead_time, safety)
        
        # Determine urgency
        if current <= safety:
            urgency = "critical"
            recommended_qty = max(eoq, safety * 2)
            reasoning = f"Stock below safety level ({current} <= {safety})"
        elif current <= reorder_point:
            urgency = "high"
            recommended_qty = eoq
            reasoning = f"Stock at reorder point ({current} <= {reorder_point})"
        elif current <= reorder_point * 1.2:
            urgency = "medium"
            recommended_qty = eoq // 2 if eoq > 1 else 1
            reasoning = f"Stock approaching reorder point ({current} <= {int(reorder_point * 1.2)})"
        else:
            urgency = "low"
            recommended_qty = 0
            reasoning = f"Stock sufficient ({current} > {int(reorder_point * 1.2)})"
        
        # Calculate estimated cost
        estimated_cost = recommended_qty * unit_cost if recommended_qty > 0 else 0.0
        
        recommendations.append(PurchaseOrderRecommendation(
            sku=sku,
            location_id=location_id,
            recommended_quantity=recommended_qty,
            reorder_point=reorder_point,
            current_stock=current,
            urgency=urgency,
            reasoning=reasoning,
            estimated_cost=estimated_cost
        ))
    
    return recommendations

"""
Intelligent inventory optimization engine.

Provides advanced optimization algorithms for inventory management
including multi-objective optimization and constraint handling.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple, Set
from datetime import datetime, timedelta
import statistics
import math
import random
from collections import defaultdict

@dataclass
class OptimizationConstraint:
    """Constraint for optimization problem."""
    name: str
    constraint_type: str  # 'budget', 'space', 'supplier', 'lead_time'
    limit: float
    current_usage: float
    weight: float = 1.0

@dataclass
class OptimizationObjective:
    """Objective for optimization problem."""
    name: str
    objective_type: str  # 'minimize', 'maximize'
    weight: float
    current_value: float
    target_value: Optional[float] = None

@dataclass
class OptimizationResult:
    """Result of optimization process."""
    sku: str
    recommended_quantity: float
    current_quantity: float
    improvement_potential: float
    constraints_satisfied: List[str]
    objectives_improved: List[str]
    confidence_score: float
    reasoning: str

class IntelligentOptimizationEngine:
    def __init__(self):
        self.skus: Set[str] = set()
        self.constraints: Dict[str, OptimizationConstraint] = {}
        self.objectives: Dict[str, OptimizationObjective] = {}
        self.historical_data: Dict[str, List[Dict]] = defaultdict(list)
        self.optimization_history: List[Dict] = []
    
    def add_sku(self, sku: str, current_quantity: float, unit_cost: float, 
                storage_cost: float, lead_time: int, supplier: str):
        """Add SKU to optimization problem."""
        self.skus.add(sku)
        self.historical_data[sku] = [{
            "timestamp": datetime.now(),
            "quantity": current_quantity,
            "unit_cost": unit_cost,
            "storage_cost": storage_cost,
            "lead_time": lead_time,
            "supplier": supplier
        }]
    
    def add_constraint(self, name: str, constraint_type: str, limit: float, 
                      current_usage: float = 0.0, weight: float = 1.0):
        """Add constraint to optimization problem."""
        self.constraints[name] = OptimizationConstraint(
            name=name,
            constraint_type=constraint_type,
            limit=limit,
            current_usage=current_usage,
            weight=weight
        )
    
    def add_objective(self, name: str, objective_type: str, weight: float, 
                     current_value: float, target_value: Optional[float] = None):
        """Add objective to optimization problem."""
        self.objectives[name] = OptimizationObjective(
            name=name,
            objective_type=objective_type,
            weight=weight,
            current_value=current_value,
            target_value=target_value
        )
    
    def calculate_economic_order_quantity(self, sku: str, annual_demand: float, 
                                       ordering_cost: float, holding_cost: float) -> float:
        """Calculate Economic Order Quantity (EOQ)."""
        if annual_demand <= 0 or ordering_cost <= 0 or holding_cost <= 0:
            return 0.0
        
        eoq = math.sqrt((2 * annual_demand * ordering_cost) / holding_cost)
        return eoq
    
    def calculate_safety_stock(self, sku: str, service_level: float = 0.95, 
                             lead_time: int = 7) -> float:
        """Calculate safety stock using service level approach."""
        if sku not in self.historical_data:
            return 0.0
        
        data = self.historical_data[sku]
        if len(data) < 10:
            return 0.0
        
        # Calculate demand variability
        demands = [d.get("demand", 0) for d in data if "demand" in d]
        if len(demands) < 5:
            return 0.0
        
        mean_demand = statistics.mean(demands)
        std_demand = statistics.stdev(demands) if len(demands) > 1 else mean_demand * 0.2
        
        # Z-score for service level
        z_scores = {0.90: 1.28, 0.95: 1.65, 0.99: 2.33}
        z_score = z_scores.get(service_level, 1.65)
        
        safety_stock = z_score * std_demand * math.sqrt(lead_time)
        return max(0, safety_stock)
    
    def calculate_reorder_point(self, sku: str, lead_time: int, 
                              safety_stock: float) -> float:
        """Calculate reorder point."""
        if sku not in self.historical_data:
            return 0.0
        
        data = self.historical_data[sku]
        if len(data) < 5:
            return 0.0
        
        # Calculate average demand during lead time
        demands = [d.get("demand", 0) for d in data if "demand" in d]
        if not demands:
            return 0.0
        
        avg_demand = statistics.mean(demands)
        reorder_point = (avg_demand * lead_time) + safety_stock
        return max(0, reorder_point)
    
    def optimize_single_sku(self, sku: str) -> OptimizationResult:
        """Optimize inventory for a single SKU."""
        if sku not in self.historical_data:
            return OptimizationResult(sku, 0, 0, 0, [], [], 0, "SKU not found")
        
        data = self.historical_data[sku]
        if not data:
            return OptimizationResult(sku, 0, 0, 0, [], [], 0, "No data available")
        
        current_quantity = data[-1]["quantity"]
        unit_cost = data[-1]["unit_cost"]
        storage_cost = data[-1]["storage_cost"]
        lead_time = data[-1]["lead_time"]
        
        # Calculate demand
        demands = [d.get("demand", 0) for d in data if "demand" in d]
        if not demands:
            # Estimate demand from quantity changes
            quantities = [d["quantity"] for d in data]
            if len(quantities) > 1:
                demand = max(0, quantities[0] - quantities[-1]) / len(quantities)
            else:
                demand = 0
        else:
            demand = statistics.mean(demands)
        
        annual_demand = demand * 365
        
        # Calculate EOQ
        ordering_cost = 50.0  # Default ordering cost
        eoq = self.calculate_economic_order_quantity(sku, annual_demand, ordering_cost, storage_cost)
        
        # Calculate safety stock
        safety_stock = self.calculate_safety_stock(sku)
        
        # Calculate reorder point
        reorder_point = self.calculate_reorder_point(sku, lead_time, safety_stock)
        
        # Recommended quantity is EOQ + safety stock
        recommended_quantity = eoq + safety_stock
        
        # Check constraints
        constraints_satisfied = []
        for constraint_name, constraint in self.constraints.items():
            if constraint.constraint_type == "budget":
                cost_impact = (recommended_quantity - current_quantity) * unit_cost
                if constraint.current_usage + cost_impact <= constraint.limit:
                    constraints_satisfied.append(constraint_name)
            elif constraint.constraint_type == "space":
                space_impact = recommended_quantity - current_quantity
                if constraint.current_usage + space_impact <= constraint.limit:
                    constraints_satisfied.append(constraint_name)
        
        # Calculate improvement potential
        current_cost = current_quantity * unit_cost + current_quantity * storage_cost
        recommended_cost = recommended_quantity * unit_cost + recommended_quantity * storage_cost
        improvement_potential = (current_cost - recommended_cost) / current_cost if current_cost > 0 else 0
        
        # Determine objectives improved
        objectives_improved = []
        if improvement_potential > 0:
            objectives_improved.append("cost_reduction")
        if recommended_quantity > current_quantity:
            objectives_improved.append("service_level")
        
        # Calculate confidence score
        confidence_score = 0.7  # Base confidence
        if len(data) > 10:
            confidence_score += 0.1
        if len(demands) > 5:
            confidence_score += 0.1
        if eoq > 0:
            confidence_score += 0.1
        
        confidence_score = min(1.0, confidence_score)
        
        # Generate reasoning
        reasoning_parts = []
        if eoq > 0:
            reasoning_parts.append(f"EOQ calculated as {eoq:.1f} units")
        if safety_stock > 0:
            reasoning_parts.append(f"Safety stock of {safety_stock:.1f} units recommended")
        if improvement_potential > 0:
            reasoning_parts.append(f"Potential cost savings of {improvement_potential:.1%}")
        
        reasoning = "; ".join(reasoning_parts) if reasoning_parts else "No optimization possible"
        
        return OptimizationResult(
            sku=sku,
            recommended_quantity=recommended_quantity,
            current_quantity=current_quantity,
            improvement_potential=improvement_potential,
            constraints_satisfied=constraints_satisfied,
            objectives_improved=objectives_improved,
            confidence_score=confidence_score,
            reasoning=reasoning
        )
    
    def optimize_multi_sku(self) -> Dict[str, OptimizationResult]:
        """Optimize inventory for all SKUs."""
        results = {}
        
        for sku in self.skus:
            results[sku] = self.optimize_single_sku(sku)
        
        return results
    
    def optimize_with_constraints(self) -> Dict[str, OptimizationResult]:
        """Optimize inventory considering all constraints."""
        results = self.optimize_multi_sku()
        
        # Apply constraint filtering
        filtered_results = {}
        
        for sku, result in results.items():
            # Check if all critical constraints are satisfied
            critical_constraints = [c for c in self.constraints.values() if c.weight > 0.8]
            satisfied_critical = all(
                constraint.name in result.constraints_satisfied 
                for constraint in critical_constraints
            )
            
            if satisfied_critical or not critical_constraints:
                filtered_results[sku] = result
            else:
                # Adjust recommendation to satisfy constraints
                adjusted_result = self._adjust_for_constraints(sku, result)
                filtered_results[sku] = adjusted_result
        
        return filtered_results
    
    def _adjust_for_constraints(self, sku: str, result: OptimizationResult) -> OptimizationResult:
        """Adjust recommendation to satisfy constraints."""
        adjusted_quantity = result.recommended_quantity
        
        # Apply budget constraint
        budget_constraint = self.constraints.get("budget")
        if budget_constraint and "budget" not in result.constraints_satisfied:
            data = self.historical_data[sku]
            unit_cost = data[-1]["unit_cost"]
            max_affordable = (budget_constraint.limit - budget_constraint.current_usage) / unit_cost
            adjusted_quantity = min(adjusted_quantity, max_affordable)
        
        # Apply space constraint
        space_constraint = self.constraints.get("space")
        if space_constraint and "space" not in result.constraints_satisfied:
            max_space = space_constraint.limit - space_constraint.current_usage
            adjusted_quantity = min(adjusted_quantity, max_space)
        
        # Recalculate improvement potential
        current_quantity = result.current_quantity
        improvement_potential = (current_quantity - adjusted_quantity) / current_quantity if current_quantity > 0 else 0
        
        # Update constraints satisfied
        new_constraints_satisfied = []
        for constraint_name, constraint in self.constraints.items():
            if constraint.constraint_type == "budget":
                cost_impact = (adjusted_quantity - current_quantity) * data[-1]["unit_cost"]
                if constraint.current_usage + cost_impact <= constraint.limit:
                    new_constraints_satisfied.append(constraint_name)
            elif constraint.constraint_type == "space":
                space_impact = adjusted_quantity - current_quantity
                if constraint.current_usage + space_impact <= constraint.limit:
                    new_constraints_satisfied.append(constraint_name)
        
        return OptimizationResult(
            sku=result.sku,
            recommended_quantity=adjusted_quantity,
            current_quantity=result.current_quantity,
            improvement_potential=improvement_potential,
            constraints_satisfied=new_constraints_satisfied,
            objectives_improved=result.objectives_improved,
            confidence_score=result.confidence_score * 0.8,  # Reduce confidence due to adjustment
            reasoning=result.reasoning + " (adjusted for constraints)"
        )
    
    def generate_optimization_report(self) -> Dict[str, Any]:
        """Generate comprehensive optimization report."""
        results = self.optimize_with_constraints()
        
        total_improvement = sum(r.improvement_potential for r in results.values())
        avg_confidence = statistics.mean([r.confidence_score for r in results.values()]) if results else 0
        
        constraint_violations = []
        for constraint_name, constraint in self.constraints.items():
            violations = [sku for sku, result in results.items() 
                         if constraint_name not in result.constraints_satisfied]
            if violations:
                constraint_violations.append({
                    "constraint": constraint_name,
                    "violating_skus": violations,
                    "severity": constraint.weight
                })
        
        return {
            "timestamp": datetime.now().isoformat(),
            "total_skus": len(results),
            "total_improvement_potential": total_improvement,
            "average_confidence": avg_confidence,
            "constraint_violations": constraint_violations,
            "recommendations": [
                {
                    "sku": result.sku,
                    "current_quantity": result.current_quantity,
                    "recommended_quantity": result.recommended_quantity,
                    "improvement_potential": result.improvement_potential,
                    "confidence_score": result.confidence_score,
                    "reasoning": result.reasoning
                }
                for result in results.values()
            ],
            "summary": {
                "skus_optimized": len(results),
                "total_cost_savings": total_improvement,
                "constraint_violations": len(constraint_violations),
                "average_confidence": avg_confidence
            }
        }

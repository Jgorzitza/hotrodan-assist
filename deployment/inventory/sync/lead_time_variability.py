"""
Replenishment lead time variability model.

Features:
- Lead time distribution modeling
- Variability analysis
- Safety stock adjustments
- Supplier performance tracking
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import statistics
import math


@dataclass
class LeadTimeRecord:
    supplier_id: str
    sku: str
    order_date: datetime
    delivery_date: datetime
    lead_time_days: int
    quantity: int
    on_time: bool
    notes: Optional[str] = None


@dataclass
class LeadTimeStats:
    supplier_id: str
    sku: str
    mean_lead_time: float
    std_deviation: float
    min_lead_time: int
    max_lead_time: int
    on_time_percentage: float
    sample_size: int
    confidence_interval_95: Tuple[float, float]


class LeadTimeVariabilityModel:
    def __init__(self):
        self.records: List[LeadTimeRecord] = []
        self.supplier_performance: Dict[str, Dict[str, Any]] = {}
    
    def add_lead_time_record(self, record: LeadTimeRecord):
        """Add a new lead time record."""
        self.records.append(record)
        self._update_supplier_performance(record)
    
    def _update_supplier_performance(self, record: LeadTimeRecord):
        """Update supplier performance metrics."""
        supplier_id = record.supplier_id
        if supplier_id not in self.supplier_performance:
            self.supplier_performance[supplier_id] = {
                "total_orders": 0,
                "on_time_orders": 0,
                "lead_times": [],
                "last_updated": None
            }
        
        perf = self.supplier_performance[supplier_id]
        perf["total_orders"] += 1
        if record.on_time:
            perf["on_time_orders"] += 1
        perf["lead_times"].append(record.lead_time_days)
        perf["last_updated"] = datetime.now()
    
    def get_lead_time_stats(self, supplier_id: str, sku: Optional[str] = None) -> Optional[LeadTimeStats]:
        """Get lead time statistics for a supplier and optionally specific SKU."""
        # Filter records
        filtered_records = [r for r in self.records if r.supplier_id == supplier_id]
        if sku:
            filtered_records = [r for r in filtered_records if r.sku == sku]
        
        if len(filtered_records) < 2:
            return None
        
        lead_times = [r.lead_time_days for r in filtered_records]
        on_time_count = sum(1 for r in filtered_records if r.on_time)
        
        mean_lt = statistics.mean(lead_times)
        std_dev = statistics.stdev(lead_times) if len(lead_times) > 1 else 0.0
        min_lt = min(lead_times)
        max_lt = max(lead_times)
        on_time_pct = (on_time_count / len(filtered_records)) * 100
        
        # Calculate 95% confidence interval
        n = len(lead_times)
        if n > 1:
            # Using t-distribution approximation
            t_value = 1.96  # Approximate for 95% confidence
            margin_error = t_value * (std_dev / math.sqrt(n))
            ci_lower = mean_lt - margin_error
            ci_upper = mean_lt + margin_error
        else:
            ci_lower = ci_upper = mean_lt
        
        return LeadTimeStats(
            supplier_id=supplier_id,
            sku=sku or "ALL",
            mean_lead_time=mean_lt,
            std_deviation=std_dev,
            min_lead_time=min_lt,
            max_lead_time=max_lt,
            on_time_percentage=on_time_pct,
            sample_size=n,
            confidence_interval_95=(ci_lower, ci_upper)
        )
    
    def calculate_safety_stock_adjustment(self, supplier_id: str, sku: str, 
                                        base_lead_time: int, service_level: float = 0.95) -> Dict[str, Any]:
        """Calculate safety stock adjustment based on lead time variability."""
        stats = self.get_lead_time_stats(supplier_id, sku)
        if not stats:
            return {
                "adjusted_lead_time": base_lead_time,
                "safety_stock_multiplier": 1.0,
                "variability_factor": 0.0,
                "recommendation": "Insufficient data for variability analysis"
            }
        
        # Calculate variability factor
        cv = stats.std_deviation / stats.mean_lead_time if stats.mean_lead_time > 0 else 0
        variability_factor = min(cv, 1.0)  # Cap at 100% variability
        
        # Adjust lead time based on variability
        # Use 95th percentile for high service level
        z_score = 1.645  # 95% service level
        adjusted_lead_time = stats.mean_lead_time + (z_score * stats.std_deviation)
        
        # Safety stock multiplier based on variability
        if variability_factor < 0.1:
            safety_multiplier = 1.0  # Low variability
        elif variability_factor < 0.3:
            safety_multiplier = 1.2  # Moderate variability
        elif variability_factor < 0.5:
            safety_multiplier = 1.5  # High variability
        else:
            safety_multiplier = 2.0  # Very high variability
        
        # Generate recommendation
        if stats.on_time_percentage >= 95:
            recommendation = "Excellent supplier performance"
        elif stats.on_time_percentage >= 90:
            recommendation = "Good supplier performance"
        elif stats.on_time_percentage >= 80:
            recommendation = "Moderate supplier performance - consider backup suppliers"
        else:
            recommendation = "Poor supplier performance - consider alternative suppliers"
        
        return {
            "adjusted_lead_time": int(round(adjusted_lead_time)),
            "safety_stock_multiplier": safety_multiplier,
            "variability_factor": variability_factor,
            "coefficient_of_variation": cv,
            "on_time_percentage": stats.on_time_percentage,
            "recommendation": recommendation,
            "confidence_level": "High" if stats.sample_size >= 10 else "Medium" if stats.sample_size >= 5 else "Low"
        }
    
    def get_supplier_rankings(self) -> List[Dict[str, Any]]:
        """Get supplier rankings based on performance metrics."""
        rankings = []
        
        for supplier_id, perf in self.supplier_performance.items():
            if perf["total_orders"] < 2:
                continue
            
            on_time_pct = (perf["on_time_orders"] / perf["total_orders"]) * 100
            avg_lead_time = statistics.mean(perf["lead_times"])
            lead_time_std = statistics.stdev(perf["lead_times"]) if len(perf["lead_times"]) > 1 else 0
            
            # Calculate performance score (higher is better)
            # Weight: 40% on-time, 30% lead time consistency, 30% average lead time
            on_time_score = on_time_pct
            consistency_score = max(0, 100 - (lead_time_std / avg_lead_time * 100)) if avg_lead_time > 0 else 0
            speed_score = max(0, 100 - (avg_lead_time / 30 * 100))  # Normalize to 30 days
            
            performance_score = (on_time_score * 0.4) + (consistency_score * 0.3) + (speed_score * 0.3)
            
            rankings.append({
                "supplier_id": supplier_id,
                "performance_score": round(performance_score, 1),
                "on_time_percentage": round(on_time_pct, 1),
                "avg_lead_time": round(avg_lead_time, 1),
                "lead_time_std": round(lead_time_std, 1),
                "total_orders": perf["total_orders"],
                "last_updated": perf["last_updated"].isoformat() if perf["last_updated"] else None
            })
        
        return sorted(rankings, key=lambda x: x["performance_score"], reverse=True)
    
    def predict_lead_time(self, supplier_id: str, sku: str, confidence_level: float = 0.95) -> Dict[str, Any]:
        """Predict lead time for a future order."""
        stats = self.get_lead_time_stats(supplier_id, sku)
        if not stats:
            return {
                "predicted_lead_time": None,
                "confidence_interval": None,
                "prediction_quality": "Insufficient data"
            }
        
        # Use mean as prediction
        predicted_lt = stats.mean_lead_time
        
        # Calculate confidence interval
        z_score = 1.96 if confidence_level == 0.95 else 1.645 if confidence_level == 0.90 else 2.576
        margin_error = z_score * (stats.std_deviation / math.sqrt(stats.sample_size))
        
        ci_lower = max(0, predicted_lt - margin_error)
        ci_upper = predicted_lt + margin_error
        
        # Determine prediction quality
        if stats.sample_size >= 20:
            quality = "High"
        elif stats.sample_size >= 10:
            quality = "Medium"
        else:
            quality = "Low"
        
        return {
            "predicted_lead_time": int(round(predicted_lt)),
            "confidence_interval": (int(round(ci_lower)), int(round(ci_upper))),
            "confidence_level": confidence_level,
            "prediction_quality": quality,
            "sample_size": stats.sample_size
        }

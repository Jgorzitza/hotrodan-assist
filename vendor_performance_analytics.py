#!/usr/bin/env python3
"""
Advanced Vendor Performance Analytics
Comprehensive vendor evaluation and optimization for inventory management
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import json

class PerformanceMetric(Enum):
    DELIVERY_TIME = "delivery_time"
    ON_TIME_DELIVERY = "on_time_delivery"
    QUALITY_SCORE = "quality_score"
    COST_EFFICIENCY = "cost_efficiency"
    RELIABILITY = "reliability"
    RESPONSIVENESS = "responsiveness"

@dataclass
class VendorMetrics:
    vendor_id: str
    vendor_name: str
    total_skus: int
    average_lead_time: float
    on_time_delivery_rate: float
    quality_score: float
    cost_efficiency: float
    reliability_score: float
    responsiveness_score: float
    overall_score: float
    risk_level: str
    recommendations: List[str]
    performance_trend: str
    last_updated: str

@dataclass
class VendorComparison:
    vendor_id: str
    vendor_name: str
    rank: int
    score: float
    strengths: List[str]
    weaknesses: List[str]
    improvement_potential: float

class AdvancedVendorAnalyzer:
    """
    Advanced vendor performance analysis and optimization
    """
    
    def __init__(self):
        self.metrics_weights = {
            PerformanceMetric.DELIVERY_TIME: 0.25,
            PerformanceMetric.ON_TIME_DELIVERY: 0.20,
            PerformanceMetric.QUALITY_SCORE: 0.20,
            PerformanceMetric.COST_EFFICIENCY: 0.15,
            PerformanceMetric.RELIABILITY: 0.10,
            PerformanceMetric.RESPONSIVENESS: 0.10
        }
        
    def analyze_vendor_performance(self, vendor_data: Dict) -> VendorMetrics:
        """
        Comprehensive vendor performance analysis
        """
        try:
            # Extract basic metrics
            total_skus = len(vendor_data.get('skus', []))
            sku_data = vendor_data.get('skus', [])
            
            # Calculate individual metrics
            lead_time = self._calculate_lead_time_metrics(sku_data, vendor_data)
            on_time_rate = self._calculate_on_time_delivery_rate(sku_data, vendor_data)
            quality = self._calculate_quality_score(sku_data, vendor_data)
            cost_efficiency = self._calculate_cost_efficiency(sku_data, vendor_data)
            reliability = self._calculate_reliability_score(sku_data, vendor_data)
            responsiveness = self._calculate_responsiveness_score(sku_data, vendor_data)
            
            # Calculate overall score
            overall_score = self._calculate_overall_score({
                PerformanceMetric.DELIVERY_TIME: lead_time,
                PerformanceMetric.ON_TIME_DELIVERY: on_time_rate,
                PerformanceMetric.QUALITY_SCORE: quality,
                PerformanceMetric.COST_EFFICIENCY: cost_efficiency,
                PerformanceMetric.RELIABILITY: reliability,
                PerformanceMetric.RESPONSIVENESS: responsiveness
            })
            
            # Assess risk level
            risk_level = self._assess_risk_level(overall_score, lead_time, on_time_rate)
            
            # Generate recommendations
            recommendations = self._generate_recommendations({
                'lead_time': lead_time,
                'on_time_rate': on_time_rate,
                'quality': quality,
                'cost_efficiency': cost_efficiency,
                'reliability': reliability,
                'responsiveness': responsiveness
            })
            
            # Analyze performance trend
            performance_trend = self._analyze_performance_trend(vendor_data.get('historical_performance', []))
            
            return VendorMetrics(
                vendor_id=vendor_data.get('id', 'unknown'),
                vendor_name=vendor_data.get('name', 'Unknown Vendor'),
                total_skus=total_skus,
                average_lead_time=lead_time,
                on_time_delivery_rate=on_time_rate,
                quality_score=quality,
                cost_efficiency=cost_efficiency,
                reliability_score=reliability,
                responsiveness_score=responsiveness,
                overall_score=overall_score,
                risk_level=risk_level,
                recommendations=recommendations,
                performance_trend=performance_trend,
                last_updated=datetime.now().isoformat()
            )
            
        except Exception as e:
            print(f"Error analyzing vendor {vendor_data.get('id', 'unknown')}: {e}")
            return self._create_default_metrics(vendor_data)
    
    def _calculate_lead_time_metrics(self, sku_data: List[Dict], vendor_data: Dict) -> float:
        """Calculate lead time performance score (lower is better)"""
        # Get historical lead times
        lead_times = []
        
        # From vendor data
        if 'lead_times' in vendor_data:
            lead_times.extend(vendor_data['lead_times'])
        
        # From SKU data
        for sku in sku_data:
            if 'lead_time_days' in sku:
                lead_times.append(sku['lead_time_days'])
        
        if not lead_times:
            return 0.5  # Default score
        
        avg_lead_time = np.mean(lead_times)
        
        # Score based on lead time (shorter is better)
        if avg_lead_time <= 7:
            return 1.0
        elif avg_lead_time <= 14:
            return 0.8
        elif avg_lead_time <= 30:
            return 0.6
        elif avg_lead_time <= 45:
            return 0.4
        else:
            return 0.2
    
    def _calculate_on_time_delivery_rate(self, sku_data: List[Dict], vendor_data: Dict) -> float:
        """Calculate on-time delivery rate"""
        # Get delivery performance data
        delivery_data = vendor_data.get('delivery_performance', [])
        
        if not delivery_data:
            # Estimate from SKU status
            healthy_skus = sum(1 for sku in sku_data if sku.get('status') == 'healthy')
            total_skus = len(sku_data)
            return healthy_skus / total_skus if total_skus > 0 else 0.5
        
        # Calculate from actual delivery data
        on_time_deliveries = sum(1 for delivery in delivery_data if delivery.get('on_time', False))
        total_deliveries = len(delivery_data)
        
        return on_time_deliveries / total_deliveries if total_deliveries > 0 else 0.5
    
    def _calculate_quality_score(self, sku_data: List[Dict], vendor_data: Dict) -> float:
        """Calculate quality score based on inventory status and returns"""
        # Base score from inventory status distribution
        status_weights = {
            'healthy': 1.0,
            'low': 0.7,
            'backorder': 0.3,
            'preorder': 0.5,
            'discontinued': 0.0
        }
        
        total_weight = 0
        total_skus = len(sku_data)
        
        for sku in sku_data:
            status = sku.get('status', 'unknown')
            weight = status_weights.get(status, 0.5)
            total_weight += weight
        
        base_score = total_weight / total_skus if total_skus > 0 else 0.5
        
        # Adjust for return rates
        return_rate = vendor_data.get('return_rate', 0.0)
        quality_adjustment = max(0, 1 - (return_rate * 2))  # Penalize high return rates
        
        return min(1.0, base_score * quality_adjustment)
    
    def _calculate_cost_efficiency(self, sku_data: List[Dict], vendor_data: Dict) -> float:
        """Calculate cost efficiency score"""
        if not sku_data:
            return 0.5
        
        # Get unit costs
        costs = []
        for sku in sku_data:
            if 'unit_cost' in sku:
                cost = sku['unit_cost']
                if isinstance(cost, dict):
                    costs.append(cost.get('amount', 0))
                else:
                    costs.append(cost)
        
        if not costs:
            return 0.5
        
        # Calculate cost variance (lower variance = higher efficiency)
        avg_cost = np.mean(costs)
        cost_variance = np.var(costs)
        
        # Normalize variance to get efficiency score
        if avg_cost > 0:
            cv = np.sqrt(cost_variance) / avg_cost  # Coefficient of variation
            efficiency = max(0, 1 - cv)  # Lower CV = higher efficiency
        else:
            efficiency = 0.5
        
        # Adjust for price competitiveness
        market_avg_cost = vendor_data.get('market_average_cost', avg_cost)
        if market_avg_cost > 0:
            price_ratio = avg_cost / market_avg_cost
            price_efficiency = max(0, 2 - price_ratio)  # Lower than market = better
            efficiency = (efficiency + price_efficiency) / 2
        
        return min(1.0, efficiency)
    
    def _calculate_reliability_score(self, sku_data: List[Dict], vendor_data: Dict) -> float:
        """Calculate reliability score based on consistency"""
        # Analyze consistency of lead times
        lead_times = vendor_data.get('lead_times', [])
        if len(lead_times) < 2:
            return 0.5
        
        # Calculate coefficient of variation for lead times
        lead_time_cv = np.std(lead_times) / np.mean(lead_times)
        reliability = max(0, 1 - lead_time_cv)  # Lower variation = higher reliability
        
        # Factor in order fulfillment rate
        fulfillment_rate = vendor_data.get('fulfillment_rate', 0.95)
        reliability = (reliability + fulfillment_rate) / 2
        
        return min(1.0, reliability)
    
    def _calculate_responsiveness_score(self, sku_data: List[Dict], vendor_data: Dict) -> float:
        """Calculate responsiveness score based on communication and support"""
        # Communication metrics
        avg_response_time = vendor_data.get('avg_response_time_hours', 24)
        communication_score = max(0, 1 - (avg_response_time / 48))  # 48 hours = 0 score
        
        # Support quality
        support_rating = vendor_data.get('support_rating', 0.5)
        
        # Order modification flexibility
        modification_success_rate = vendor_data.get('modification_success_rate', 0.8)
        
        responsiveness = (communication_score + support_rating + modification_success_rate) / 3
        return min(1.0, responsiveness)
    
    def _calculate_overall_score(self, metrics: Dict[PerformanceMetric, float]) -> float:
        """Calculate weighted overall score"""
        total_score = 0
        total_weight = 0
        
        for metric, score in metrics.items():
            weight = self.metrics_weights.get(metric, 0.1)
            total_score += score * weight
            total_weight += weight
        
        return total_score / total_weight if total_weight > 0 else 0.5
    
    def _assess_risk_level(self, overall_score: float, lead_time: float, on_time_rate: float) -> str:
        """Assess vendor risk level"""
        if overall_score >= 0.8 and lead_time >= 0.7 and on_time_rate >= 0.9:
            return "low"
        elif overall_score >= 0.6 and lead_time >= 0.5 and on_time_rate >= 0.7:
            return "medium"
        else:
            return "high"
    
    def _generate_recommendations(self, metrics: Dict[str, float]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if metrics['lead_time'] < 0.6:
            recommendations.append("Negotiate shorter lead times or find alternative suppliers")
        
        if metrics['on_time_rate'] < 0.8:
            recommendations.append("Improve delivery reliability - consider backup suppliers")
        
        if metrics['quality'] < 0.7:
            recommendations.append("Address quality issues - review supplier standards and processes")
        
        if metrics['cost_efficiency'] < 0.6:
            recommendations.append("Optimize cost structure - negotiate better pricing or find alternatives")
        
        if metrics['reliability'] < 0.7:
            recommendations.append("Improve consistency - establish better communication protocols")
        
        if metrics['responsiveness'] < 0.6:
            recommendations.append("Enhance communication and support responsiveness")
        
        if not recommendations:
            recommendations.append("Vendor performance is excellent - maintain current relationship")
        
        return recommendations
    
    def _analyze_performance_trend(self, historical_data: List[Dict]) -> str:
        """Analyze performance trend over time"""
        if len(historical_data) < 2:
            return "stable"
        
        # Extract scores over time
        scores = [entry.get('overall_score', 0.5) for entry in historical_data]
        
        # Calculate trend
        x = np.arange(len(scores))
        slope, _, _, _, _ = np.polyfit(x, scores, 1)
        
        if slope > 0.05:
            return "improving"
        elif slope < -0.05:
            return "declining"
        else:
            return "stable"
    
    def _create_default_metrics(self, vendor_data: Dict) -> VendorMetrics:
        """Create default metrics when analysis fails"""
        return VendorMetrics(
            vendor_id=vendor_data.get('id', 'unknown'),
            vendor_name=vendor_data.get('name', 'Unknown Vendor'),
            total_skus=0,
            average_lead_time=0.5,
            on_time_delivery_rate=0.5,
            quality_score=0.5,
            cost_efficiency=0.5,
            reliability_score=0.5,
            responsiveness_score=0.5,
            overall_score=0.5,
            risk_level="medium",
            recommendations=["Insufficient data for analysis - collect more performance metrics"],
            performance_trend="stable",
            last_updated=datetime.now().isoformat()
        )
    
    def compare_vendors(self, vendor_metrics_list: List[VendorMetrics]) -> List[VendorComparison]:
        """Compare multiple vendors and rank them"""
        # Sort by overall score
        sorted_vendors = sorted(vendor_metrics_list, key=lambda x: x.overall_score, reverse=True)
        
        comparisons = []
        for i, vendor in enumerate(sorted_vendors):
            rank = i + 1
            
            # Identify strengths and weaknesses
            strengths = []
            weaknesses = []
            
            if vendor.average_lead_time >= 0.8:
                strengths.append("Fast delivery")
            elif vendor.average_lead_time < 0.4:
                weaknesses.append("Slow delivery")
            
            if vendor.on_time_delivery_rate >= 0.9:
                strengths.append("Reliable delivery")
            elif vendor.on_time_delivery_rate < 0.7:
                weaknesses.append("Unreliable delivery")
            
            if vendor.quality_score >= 0.8:
                strengths.append("High quality")
            elif vendor.quality_score < 0.6:
                weaknesses.append("Quality issues")
            
            if vendor.cost_efficiency >= 0.8:
                strengths.append("Cost effective")
            elif vendor.cost_efficiency < 0.6:
                weaknesses.append("High costs")
            
            # Calculate improvement potential
            max_possible_score = 1.0
            improvement_potential = max_possible_score - vendor.overall_score
            
            comparisons.append(VendorComparison(
                vendor_id=vendor.vendor_id,
                vendor_name=vendor.vendor_name,
                rank=rank,
                score=vendor.overall_score,
                strengths=strengths,
                weaknesses=weaknesses,
                improvement_potential=improvement_potential
            ))
        
        return comparisons
    
    def generate_vendor_report(self, vendor_metrics: VendorMetrics) -> Dict:
        """Generate comprehensive vendor performance report"""
        return {
            "vendor_id": vendor_metrics.vendor_id,
            "vendor_name": vendor_metrics.vendor_name,
            "overall_score": vendor_metrics.overall_score,
            "risk_level": vendor_metrics.risk_level,
            "performance_trend": vendor_metrics.performance_trend,
            "metrics": {
                "delivery_time": {
                    "score": vendor_metrics.average_lead_time,
                    "description": "Lead time performance (lower is better)"
                },
                "on_time_delivery": {
                    "score": vendor_metrics.on_time_delivery_rate,
                    "description": "Percentage of on-time deliveries"
                },
                "quality": {
                    "score": vendor_metrics.quality_score,
                    "description": "Product quality and consistency"
                },
                "cost_efficiency": {
                    "score": vendor_metrics.cost_efficiency,
                    "description": "Cost competitiveness and efficiency"
                },
                "reliability": {
                    "score": vendor_metrics.reliability_score,
                    "description": "Consistency and dependability"
                },
                "responsiveness": {
                    "score": vendor_metrics.responsiveness_score,
                    "description": "Communication and support quality"
                }
            },
            "recommendations": vendor_metrics.recommendations,
            "total_skus": vendor_metrics.total_skus,
            "last_updated": vendor_metrics.last_updated
        }

# Example usage and testing
if __name__ == "__main__":
    # Test with sample vendor data
    sample_vendor = {
        'id': 'VENDOR001',
        'name': 'Test Supplier Co.',
        'skus': [
            {'id': 'SKU001', 'status': 'healthy', 'unit_cost': {'amount': 25.50}},
            {'id': 'SKU002', 'status': 'healthy', 'unit_cost': {'amount': 30.00}},
            {'id': 'SKU003', 'status': 'low', 'unit_cost': {'amount': 15.75}},
        ],
        'lead_times': [7, 8, 6, 9, 7],
        'delivery_performance': [
            {'on_time': True, 'date': '2024-01-01'},
            {'on_time': True, 'date': '2024-01-08'},
            {'on_time': False, 'date': '2024-01-15'},
            {'on_time': True, 'date': '2024-01-22'},
        ],
        'return_rate': 0.02,
        'avg_response_time_hours': 4,
        'support_rating': 0.85,
        'modification_success_rate': 0.9,
        'market_average_cost': 28.00,
        'fulfillment_rate': 0.95,
        'historical_performance': [
            {'overall_score': 0.75, 'date': '2024-01-01'},
            {'overall_score': 0.78, 'date': '2024-01-15'},
            {'overall_score': 0.82, 'date': '2024-01-30'},
        ]
    }
    
    analyzer = AdvancedVendorAnalyzer()
    metrics = analyzer.analyze_vendor_performance(sample_vendor)
    report = analyzer.generate_vendor_report(metrics)
    
    print("=== VENDOR PERFORMANCE ANALYSIS ===")
    print(f"Vendor: {metrics.vendor_name}")
    print(f"Overall Score: {metrics.overall_score:.2f}")
    print(f"Risk Level: {metrics.risk_level}")
    print(f"Performance Trend: {metrics.performance_trend}")
    print(f"Total SKUs: {metrics.total_skus}")
    print("\nDetailed Metrics:")
    for metric, data in report['metrics'].items():
        print(f"  {metric}: {data['score']:.2f} - {data['description']}")
    print(f"\nRecommendations:")
    for rec in metrics.recommendations:
        print(f"  - {rec}")

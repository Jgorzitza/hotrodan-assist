"""
SEO Performance Tracking System

This module provides comprehensive performance tracking, ROI measurement,
and content performance analytics for SEO opportunities.
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum
import json
from pathlib import Path
import statistics

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of performance metrics."""

    RANKING = "ranking"
    TRAFFIC = "traffic"
    CONVERSION = "conversion"
    ENGAGEMENT = "engagement"
    TECHNICAL = "technical"


class PerformancePeriod(Enum):
    """Performance tracking periods."""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


@dataclass
class PerformanceMetric:
    """Individual performance metric data point."""

    id: str
    metric_type: MetricType
    value: float
    timestamp: str
    metadata: Dict = field(default_factory=dict)


@dataclass
class ContentPerformance:
    """Content performance tracking data."""

    content_id: str
    url: str
    title: str
    target_keywords: List[str]
    created_at: str
    last_updated: str

    # Performance metrics
    organic_traffic: List[PerformanceMetric]
    ranking_positions: List[PerformanceMetric]
    conversions: List[PerformanceMetric]
    engagement_metrics: List[PerformanceMetric]

    # ROI calculations
    estimated_value: float
    implementation_cost: float
    roi_percentage: float

    # Trend analysis
    traffic_trend: str  # up, down, stable
    ranking_trend: str
    conversion_trend: str


@dataclass
class OpportunityPerformance:
    """SEO opportunity performance tracking."""

    opportunity_id: str
    title: str
    target_keyword: str
    implemented_at: str

    # Baseline metrics (before implementation)
    baseline_traffic: float
    baseline_ranking: Optional[int]
    baseline_conversions: float

    # Current metrics
    current_traffic: float
    current_ranking: Optional[int]
    current_conversions: float

    # Performance calculations
    traffic_growth: float  # percentage
    ranking_improvement: Optional[int]  # position improvement
    conversion_growth: float  # percentage

    # ROI metrics
    implementation_cost: float
    revenue_generated: float
    roi_percentage: float
    payback_period_days: Optional[int]

    # Success indicators
    is_successful: bool
    success_factors: List[str]
    areas_for_improvement: List[str]


@dataclass
class PerformanceSummary:
    """Overall performance summary."""

    period_start: str
    period_end: str

    # Overall metrics
    total_opportunities_tracked: int
    successful_opportunities: int
    success_rate: float

    # Traffic metrics
    total_traffic_growth: float
    total_organic_traffic: float
    traffic_growth_percentage: float

    # Ranking metrics
    average_ranking_improvement: float
    keywords_ranking_top_10: int
    keywords_ranking_top_3: int

    # ROI metrics
    total_investment: float
    total_revenue: float
    overall_roi: float

    # Top performers
    top_performing_content: List[str]
    top_performing_keywords: List[str]

    # Recommendations
    recommendations: List[str]


class PerformanceTracker:
    """SEO performance tracking and ROI measurement system."""

    def __init__(self, storage_path: str = "storage/seo/performance"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

        # Performance data
        self.content_performance: Dict[str, ContentPerformance] = {}
        self.opportunity_performance: Dict[str, OpportunityPerformance] = {}

        # Load existing data
        self._load_performance_data()

    def track_content_performance(
        self, content_id: str, metrics: Dict[str, float], timestamp: str = None
    ):
        """Track performance metrics for content."""
        if timestamp is None:
            timestamp = datetime.now().isoformat()

        if content_id not in self.content_performance:
            # Create new content performance record
            self.content_performance[content_id] = ContentPerformance(
                content_id=content_id,
                url=f"https://example.com/{content_id}",
                title=f"Content {content_id}",
                target_keywords=[],
                created_at=timestamp,
                last_updated=timestamp,
                organic_traffic=[],
                ranking_positions=[],
                conversions=[],
                engagement_metrics=[],
                estimated_value=0.0,
                implementation_cost=0.0,
                roi_percentage=0.0,
                traffic_trend="stable",
                ranking_trend="stable",
                conversion_trend="stable",
            )

        content = self.content_performance[content_id]
        content.last_updated = timestamp

        # Add metrics
        for metric_name, value in metrics.items():
            metric = PerformanceMetric(
                id=f"{content_id}_{metric_name}_{timestamp}",
                metric_type=self._get_metric_type(metric_name),
                value=value,
                timestamp=timestamp,
            )

            if metric_name in ["organic_traffic", "page_views", "unique_visitors"]:
                content.organic_traffic.append(metric)
            elif metric_name in ["ranking_position", "serp_position"]:
                content.ranking_positions.append(metric)
            elif metric_name in ["conversions", "leads", "sales"]:
                content.conversions.append(metric)
            else:
                content.engagement_metrics.append(metric)

        # Calculate trends
        self._calculate_trends(content)

        # Save data
        self._save_performance_data()

    def track_opportunity_performance(
        self, opportunity_id: str, performance_data: Dict
    ):
        """Track performance of implemented SEO opportunities."""
        opportunity = OpportunityPerformance(
            opportunity_id=opportunity_id,
            title=performance_data.get("title", f"Opportunity {opportunity_id}"),
            target_keyword=performance_data.get("target_keyword", ""),
            implemented_at=performance_data.get(
                "implemented_at", datetime.now().isoformat()
            ),
            # Baseline metrics
            baseline_traffic=performance_data.get("baseline_traffic", 0.0),
            baseline_ranking=performance_data.get("baseline_ranking"),
            baseline_conversions=performance_data.get("baseline_conversions", 0.0),
            # Current metrics
            current_traffic=performance_data.get("current_traffic", 0.0),
            current_ranking=performance_data.get("current_ranking"),
            current_conversions=performance_data.get("current_conversions", 0.0),
            # Performance calculations
            traffic_growth=0.0,
            ranking_improvement=None,
            conversion_growth=0.0,
            # ROI metrics
            implementation_cost=performance_data.get("implementation_cost", 0.0),
            revenue_generated=performance_data.get("revenue_generated", 0.0),
            roi_percentage=0.0,
            payback_period_days=None,
            # Success indicators
            is_successful=False,
            success_factors=[],
            areas_for_improvement=[],
        )

        # Calculate performance metrics
        self._calculate_opportunity_metrics(opportunity)

        self.opportunity_performance[opportunity_id] = opportunity
        self._save_performance_data()

        return opportunity

    def _calculate_opportunity_metrics(self, opportunity: OpportunityPerformance):
        """Calculate performance metrics for an opportunity."""
        # Traffic growth
        if opportunity.baseline_traffic > 0:
            opportunity.traffic_growth = (
                (opportunity.current_traffic - opportunity.baseline_traffic)
                / opportunity.baseline_traffic
                * 100
            )

        # Ranking improvement
        if opportunity.baseline_ranking and opportunity.current_ranking:
            opportunity.ranking_improvement = (
                opportunity.baseline_ranking - opportunity.current_ranking
            )

        # Conversion growth
        if opportunity.baseline_conversions > 0:
            opportunity.conversion_growth = (
                (opportunity.current_conversions - opportunity.baseline_conversions)
                / opportunity.baseline_conversions
                * 100
            )

        # ROI calculation
        if opportunity.implementation_cost > 0:
            opportunity.roi_percentage = (
                (opportunity.revenue_generated - opportunity.implementation_cost)
                / opportunity.implementation_cost
                * 100
            )

        # Payback period
        if opportunity.revenue_generated > 0 and opportunity.implementation_cost > 0:
            daily_revenue = opportunity.revenue_generated / 365  # Assume annual revenue
            if daily_revenue > 0:
                opportunity.payback_period_days = int(
                    opportunity.implementation_cost / daily_revenue
                )

        # Success determination
        opportunity.is_successful = (
            opportunity.traffic_growth > 20  # 20% traffic growth
            and (
                opportunity.ranking_improvement and opportunity.ranking_improvement > 0
            )
            and opportunity.conversion_growth > 10  # 10% conversion growth
            and opportunity.roi_percentage > 0
        )

        # Success factors
        success_factors = []
        if opportunity.traffic_growth > 50:
            success_factors.append("High traffic growth")
        if opportunity.ranking_improvement and opportunity.ranking_improvement > 5:
            success_factors.append("Significant ranking improvement")
        if opportunity.conversion_growth > 25:
            success_factors.append("Strong conversion growth")
        if opportunity.roi_percentage > 100:
            success_factors.append("Excellent ROI")

        opportunity.success_factors = success_factors

        # Areas for improvement
        improvements = []
        if opportunity.traffic_growth < 10:
            improvements.append("Improve content optimization")
        if opportunity.ranking_improvement and opportunity.ranking_improvement <= 0:
            improvements.append("Focus on ranking improvement")
        if opportunity.conversion_growth < 5:
            improvements.append("Optimize conversion funnel")
        if opportunity.roi_percentage < 50:
            improvements.append("Reduce implementation costs")

        opportunity.areas_for_improvement = improvements

    def _calculate_trends(self, content: ContentPerformance):
        """Calculate trend indicators for content performance."""
        # Traffic trend
        if len(content.organic_traffic) >= 2:
            recent_traffic = content.organic_traffic[-1].value
            previous_traffic = content.organic_traffic[-2].value
            if recent_traffic > previous_traffic * 1.1:
                content.traffic_trend = "up"
            elif recent_traffic < previous_traffic * 0.9:
                content.traffic_trend = "down"

        # Ranking trend
        if len(content.ranking_positions) >= 2:
            recent_ranking = content.ranking_positions[-1].value
            previous_ranking = content.ranking_positions[-2].value
            if recent_ranking < previous_ranking:  # Lower number is better ranking
                content.ranking_trend = "up"
            elif recent_ranking > previous_ranking:
                content.ranking_trend = "down"

        # Conversion trend
        if len(content.conversions) >= 2:
            recent_conversions = content.conversions[-1].value
            previous_conversions = content.conversions[-2].value
            if recent_conversions > previous_conversions * 1.05:
                content.conversion_trend = "up"
            elif recent_conversions < previous_conversions * 0.95:
                content.conversion_trend = "down"

    def _get_metric_type(self, metric_name: str) -> MetricType:
        """Determine metric type from metric name."""
        traffic_metrics = [
            "organic_traffic",
            "page_views",
            "unique_visitors",
            "sessions",
        ]
        ranking_metrics = ["ranking_position", "serp_position", "keyword_rank"]
        conversion_metrics = ["conversions", "leads", "sales", "revenue"]
        engagement_metrics = ["bounce_rate", "time_on_page", "pages_per_session"]
        technical_metrics = ["page_speed", "core_web_vitals", "mobile_friendly"]

        if metric_name in traffic_metrics:
            return MetricType.TRAFFIC
        elif metric_name in ranking_metrics:
            return MetricType.RANKING
        elif metric_name in conversion_metrics:
            return MetricType.CONVERSION
        elif metric_name in engagement_metrics:
            return MetricType.ENGAGEMENT
        elif metric_name in technical_metrics:
            return MetricType.TECHNICAL
        else:
            return MetricType.ENGAGEMENT  # Default

    def generate_performance_summary(
        self, period_start: str, period_end: str
    ) -> PerformanceSummary:
        """Generate comprehensive performance summary for a period."""
        start_date = datetime.fromisoformat(period_start)
        end_date = datetime.fromisoformat(period_end)

        # Filter opportunities in period
        period_opportunities = [
            opp
            for opp in self.opportunity_performance.values()
            if start_date <= datetime.fromisoformat(opp.implemented_at) <= end_date
        ]

        successful_opportunities = [
            opp for opp in period_opportunities if opp.is_successful
        ]

        # Calculate summary metrics
        total_traffic_growth = sum(opp.traffic_growth for opp in period_opportunities)
        total_organic_traffic = sum(opp.current_traffic for opp in period_opportunities)
        total_investment = sum(opp.implementation_cost for opp in period_opportunities)
        total_revenue = sum(opp.revenue_generated for opp in period_opportunities)

        # Calculate averages
        avg_ranking_improvement = (
            statistics.mean(
                [
                    opp.ranking_improvement
                    for opp in period_opportunities
                    if opp.ranking_improvement is not None
                ]
            )
            if period_opportunities
            else 0
        )

        # Count ranking achievements
        keywords_top_10 = len(
            [
                opp
                for opp in period_opportunities
                if opp.current_ranking and opp.current_ranking <= 10
            ]
        )
        keywords_top_3 = len(
            [
                opp
                for opp in period_opportunities
                if opp.current_ranking and opp.current_ranking <= 3
            ]
        )

        # Top performers
        top_performing_content = sorted(
            period_opportunities, key=lambda x: x.traffic_growth, reverse=True
        )[:5]

        top_performing_keywords = sorted(
            period_opportunities, key=lambda x: x.roi_percentage, reverse=True
        )[:5]

        # Generate recommendations
        recommendations = self._generate_recommendations(period_opportunities)

        return PerformanceSummary(
            period_start=period_start,
            period_end=period_end,
            total_opportunities_tracked=len(period_opportunities),
            successful_opportunities=len(successful_opportunities),
            success_rate=(
                len(successful_opportunities) / len(period_opportunities) * 100
                if period_opportunities
                else 0
            ),
            total_traffic_growth=total_traffic_growth,
            total_organic_traffic=total_organic_traffic,
            traffic_growth_percentage=(
                total_traffic_growth / len(period_opportunities)
                if period_opportunities
                else 0
            ),
            average_ranking_improvement=avg_ranking_improvement,
            keywords_ranking_top_10=keywords_top_10,
            keywords_ranking_top_3=keywords_top_3,
            total_investment=total_investment,
            total_revenue=total_revenue,
            overall_roi=(
                (total_revenue - total_investment) / total_investment * 100
                if total_investment > 0
                else 0
            ),
            top_performing_content=[opp.title for opp in top_performing_content],
            top_performing_keywords=[
                opp.target_keyword for opp in top_performing_keywords
            ],
            recommendations=recommendations,
        )

    def _generate_recommendations(
        self, opportunities: List[OpportunityPerformance]
    ) -> List[str]:
        """Generate actionable recommendations based on performance data."""
        recommendations = []

        # Analyze common success factors
        success_factors = {}
        for opp in opportunities:
            if opp.is_successful:
                for factor in opp.success_factors:
                    success_factors[factor] = success_factors.get(factor, 0) + 1

        if success_factors:
            top_success_factor = max(success_factors, key=success_factors.get)
            recommendations.append(
                f"Focus on {top_success_factor} - this was the most common success factor"
            )

        # Analyze common improvement areas
        improvement_areas = {}
        for opp in opportunities:
            for area in opp.areas_for_improvement:
                improvement_areas[area] = improvement_areas.get(area, 0) + 1

        if improvement_areas:
            top_improvement = max(improvement_areas, key=improvement_areas.get)
            recommendations.append(
                f"Address {top_improvement} - this was the most common improvement area"
            )

        # ROI recommendations
        low_roi_opportunities = [
            opp for opp in opportunities if opp.roi_percentage < 50
        ]
        if low_roi_opportunities:
            recommendations.append(
                "Review low-ROI opportunities and consider reallocating resources"
            )

        # Traffic growth recommendations
        low_traffic_growth = [opp for opp in opportunities if opp.traffic_growth < 10]
        if low_traffic_growth:
            recommendations.append(
                "Improve content optimization for opportunities with low traffic growth"
            )

        return recommendations

    def get_performance_insights(self) -> Dict[str, any]:
        """Get key performance insights and trends."""
        if not self.opportunity_performance:
            return {"message": "No performance data available"}

        opportunities = list(self.opportunity_performance.values())

        insights = {
            "total_opportunities": len(opportunities),
            "success_rate": len([opp for opp in opportunities if opp.is_successful])
            / len(opportunities)
            * 100,
            "average_traffic_growth": statistics.mean(
                [opp.traffic_growth for opp in opportunities]
            ),
            "average_roi": statistics.mean(
                [opp.roi_percentage for opp in opportunities]
            ),
            "best_performing_keyword": max(
                opportunities, key=lambda x: x.traffic_growth
            ).target_keyword,
            "highest_roi_opportunity": max(
                opportunities, key=lambda x: x.roi_percentage
            ).title,
            "quickest_payback": min(
                [opp for opp in opportunities if opp.payback_period_days],
                key=lambda x: x.payback_period_days,
                default=None,
            ),
        }

        return insights

    def _save_performance_data(self):
        """Save performance data to storage."""
        # Save content performance
        content_file = self.storage_path / "content_performance.json"
        content_data = {}
        for content_id, content in self.content_performance.items():
            content_data[content_id] = {
                "content_id": content.content_id,
                "url": content.url,
                "title": content.title,
                "target_keywords": content.target_keywords,
                "created_at": content.created_at,
                "last_updated": content.last_updated,
                "estimated_value": content.estimated_value,
                "implementation_cost": content.implementation_cost,
                "roi_percentage": content.roi_percentage,
                "traffic_trend": content.traffic_trend,
                "ranking_trend": content.ranking_trend,
                "conversion_trend": content.conversion_trend,
            }

        with open(content_file, "w") as f:
            json.dump(content_data, f, indent=2)

        # Save opportunity performance
        opportunity_file = self.storage_path / "opportunity_performance.json"
        opportunity_data = {}
        for opp_id, opp in self.opportunity_performance.items():
            opportunity_data[opp_id] = {
                "opportunity_id": opp.opportunity_id,
                "title": opp.title,
                "target_keyword": opp.target_keyword,
                "implemented_at": opp.implemented_at,
                "baseline_traffic": opp.baseline_traffic,
                "baseline_ranking": opp.baseline_ranking,
                "baseline_conversions": opp.baseline_conversions,
                "current_traffic": opp.current_traffic,
                "current_ranking": opp.current_ranking,
                "current_conversions": opp.current_conversions,
                "traffic_growth": opp.traffic_growth,
                "ranking_improvement": opp.ranking_improvement,
                "conversion_growth": opp.conversion_growth,
                "implementation_cost": opp.implementation_cost,
                "revenue_generated": opp.revenue_generated,
                "roi_percentage": opp.roi_percentage,
                "payback_period_days": opp.payback_period_days,
                "is_successful": opp.is_successful,
                "success_factors": opp.success_factors,
                "areas_for_improvement": opp.areas_for_improvement,
            }

        with open(opportunity_file, "w") as f:
            json.dump(opportunity_data, f, indent=2)

    def _load_performance_data(self):
        """Load performance data from storage."""
        # Load content performance
        content_file = self.storage_path / "content_performance.json"
        if content_file.exists():
            try:
                with open(content_file, "r") as f:
                    content_data = json.load(f)

                for content_id, data in content_data.items():
                    self.content_performance[content_id] = ContentPerformance(
                        content_id=data["content_id"],
                        url=data["url"],
                        title=data["title"],
                        target_keywords=data["target_keywords"],
                        created_at=data["created_at"],
                        last_updated=data["last_updated"],
                        organic_traffic=[],
                        ranking_positions=[],
                        conversions=[],
                        engagement_metrics=[],
                        estimated_value=data["estimated_value"],
                        implementation_cost=data["implementation_cost"],
                        roi_percentage=data["roi_percentage"],
                        traffic_trend=data["traffic_trend"],
                        ranking_trend=data["ranking_trend"],
                        conversion_trend=data["conversion_trend"],
                    )
            except Exception as e:
                logger.error(f"Error loading content performance data: {e}")

        # Load opportunity performance
        opportunity_file = self.storage_path / "opportunity_performance.json"
        if opportunity_file.exists():
            try:
                with open(opportunity_file, "r") as f:
                    opportunity_data = json.load(f)

                for opp_id, data in opportunity_data.items():
                    self.opportunity_performance[opp_id] = OpportunityPerformance(
                        opportunity_id=data["opportunity_id"],
                        title=data["title"],
                        target_keyword=data["target_keyword"],
                        implemented_at=data["implemented_at"],
                        baseline_traffic=data["baseline_traffic"],
                        baseline_ranking=data["baseline_ranking"],
                        baseline_conversions=data["baseline_conversions"],
                        current_traffic=data["current_traffic"],
                        current_ranking=data["current_ranking"],
                        current_conversions=data["current_conversions"],
                        traffic_growth=data["traffic_growth"],
                        ranking_improvement=data["ranking_improvement"],
                        conversion_growth=data["conversion_growth"],
                        implementation_cost=data["implementation_cost"],
                        revenue_generated=data["revenue_generated"],
                        roi_percentage=data["roi_percentage"],
                        payback_period_days=data["payback_period_days"],
                        is_successful=data["is_successful"],
                        success_factors=data["success_factors"],
                        areas_for_improvement=data["areas_for_improvement"],
                    )
            except Exception as e:
                logger.error(f"Error loading opportunity performance data: {e}")


# Example usage and testing
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Create performance tracker
    tracker = PerformanceTracker()

    # Test content performance tracking
    tracker.track_content_performance(
        "content_1",
        {
            "organic_traffic": 1500,
            "ranking_position": 8,
            "conversions": 25,
            "bounce_rate": 0.45,
        },
    )

    # Test opportunity performance tracking
    opportunity_data = {
        "title": "LS Engine Swap Guide",
        "target_keyword": "LS engine swap guide",
        "implemented_at": "2025-01-01T00:00:00",
        "baseline_traffic": 100,
        "baseline_ranking": 25,
        "baseline_conversions": 2,
        "current_traffic": 800,
        "current_ranking": 5,
        "current_conversions": 15,
        "implementation_cost": 500,
        "revenue_generated": 2500,
    }

    opportunity = tracker.track_opportunity_performance("opp_1", opportunity_data)
    print(f"✅ Opportunity tracked: {opportunity.title}")
    print(f"   Traffic growth: {opportunity.traffic_growth:.1f}%")
    print(f"   ROI: {opportunity.roi_percentage:.1f}%")
    print(f"   Success: {opportunity.is_successful}")

    # Generate performance insights
    insights = tracker.get_performance_insights()
    print("\n📊 Performance Insights:")
    for key, value in insights.items():
        print(f"   {key}: {value}")

    print("\n✅ Performance tracking system is ready for production!")

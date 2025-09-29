#!/usr/bin/env python3
"""
SEO Performance Tracking and Optimization - seo.content-automation

Tracks and optimizes SEO performance:
- Content performance tracking
- SEO metrics monitoring
- Automated optimization recommendations
- Performance analytics and reporting
- A/B testing for content optimization
"""

import json
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import statistics
from collections import defaultdict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MetricType(Enum):
    ORGANIC_TRAFFIC = "organic_traffic"
    KEYWORD_RANKINGS = "keyword_rankings"
    CLICK_THROUGH_RATE = "click_through_rate"
    BOUNCE_RATE = "bounce_rate"
    TIME_ON_PAGE = "time_on_page"
    CONVERSION_RATE = "conversion_rate"
    BACKLINKS = "backlinks"
    DOMAIN_AUTHORITY = "domain_authority"

@dataclass
class SEOMetric:
    """SEO performance metric."""
    content_id: str
    metric_type: MetricType
    value: float
    previous_value: Optional[float]
    change_percentage: float
    trend: str  # "up", "down", "stable"
    date: str
    source: str  # "google_analytics", "search_console", "manual"

@dataclass
class ContentPerformance:
    """Content performance summary."""
    content_id: str
    title: str
    url: str
    publish_date: str
    total_views: int
    organic_views: int
    keyword_rankings: Dict[str, int]
    avg_position: float
    click_through_rate: float
    bounce_rate: float
    time_on_page: float
    conversion_rate: float
    backlinks: int
    social_shares: int
    seo_score: float
    performance_score: float
    last_updated: str

@dataclass
class OptimizationRecommendation:
    """SEO optimization recommendation."""
    content_id: str
    recommendation_type: str
    title: str
    description: str
    current_value: Any
    recommended_value: Any
    expected_improvement: float
    priority: str
    effort_required: str
    implementation_steps: List[str]
    created_at: str

@dataclass
class PerformanceReport:
    """SEO performance report."""
    period_start: str
    period_end: str
    total_content: int
    avg_performance_score: float
    top_performers: List[ContentPerformance]
    underperformers: List[ContentPerformance]
    recommendations: List[OptimizationRecommendation]
    key_insights: List[str]
    generated_at: str

class SEOPerformanceTracker:
    """Tracks and analyzes SEO performance."""
    
    def __init__(self):
        self.performance_data: Dict[str, ContentPerformance] = {}
        self.metrics_history: List[SEOMetric] = []
        self.recommendations: List[OptimizationRecommendation] = []
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def track_content_performance(self, content_id: str, metrics: Dict[str, Any]) -> bool:
        """Track performance metrics for content."""
        
        try:
            # Calculate performance score
            performance_score = self._calculate_performance_score(metrics)
            
            # Create or update performance record
            performance = ContentPerformance(
                content_id=content_id,
                title=metrics.get("title", ""),
                url=metrics.get("url", ""),
                publish_date=metrics.get("publish_date", ""),
                total_views=metrics.get("total_views", 0),
                organic_views=metrics.get("organic_views", 0),
                keyword_rankings=metrics.get("keyword_rankings", {}),
                avg_position=metrics.get("avg_position", 0.0),
                click_through_rate=metrics.get("click_through_rate", 0.0),
                bounce_rate=metrics.get("bounce_rate", 0.0),
                time_on_page=metrics.get("time_on_page", 0.0),
                conversion_rate=metrics.get("conversion_rate", 0.0),
                backlinks=metrics.get("backlinks", 0),
                social_shares=metrics.get("social_shares", 0),
                seo_score=metrics.get("seo_score", 0.0),
                performance_score=performance_score,
                last_updated=datetime.now().isoformat()
            )
            
            # Store performance data
            self.performance_data[content_id] = performance
            
            # Track metrics history
            await self._track_metrics_history(content_id, metrics)
            
            # Generate recommendations
            await self._generate_recommendations(content_id, performance)
            
            logger.info(f"Tracked performance for content {content_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error tracking performance for {content_id}: {str(e)}")
            return False
    
    async def _track_metrics_history(self, content_id: str, metrics: Dict[str, Any]):
        """Track metrics history for trend analysis."""
        
        # Get previous metrics if available
        previous_metrics = self._get_previous_metrics(content_id)
        
        # Track each metric
        metric_types = [
            (MetricType.ORGANIC_TRAFFIC, "organic_views"),
            (MetricType.CLICK_THROUGH_RATE, "click_through_rate"),
            (MetricType.BOUNCE_RATE, "bounce_rate"),
            (MetricType.TIME_ON_PAGE, "time_on_page"),
            (MetricType.CONVERSION_RATE, "conversion_rate"),
            (MetricType.BACKLINKS, "backlinks")
        ]
        
        for metric_type, metric_key in metric_types:
            if metric_key in metrics:
                current_value = metrics[metric_key]
                previous_value = previous_metrics.get(metric_key) if previous_metrics else None
                
                # Calculate change percentage
                change_percentage = 0.0
                if previous_value is not None and previous_value != 0:
                    change_percentage = ((current_value - previous_value) / previous_value) * 100
                
                # Determine trend
                trend = "stable"
                if change_percentage > 5:
                    trend = "up"
                elif change_percentage < -5:
                    trend = "down"
                
                # Create metric record
                metric = SEOMetric(
                    content_id=content_id,
                    metric_type=metric_type,
                    value=current_value,
                    previous_value=previous_value,
                    change_percentage=change_percentage,
                    trend=trend,
                    date=datetime.now().isoformat(),
                    source="google_analytics"
                )
                
                self.metrics_history.append(metric)
    
    def _get_previous_metrics(self, content_id: str) -> Optional[Dict[str, Any]]:
        """Get previous metrics for content."""
        
        # Find most recent metrics for this content
        recent_metrics = [
            m for m in self.metrics_history
            if m.content_id == content_id
        ]
        
        if not recent_metrics:
            return None
        
        # Group by metric type and get latest
        latest_metrics = {}
        for metric in recent_metrics:
            if metric.metric_type not in latest_metrics:
                latest_metrics[metric.metric_type] = metric.value
        
        # Convert to dict with metric keys
        metric_keys = {
            MetricType.ORGANIC_TRAFFIC: "organic_views",
            MetricType.CLICK_THROUGH_RATE: "click_through_rate",
            MetricType.BOUNCE_RATE: "bounce_rate",
            MetricType.TIME_ON_PAGE: "time_on_page",
            MetricType.CONVERSION_RATE: "conversion_rate",
            MetricType.BACKLINKS: "backlinks"
        }
        
        return {
            metric_keys[metric_type]: value
            for metric_type, value in latest_metrics.items()
            if metric_type in metric_keys
        }
    
    def _calculate_performance_score(self, metrics: Dict[str, Any]) -> float:
        """Calculate overall performance score."""
        
        score = 0.0
        max_score = 100.0
        
        # Organic traffic weight (30%)
        organic_views = metrics.get("organic_views", 0)
        if organic_views > 1000:
            score += 30
        elif organic_views > 500:
            score += 20
        elif organic_views > 100:
            score += 10
        
        # Click-through rate weight (20%)
        ctr = metrics.get("click_through_rate", 0)
        if ctr > 5:
            score += 20
        elif ctr > 3:
            score += 15
        elif ctr > 1:
            score += 10
        
        # Bounce rate weight (15%)
        bounce_rate = metrics.get("bounce_rate", 100)
        if bounce_rate < 30:
            score += 15
        elif bounce_rate < 50:
            score += 10
        elif bounce_rate < 70:
            score += 5
        
        # Time on page weight (15%)
        time_on_page = metrics.get("time_on_page", 0)
        if time_on_page > 300:  # 5 minutes
            score += 15
        elif time_on_page > 180:  # 3 minutes
            score += 10
        elif time_on_page > 60:  # 1 minute
            score += 5
        
        # Conversion rate weight (10%)
        conversion_rate = metrics.get("conversion_rate", 0)
        if conversion_rate > 5:
            score += 10
        elif conversion_rate > 2:
            score += 7
        elif conversion_rate > 1:
            score += 5
        
        # Backlinks weight (10%)
        backlinks = metrics.get("backlinks", 0)
        if backlinks > 50:
            score += 10
        elif backlinks > 20:
            score += 7
        elif backlinks > 5:
            score += 5
        
        return min(max_score, score)
    
    async def _generate_recommendations(self, content_id: str, performance: ContentPerformance):
        """Generate optimization recommendations for content."""
        
        recommendations = []
        
        # Check organic traffic
        if performance.organic_views < 100:
            recommendations.append(OptimizationRecommendation(
                content_id=content_id,
                recommendation_type="traffic",
                title="Improve Organic Traffic",
                description="Content has low organic traffic. Focus on keyword optimization and promotion.",
                current_value=performance.organic_views,
                recommended_value=500,
                expected_improvement=25.0,
                priority="high",
                effort_required="medium",
                implementation_steps=[
                    "Optimize target keywords",
                    "Improve internal linking",
                    "Promote on social media",
                    "Build backlinks"
                ],
                created_at=datetime.now().isoformat()
            ))
        
        # Check click-through rate
        if performance.click_through_rate < 2:
            recommendations.append(OptimizationRecommendation(
                content_id=content_id,
                recommendation_type="ctr",
                title="Improve Click-Through Rate",
                description="Low CTR indicates unappealing title or meta description.",
                current_value=performance.click_through_rate,
                recommended_value=3.5,
                expected_improvement=15.0,
                priority="medium",
                effort_required="low",
                implementation_steps=[
                    "A/B test different titles",
                    "Optimize meta description",
                    "Add compelling call-to-action",
                    "Improve featured snippets"
                ],
                created_at=datetime.now().isoformat()
            ))
        
        # Check bounce rate
        if performance.bounce_rate > 70:
            recommendations.append(OptimizationRecommendation(
                content_id=content_id,
                recommendation_type="bounce_rate",
                title="Reduce Bounce Rate",
                description="High bounce rate indicates poor content quality or user experience.",
                current_value=performance.bounce_rate,
                recommended_value=50,
                expected_improvement=20.0,
                priority="high",
                effort_required="high",
                implementation_steps=[
                    "Improve content quality",
                    "Add internal links",
                    "Optimize page speed",
                    "Improve mobile experience"
                ],
                created_at=datetime.now().isoformat()
            ))
        
        # Check time on page
        if performance.time_on_page < 60:
            recommendations.append(OptimizationRecommendation(
                content_id=content_id,
                recommendation_type="engagement",
                title="Increase Time on Page",
                description="Low time on page indicates content needs improvement.",
                current_value=performance.time_on_page,
                recommended_value=180,
                expected_improvement=30.0,
                priority="medium",
                effort_required="medium",
                implementation_steps=[
                    "Add more valuable content",
                    "Include interactive elements",
                    "Improve content structure",
                    "Add related content suggestions"
                ],
                created_at=datetime.now().isoformat()
            ))
        
        # Check keyword rankings
        if performance.avg_position > 10:
            recommendations.append(OptimizationRecommendation(
                content_id=content_id,
                recommendation_type="rankings",
                title="Improve Keyword Rankings",
                description="Content is not ranking well for target keywords.",
                current_value=performance.avg_position,
                recommended_value=5,
                expected_improvement=40.0,
                priority="high",
                effort_required="high",
                implementation_steps=[
                    "Optimize target keywords",
                    "Improve content quality",
                    "Build more backlinks",
                    "Optimize technical SEO"
                ],
                created_at=datetime.now().isoformat()
            ))
        
        # Add recommendations
        self.recommendations.extend(recommendations)
        
        logger.info(f"Generated {len(recommendations)} recommendations for content {content_id}")
    
    def get_performance_insights(self, days: int = 30) -> Dict[str, Any]:
        """Get performance insights for the last N days."""
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Filter recent performance data
        recent_performance = [
            p for p in self.performance_data.values()
            if datetime.fromisoformat(p.last_updated) >= cutoff_date
        ]
        
        if not recent_performance:
            return {"message": "No performance data available"}
        
        # Calculate insights
        total_views = sum(p.total_views for p in recent_performance)
        avg_performance_score = sum(p.performance_score for p in recent_performance) / len(recent_performance)
        
        # Top performers
        top_performers = sorted(recent_performance, key=lambda x: x.performance_score, reverse=True)[:5]
        
        # Underperformers
        underperformers = sorted(recent_performance, key=lambda x: x.performance_score)[:5]
        
        # Performance trends
        trends = self._analyze_performance_trends(days)
        
        # Content type performance
        content_type_performance = self._analyze_content_type_performance(recent_performance)
        
        return {
            "period_days": days,
            "total_content_analyzed": len(recent_performance),
            "total_views": total_views,
            "average_performance_score": avg_performance_score,
            "top_performers": [
                {
                    "content_id": p.content_id,
                    "title": p.title,
                    "performance_score": p.performance_score,
                    "organic_views": p.organic_views
                }
                for p in top_performers
            ],
            "underperformers": [
                {
                    "content_id": p.content_id,
                    "title": p.title,
                    "performance_score": p.performance_score,
                    "organic_views": p.organic_views
                }
                for p in underperformers
            ],
            "trends": trends,
            "content_type_performance": content_type_performance
        }
    
    def _analyze_performance_trends(self, days: int) -> Dict[str, Any]:
        """Analyze performance trends over time."""
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Group metrics by date
        daily_metrics = defaultdict(list)
        for metric in self.metrics_history:
            metric_date = datetime.fromisoformat(metric.date)
            if metric_date >= cutoff_date:
                date_str = metric_date.strftime("%Y-%m-%d")
                daily_metrics[date_str].append(metric)
        
        # Calculate daily averages
        daily_averages = {}
        for date, metrics in daily_metrics.items():
            if metrics:
                avg_organic_traffic = statistics.mean([
                    m.value for m in metrics if m.metric_type == MetricType.ORGANIC_TRAFFIC
                ])
                daily_averages[date] = {
                    "organic_traffic": avg_organic_traffic,
                    "metric_count": len(metrics)
                }
        
        return {
            "daily_averages": daily_averages,
            "trend_direction": "up" if len(daily_averages) > 1 else "stable"
        }
    
    def _analyze_content_type_performance(self, performance_data: List[ContentPerformance]) -> Dict[str, Any]:
        """Analyze performance by content type."""
        
        # Group by content type (would need content type data)
        content_types = defaultdict(list)
        for performance in performance_data:
            # Mock content type - in production, get from content metadata
            content_type = "blog_post"  # Default
            content_types[content_type].append(performance)
        
        type_performance = {}
        for content_type, performances in content_types.items():
            if performances:
                avg_score = statistics.mean(p.performance_score for p in performances)
                total_views = sum(p.total_views for p in performances)
                type_performance[content_type] = {
                    "average_score": avg_score,
                    "total_views": total_views,
                    "content_count": len(performances)
                }
        
        return type_performance
    
    def generate_performance_report(self, days: int = 30) -> PerformanceReport:
        """Generate comprehensive performance report."""
        
        insights = self.get_performance_insights(days)
        
        # Get top and underperformers
        top_performers = [
            p for p in self.performance_data.values()
            if p.content_id in [tp["content_id"] for tp in insights["top_performers"]]
        ]
        
        underperformers = [
            p for p in self.performance_data.values()
            if p.content_id in [up["content_id"] for up in insights["underperformers"]]
        ]
        
        # Get recommendations
        recent_recommendations = [
            r for r in self.recommendations
            if datetime.fromisoformat(r.created_at) >= datetime.now() - timedelta(days=days)
        ]
        
        # Generate key insights
        key_insights = self._generate_key_insights(insights)
        
        return PerformanceReport(
            period_start=(datetime.now() - timedelta(days=days)).isoformat(),
            period_end=datetime.now().isoformat(),
            total_content=insights["total_content_analyzed"],
            avg_performance_score=insights["average_performance_score"],
            top_performers=top_performers,
            underperformers=underperformers,
            recommendations=recent_recommendations,
            key_insights=key_insights,
            generated_at=datetime.now().isoformat()
        )
    
    def _generate_key_insights(self, insights: Dict[str, Any]) -> List[str]:
        """Generate key insights from performance data."""
        
        insights_list = []
        
        # Performance score insight
        avg_score = insights["average_performance_score"]
        if avg_score > 80:
            insights_list.append("Overall content performance is excellent")
        elif avg_score > 60:
            insights_list.append("Content performance is good with room for improvement")
        else:
            insights_list.append("Content performance needs significant improvement")
        
        # Top performer insight
        if insights["top_performers"]:
            top_performer = insights["top_performers"][0]
            insights_list.append(f"Top performing content: '{top_performer['title']}' with {top_performer['performance_score']:.1f} score")
        
        # Underperformer insight
        if insights["underperformers"]:
            underperformer = insights["underperformers"][0]
            insights_list.append(f"Content needing attention: '{underperformer['title']}' with {underperformer['performance_score']:.1f} score")
        
        # Trend insight
        trends = insights.get("trends", {})
        if trends.get("trend_direction") == "up":
            insights_list.append("Performance is trending upward")
        elif trends.get("trend_direction") == "down":
            insights_list.append("Performance is trending downward")
        
        return insights_list
    
    def export_performance_data(self, format: str = "json") -> str:
        """Export performance data."""
        
        if format == "json":
            return json.dumps({
                "performance_data": {k: asdict(v) for k, v in self.performance_data.items()},
                "recommendations": [asdict(r) for r in self.recommendations],
                "exported_at": datetime.now().isoformat()
            }, indent=2, default=str)
        else:
            raise ValueError(f"Unsupported format: {format}")

async def main():
    """Main function to demonstrate SEO performance tracking."""
    
    # Sample performance data
    sample_metrics = {
        "title": "Complete Guide to SEO Best Practices",
        "url": "https://example.com/seo-guide",
        "publish_date": "2025-09-01",
        "total_views": 1500,
        "organic_views": 1200,
        "keyword_rankings": {"seo best practices": 3, "search optimization": 5},
        "avg_position": 4.0,
        "click_through_rate": 3.2,
        "bounce_rate": 45.0,
        "time_on_page": 240.0,
        "conversion_rate": 2.5,
        "backlinks": 25,
        "social_shares": 150,
        "seo_score": 85.0
    }
    
    # Initialize tracker
    async with SEOPerformanceTracker() as tracker:
        # Track performance
        await tracker.track_content_performance("content_1", sample_metrics)
        
        # Get insights
        insights = tracker.get_performance_insights(30)
        print("SEO Performance Insights:")
        print(f"Total content analyzed: {insights['total_content_analyzed']}")
        print(f"Average performance score: {insights['average_performance_score']:.1f}")
        print(f"Total views: {insights['total_views']}")
        
        # Generate report
        report = tracker.generate_performance_report(30)
        print(f"\nPerformance Report Generated:")
        print(f"Period: {report.period_start} to {report.period_end}")
        print(f"Key insights: {len(report.key_insights)}")
        print(f"Recommendations: {len(report.recommendations)}")
        
        # Export data
        performance_json = tracker.export_performance_data("json")
        with open("seo_performance_data.json", "w") as f:
            f.write(performance_json)
        
        print("\nFiles created:")
        print("- seo_performance_data.json")

if __name__ == "__main__":
    asyncio.run(main())

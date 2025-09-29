#!/usr/bin/env python3
"""
Content Automation Main Orchestrator - seo.content-automation

Orchestrates all content automation components:
- AI content generation
- Competitor analysis
- Content calendar management
- SEO performance tracking
- Automated publishing workflow
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import asdict

from ai_content_generator import AIContentGenerator, ContentType, ContentStatus
from competitor_analyzer import CompetitorContentAnalyzer
from content_calendar import ContentCalendarManager, ContentPriority, ContentScheduler
from seo_performance_tracker import SEOPerformanceTracker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ContentAutomationOrchestrator:
    """Main orchestrator for content automation system."""
    
    def __init__(self):
        self.ai_generator = None
        self.competitor_analyzer = None
        self.calendar_manager = ContentCalendarManager()
        self.performance_tracker = None
        self.scheduler = ContentScheduler(self.calendar_manager)
        self.is_running = False
    
    async def initialize(self):
        """Initialize all automation components."""
        
        logger.info("Initializing Content Automation System...")
        
        # Initialize AI content generator
        self.ai_generator = AIContentGenerator()
        await self.ai_generator.__aenter__()
        
        # Initialize competitor analyzer
        self.competitor_analyzer = CompetitorContentAnalyzer()
        await self.competitor_analyzer.__aenter__()
        
        # Initialize performance tracker
        self.performance_tracker = SEOPerformanceTracker()
        await self.performance_tracker.__aenter__()
        
        logger.info("Content Automation System initialized successfully")
    
    async def cleanup(self):
        """Cleanup all automation components."""
        
        logger.info("Cleaning up Content Automation System...")
        
        if self.ai_generator:
            await self.ai_generator.__aexit__(None, None, None)
        
        if self.competitor_analyzer:
            await self.competitor_analyzer.__aexit__(None, None, None)
        
        if self.performance_tracker:
            await self.performance_tracker.__aexit__(None, None, None)
        
        logger.info("Content Automation System cleaned up")
    
    async def generate_content_from_opportunity(self, seo_opportunity: Dict[str, Any]) -> Dict[str, Any]:
        """Generate content from SEO opportunity."""
        
        logger.info(f"Generating content from opportunity: {seo_opportunity.get('keyword', 'Unknown')}")
        
        try:
            # Extract opportunity data
            keyword = seo_opportunity.get("keyword", "")
            content_type = ContentType(seo_opportunity.get("content_type", "blog_post"))
            target_keywords = seo_opportunity.get("target_keywords", [keyword])
            
            # Generate content brief
            brief = await self.ai_generator.generate_content_brief(
                topic=keyword,
                content_type=content_type,
                target_keywords=target_keywords,
                seo_opportunity=seo_opportunity
            )
            
            # Generate full content
            content = await self.ai_generator.generate_content(brief)
            
            # Add to content calendar
            calendar_entry = self.calendar_manager.add_content_entry(
                title=content.title,
                content_type=content_type,
                scheduled_date=(datetime.now() + timedelta(days=7)).isoformat(),
                priority=ContentPriority.HIGH,
                assigned_to="ai_content_generator",
                tags=["ai_generated", "seo_opportunity"],
                seo_keywords=target_keywords,
                target_audience=brief.target_audience,
                estimated_read_time=brief.word_count_target // 200,  # Estimate read time
                word_count_target=brief.word_count_target
            )
            
            # Link brief and content to calendar entry
            calendar_entry.brief_id = brief.id
            calendar_entry.content_id = content.id
            
            logger.info(f"Generated content: {content.title}")
            
            return {
                "success": True,
                "brief": asdict(brief),
                "content": asdict(content),
                "calendar_entry": asdict(calendar_entry)
            }
            
        except Exception as e:
            logger.error(f"Error generating content from opportunity: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def analyze_competitor_and_generate_content(self, competitor_domain: str, max_pages: int = 10) -> Dict[str, Any]:
        """Analyze competitor and generate content based on gaps."""
        
        logger.info(f"Analyzing competitor: {competitor_domain}")
        
        try:
            # Analyze competitor
            competitor_analysis = await self.competitor_analyzer.analyze_competitor(
                competitor_domain, max_pages
            )
            
            # Generate content for top opportunities
            generated_content = []
            for gap in competitor_analysis.content_gaps[:3]:  # Top 3 opportunities
                content_result = await self.generate_content_from_opportunity({
                    "keyword": gap.keyword,
                    "content_type": gap.content_type,
                    "target_keywords": [gap.keyword],
                    "opportunity_score": gap.opportunity_score,
                    "competitor_urls": gap.competitor_urls
                })
                
                if content_result["success"]:
                    generated_content.append(content_result)
            
            logger.info(f"Generated {len(generated_content)} pieces of content from competitor analysis")
            
            return {
                "success": True,
                "competitor_analysis": asdict(competitor_analysis),
                "generated_content": generated_content
            }
            
        except Exception as e:
            logger.error(f"Error analyzing competitor and generating content: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def optimize_content_performance(self, content_id: str) -> Dict[str, Any]:
        """Optimize content based on performance data."""
        
        logger.info(f"Optimizing content performance: {content_id}")
        
        try:
            # Get current performance
            performance = self.performance_tracker.performance_data.get(content_id)
            if not performance:
                return {
                    "success": False,
                    "error": "No performance data found for content"
                }
            
            # Get optimization recommendations
            recommendations = [
                r for r in self.performance_tracker.recommendations
                if r.content_id == content_id
            ]
            
            # Apply optimizations
            optimization_results = []
            for recommendation in recommendations:
                if recommendation.priority == "high":
                    # Apply high-priority optimizations
                    optimization_result = await self._apply_optimization(content_id, recommendation)
                    optimization_results.append(optimization_result)
            
            logger.info(f"Applied {len(optimization_results)} optimizations to content {content_id}")
            
            return {
                "success": True,
                "performance": asdict(performance),
                "recommendations": [asdict(r) for r in recommendations],
                "optimization_results": optimization_results
            }
            
        except Exception as e:
            logger.error(f"Error optimizing content performance: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _apply_optimization(self, content_id: str, recommendation: Any) -> Dict[str, Any]:
        """Apply specific optimization recommendation."""
        
        # Mock optimization application
        # In production, this would integrate with CMS/WordPress/etc.
        
        logger.info(f"Applying optimization: {recommendation.title}")
        
        # Simulate optimization delay
        await asyncio.sleep(1)
        
        return {
            "recommendation_id": recommendation.content_id,
            "applied": True,
            "expected_improvement": recommendation.expected_improvement,
            "applied_at": datetime.now().isoformat()
        }
    
    async def run_automation_cycle(self) -> Dict[str, Any]:
        """Run complete automation cycle."""
        
        logger.info("Starting automation cycle...")
        
        cycle_results = {
            "started_at": datetime.now().isoformat(),
            "content_generated": 0,
            "content_optimized": 0,
            "competitors_analyzed": 0,
            "errors": []
        }
        
        try:
            # 1. Analyze top competitors
            competitors = ["competitor1.com", "competitor2.com"]
            for competitor in competitors:
                try:
                    result = await self.analyze_competitor_and_generate_content(competitor, max_pages=5)
                    if result["success"]:
                        cycle_results["competitors_analyzed"] += 1
                        cycle_results["content_generated"] += len(result["generated_content"])
                    else:
                        cycle_results["errors"].append(f"Competitor analysis failed for {competitor}: {result.get('error', 'Unknown error')}")
                except Exception as e:
                    cycle_results["errors"].append(f"Error analyzing {competitor}: {str(e)}")
            
            # 2. Optimize underperforming content
            underperforming_content = [
                content_id for content_id, performance in self.performance_tracker.performance_data.items()
                if performance.performance_score < 50
            ]
            
            for content_id in underperforming_content[:3]:  # Top 3 underperformers
                try:
                    result = await self.optimize_content_performance(content_id)
                    if result["success"]:
                        cycle_results["content_optimized"] += 1
                    else:
                        cycle_results["errors"].append(f"Content optimization failed for {content_id}: {result.get('error', 'Unknown error')}")
                except Exception as e:
                    cycle_results["errors"].append(f"Error optimizing {content_id}: {str(e)}")
            
            # 3. Schedule upcoming content
            upcoming_content = self.calendar_manager.get_upcoming_content(7)
            for entry in upcoming_content:
                if entry.status.value == "draft":
                    # Auto-schedule for publishing
                    self.calendar_manager.schedule_content(
                        entry.id,
                        (datetime.now() + timedelta(days=1)).isoformat()
                    )
            
            cycle_results["completed_at"] = datetime.now().isoformat()
            cycle_results["success"] = len(cycle_results["errors"]) == 0
            
            logger.info(f"Automation cycle completed: {cycle_results['content_generated']} content generated, {cycle_results['content_optimized']} optimized")
            
        except Exception as e:
            cycle_results["errors"].append(f"Automation cycle error: {str(e)}")
            cycle_results["success"] = False
            logger.error(f"Automation cycle failed: {str(e)}")
        
        return cycle_results
    
    async def start_automation_service(self):
        """Start the automation service with continuous operation."""
        
        logger.info("Starting Content Automation Service...")
        
        self.is_running = True
        
        # Start scheduler
        scheduler_task = asyncio.create_task(self.scheduler.start_scheduler())
        
        # Run automation cycles
        cycle_count = 0
        while self.is_running:
            try:
                cycle_count += 1
                logger.info(f"Starting automation cycle #{cycle_count}")
                
                cycle_results = await self.run_automation_cycle()
                
                # Log cycle results
                if cycle_results["success"]:
                    logger.info(f"Cycle #{cycle_count} completed successfully")
                else:
                    logger.warning(f"Cycle #{cycle_count} completed with errors: {cycle_results['errors']}")
                
                # Wait before next cycle (e.g., 1 hour)
                await asyncio.sleep(3600)
                
            except Exception as e:
                logger.error(f"Error in automation cycle #{cycle_count}: {str(e)}")
                await asyncio.sleep(300)  # Wait 5 minutes before retry
        
        # Cancel scheduler task
        scheduler_task.cancel()
        logger.info("Content Automation Service stopped")
    
    def stop_automation_service(self):
        """Stop the automation service."""
        
        self.is_running = False
        logger.info("Stopping Content Automation Service...")
    
    def get_automation_status(self) -> Dict[str, Any]:
        """Get current automation system status."""
        
        return {
            "is_running": self.is_running,
            "calendar_entries": len(self.calendar_manager.calendar.entries),
            "performance_tracked": len(self.performance_tracker.performance_data),
            "recommendations": len(self.performance_tracker.recommendations),
            "upcoming_content": len(self.calendar_manager.get_upcoming_content(7)),
            "draft_content": len(self.calendar_manager.get_content_by_status(ContentStatus.DRAFT)),
            "published_content": len(self.calendar_manager.get_content_by_status(ContentStatus.PUBLISHED))
        }
    
    def export_automation_data(self, format: str = "json") -> str:
        """Export all automation data."""
        
        data = {
            "calendar": asdict(self.calendar_manager.calendar),
            "performance_data": {
                k: asdict(v) for k, v in self.performance_tracker.performance_data.items()
            },
            "recommendations": [asdict(r) for r in self.performance_tracker.recommendations],
            "exported_at": datetime.now().isoformat()
        }
        
        if format == "json":
            return json.dumps(data, indent=2, default=str)
        else:
            raise ValueError(f"Unsupported format: {format}")

async def main():
    """Main function to demonstrate content automation."""
    
    # Initialize orchestrator
    orchestrator = ContentAutomationOrchestrator()
    
    try:
        await orchestrator.initialize()
        
        # Run sample automation cycle
        print("Running sample automation cycle...")
        cycle_results = await orchestrator.run_automation_cycle()
        
        print(f"✅ Automation cycle completed!")
        print(f"Content generated: {cycle_results['content_generated']}")
        print(f"Content optimized: {cycle_results['content_optimized']}")
        print(f"Competitors analyzed: {cycle_results['competitors_analyzed']}")
        
        if cycle_results['errors']:
            print(f"Errors: {len(cycle_results['errors'])}")
            for error in cycle_results['errors']:
                print(f"  - {error}")
        
        # Get status
        status = orchestrator.get_automation_status()
        print(f"\nAutomation Status:")
        print(f"Calendar entries: {status['calendar_entries']}")
        print(f"Performance tracked: {status['performance_tracked']}")
        print(f"Recommendations: {status['recommendations']}")
        
        # Export data
        automation_data = orchestrator.export_automation_data("json")
        with open("content_automation_data.json", "w") as f:
            f.write(automation_data)
        
        print("\nFiles created:")
        print("- content_automation_data.json")
        
    finally:
        await orchestrator.cleanup()

if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
Test script for Content Automation System - seo.content-automation

Tests all automation components:
- AI content generation
- Competitor analysis
- Content calendar management
- SEO performance tracking
- Automated publishing workflow
"""

import asyncio
import sys
import os
import json
from datetime import datetime, timedelta

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.seo_api.automation.ai_content_generator import AIContentGenerator, ContentType
from app.seo_api.automation.competitor_analyzer import CompetitorContentAnalyzer
from app.seo_api.automation.content_calendar import ContentCalendarManager, ContentPriority
from app.seo_api.automation.seo_performance_tracker import SEOPerformanceTracker
from app.seo_api.automation.main import ContentAutomationOrchestrator

async def test_ai_content_generation():
    """Test AI content generation."""
    print("🤖 Testing AI Content Generation...")
    
    try:
        async with AIContentGenerator() as generator:
            # Generate content brief
            brief = await generator.generate_content_brief(
                topic="SEO Best Practices for E-commerce",
                content_type=ContentType.BLOG_POST,
                target_keywords=["seo best practices", "ecommerce seo", "online store optimization"]
            )
            
            print(f"✅ Content brief generated: {brief.title}")
            print(f"   Target keywords: {brief.target_keywords}")
            print(f"   Word count target: {brief.word_count_target}")
            
            # Generate full content
            content = await generator.generate_content(brief)
            
            print(f"✅ Content generated: {content.word_count} words")
            print(f"   Readability score: {content.readability_score:.1f}")
            print(f"   SEO score: {content.seo_score:.1f}")
            
            return True
            
    except Exception as e:
        print(f"❌ AI content generation failed: {str(e)}")
        return False

async def test_competitor_analysis():
    """Test competitor analysis."""
    print("\n🔍 Testing Competitor Analysis...")
    
    try:
        async with CompetitorContentAnalyzer() as analyzer:
            # Analyze competitor (using httpbin for testing)
            analysis = await analyzer.analyze_competitor("httpbin.org", max_pages=3)
            
            print(f"✅ Competitor analysis complete!")
            print(f"   Pages analyzed: {analysis.total_pages_analyzed}")
            print(f"   Content gaps found: {len(analysis.content_gaps)}")
            print(f"   Keyword opportunities: {len(analysis.keyword_opportunities)}")
            print(f"   Content recommendations: {len(analysis.content_recommendations)}")
            
            return True
            
    except Exception as e:
        print(f"❌ Competitor analysis failed: {str(e)}")
        return False

def test_content_calendar():
    """Test content calendar management."""
    print("\n📅 Testing Content Calendar...")
    
    try:
        calendar_manager = ContentCalendarManager()
        
        # Add sample content entries
        entry1 = calendar_manager.add_content_entry(
            title="Complete Guide to SEO Best Practices",
            content_type=ContentType.BLOG_POST,
            scheduled_date=(datetime.now() + timedelta(days=1)).isoformat(),
            priority=ContentPriority.HIGH,
            assigned_to="content_writer",
            tags=["seo", "marketing", "guide"],
            seo_keywords=["seo best practices", "search optimization"]
        )
        
        entry2 = calendar_manager.add_content_entry(
            title="Product Launch: New E-commerce Features",
            content_type=ContentType.NEWS_ARTICLE,
            scheduled_date=(datetime.now() + timedelta(days=3)).isoformat(),
            priority=ContentPriority.URGENT,
            assigned_to="product_manager",
            tags=["product", "launch", "ecommerce"]
        )
        
        print(f"✅ Content calendar entries added: {len(calendar_manager.calendar.entries)}")
        
        # Get analytics
        analytics = calendar_manager.get_content_analytics()
        print(f"   Total entries: {analytics['total_entries']}")
        print(f"   Draft entries: {analytics['draft_entries']}")
        print(f"   Completion rate: {analytics['completion_rate']:.1f}%")
        
        # Get upcoming content
        upcoming = calendar_manager.get_upcoming_content(7)
        print(f"   Upcoming content (next 7 days): {len(upcoming)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Content calendar test failed: {str(e)}")
        return False

async def test_seo_performance_tracking():
    """Test SEO performance tracking."""
    print("\n📊 Testing SEO Performance Tracking...")
    
    try:
        async with SEOPerformanceTracker() as tracker:
            # Track sample performance data
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
            
            success = await tracker.track_content_performance("content_1", sample_metrics)
            
            if success:
                print(f"✅ Performance tracking successful")
                
                # Get insights
                insights = tracker.get_performance_insights(30)
                print(f"   Content analyzed: {insights['total_content_analyzed']}")
                print(f"   Average performance score: {insights['average_performance_score']:.1f}")
                print(f"   Total views: {insights['total_views']}")
                
                # Generate report
                report = tracker.generate_performance_report(30)
                print(f"   Performance report generated: {len(report.key_insights)} insights")
                print(f"   Recommendations: {len(report.recommendations)}")
                
                return True
            else:
                print(f"❌ Performance tracking failed")
                return False
                
    except Exception as e:
        print(f"❌ SEO performance tracking failed: {str(e)}")
        return False

async def test_full_automation():
    """Test full automation orchestrator."""
    print("\n🚀 Testing Full Automation System...")
    
    try:
        orchestrator = ContentAutomationOrchestrator()
        
        await orchestrator.initialize()
        
        # Run automation cycle
        cycle_results = await orchestrator.run_automation_cycle()
        
        print(f"✅ Automation cycle completed!")
        print(f"   Content generated: {cycle_results['content_generated']}")
        print(f"   Content optimized: {cycle_results['content_optimized']}")
        print(f"   Competitors analyzed: {cycle_results['competitors_analyzed']}")
        
        if cycle_results['errors']:
            print(f"   Errors: {len(cycle_results['errors'])}")
            for error in cycle_results['errors'][:3]:  # Show first 3 errors
                print(f"     - {error}")
        
        # Get status
        status = orchestrator.get_automation_status()
        print(f"   Calendar entries: {status['calendar_entries']}")
        print(f"   Performance tracked: {status['performance_tracked']}")
        print(f"   Recommendations: {status['recommendations']}")
        
        await orchestrator.cleanup()
        return True
        
    except Exception as e:
        print(f"❌ Full automation test failed: {str(e)}")
        return False

async def main():
    """Main test function."""
    print("🎯 Testing Content Automation System - seo.content-automation")
    print("=" * 70)
    
    test_results = []
    
    # Test individual components
    test_results.append(await test_ai_content_generation())
    test_results.append(await test_competitor_analysis())
    test_results.append(test_content_calendar())
    test_results.append(await test_seo_performance_tracking())
    test_results.append(await test_full_automation())
    
    # Summary
    passed_tests = sum(test_results)
    total_tests = len(test_results)
    
    print(f"\n📋 Test Results Summary:")
    print(f"✅ Passed: {passed_tests}/{total_tests}")
    print(f"❌ Failed: {total_tests - passed_tests}/{total_tests}")
    
    if passed_tests == total_tests:
        print("\n🎉 All tests passed! Content Automation System is ready.")
        
        # Export test data
        try:
            orchestrator = ContentAutomationOrchestrator()
            await orchestrator.initialize()
            
            automation_data = orchestrator.export_automation_data("json")
            with open("content_automation_test_data.json", "w") as f:
                f.write(automation_data)
            
            print("\n📁 Files created:")
            print("- content_automation_test_data.json")
            
            await orchestrator.cleanup()
            
        except Exception as e:
            print(f"⚠️  Error exporting test data: {str(e)}")
    else:
        print(f"\n⚠️  Some tests failed. Please check the errors above.")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

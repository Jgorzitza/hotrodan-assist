#!/usr/bin/env python3
"""
Test script for SEO Advanced Analytics Platform
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app', 'seo-api', 'analytics'))

from main import SEOAdvancedAnalyticsPlatform

def main():
    """Test the SEO Advanced Analytics Platform."""
    
    print("🚀 Testing SEO Advanced Analytics Platform")
    print("=" * 45)
    
    # Initialize platform
    platform = SEOAdvancedAnalyticsPlatform()
    
    # Sample data
    keywords = ["seo best practices", "content marketing", "keyword research"]
    competitors = ["competitor1.com", "competitor2.com"]
    
    # Sample metrics
    metrics = {
        "organic_traffic": [1000, 1100, 1200, 1300, 1400, 1500],
        "average_rank": [15, 14, 13, 12, 11, 10],
        "click_through_rate": [2.5, 2.7, 2.9, 3.1, 3.3, 3.5]
    }
    
    # Add sample metric data
    from datetime import datetime, timedelta
    for metric_name, values in metrics.items():
        for i, value in enumerate(values):
            timestamp = (datetime.now() - timedelta(days=len(values)-i)).isoformat()
            platform.add_metric_data(metric_name, value, timestamp)
    
    # Generate comprehensive report
    report = platform.generate_comprehensive_report(keywords, competitors, metrics)
    
    print(f"✅ Report Generated: {report['report_id']}")
    print(f"📊 Forecasts: {len(report['predictive_analytics']['forecasts'])}")
    print(f"🏆 Competitive Analysis: {len(report['predictive_analytics']['competitive_analysis'])}")
    print(f"📈 Trends: {len(report['predictive_analytics']['trends'])}")
    print(f"⚠️ Active Alerts: {report['alerts']['summary']['active_alerts']}")
    print(f"💡 Insights: {len(report['insights'])}")
    print(f"🚀 Recommendations: {len(report['recommendations'])}")
    
    # Save report
    import json
    with open("seo_advanced_analytics_test_report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)
    
    print("\n🎯 Key Insights:")
    for insight in report['insights']:
        print(f"  {insight}")
    
    print("\n🚀 Top Recommendations:")
    for i, rec in enumerate(report['recommendations'][:3], 1):
        print(f"  {i}. {rec}")
    
    print("\n✅ SEO Advanced Analytics Platform test completed!")
    print("Files created:")
    print("- seo_advanced_analytics_test_report.json")

if __name__ == "__main__":
    main()

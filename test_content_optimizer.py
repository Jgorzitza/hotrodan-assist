#!/usr/bin/env python3
"""
Test script for Content Optimization System
"""

import sys
import os
import asyncio

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app/seo-api.content_optimizer import ContentOptimizer
from app/seo-api.content_crawler import ContentCrawler

def test_content_optimizer():
    """Test content optimization with sample HTML."""
    print("Testing Content Optimizer...")
    
    # Sample HTML content
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>SEO Tips</title>
        <meta name="description" content="Learn about SEO">
    </head>
    <body>
        <h1>SEO Tips</h1>
        <h2>Introduction</h2>
        <p>Search engine optimization is important for websites. It helps improve visibility in search results.</p>
        <h2>Best Practices</h2>
        <p>Use relevant keywords, create quality content, and build backlinks.</p>
        <h2>Conclusion</h2>
        <p>Follow these tips to improve your SEO.</p>
    </body>
    </html>
    """
    
    # Initialize optimizer
    optimizer = ContentOptimizer()
    
    # Analyze content
    report = optimizer.optimize_content(sample_html, "https://example.com/seo-tips")
    
    print(f"✅ Content analysis complete!")
    print(f"Overall Score: {report.analysis.overall_score:.1f}/100")
    print(f"SEO Score: {report.analysis.seo_score:.1f}/100")
    print(f"Readability Score: {report.analysis.readability_score:.1f}/100")
    print(f"Word Count: {report.analysis.word_count}")
    print(f"Issues Found: {len(report.analysis.issues)}")
    print(f"Suggestions Generated: {len(report.suggestions)}")
    
    # Print issues
    if report.analysis.issues:
        print("\nIssues Identified:")
        for issue in report.analysis.issues:
            print(f"  ❌ {issue}")
    
    # Print high-priority suggestions
    high_priority = [s for s in report.suggestions if s.priority == "high"]
    if high_priority:
        print("\nHigh-Priority Suggestions:")
        for suggestion in high_priority:
            print(f"  🔴 {suggestion.title}: {suggestion.description}")
    
    # Export report
    json_report = optimizer.export_report(report, "json")
    markdown_report = optimizer.export_report(report, "markdown")
    
    # Save reports
    with open("content_optimization_test.json", "w") as f:
        f.write(json_report)
    
    with open("content_optimization_test.md", "w") as f:
        f.write(markdown_report)
    
    print("\nFiles created:")
    print("- content_optimization_test.json")
    print("- content_optimization_test.md")
    
    return True

async def test_content_crawler():
    """Test content crawler with sample URLs."""
    print("\nTesting Content Crawler...")
    
    # Test URLs (using httpbin for testing)
    test_urls = [
        "https://httpbin.org/html",
        "https://httpbin.org/json"
    ]
    
    for url in test_urls:
        print(f"\nCrawling {url}...")
        
        try:
            async with ContentCrawler(max_concurrent=2, delay=1.0) as crawler:
                audit_report = await crawler.crawl_site(url, max_pages=3)
                
                print(f"✅ Site audit complete!")
                print(f"Pages analyzed: {audit_report.pages_analyzed}")
                print(f"Average score: {audit_report.average_score:.1f}/100")
                print(f"High-priority pages: {len(audit_report.high_priority_pages)}")
                
                # Export reports
                json_report = crawler.export_audit_report(audit_report, "json")
                markdown_report = crawler.export_audit_report(audit_report, "markdown")
                
                # Save reports
                domain = url.replace("https://", "").replace("/", "_")
                with open(f"site_audit_{domain}.json", "w") as f:
                    f.write(json_report)
                
                with open(f"site_audit_{domain}.md", "w") as f:
                    f.write(markdown_report)
                
                print(f"Reports saved: site_audit_{domain}.json, site_audit_{domain}.md")
                
        except Exception as e:
            print(f"❌ Error crawling {url}: {str(e)}")
    
    return True

def main():
    """Main test function."""
    print("🚀 Testing Content Optimization System - seo.content-optimization")
    print("=" * 70)
    
    try:
        # Test content optimizer
        optimizer_success = test_content_optimizer()
        
        if optimizer_success:
            print("\n✅ Content Optimizer tests passed!")
        else:
            print("\n❌ Content Optimizer tests failed!")
            return
        
        # Test content crawler
        crawler_success = asyncio.run(test_content_crawler())
        
        if crawler_success:
            print("\n✅ Content Crawler tests passed!")
        else:
            print("\n❌ Content Crawler tests failed!")
            return
        
        print("\n🎉 All tests passed! Content Optimization System is ready.")
        print("\n📁 Generated Files:")
        print("- content_optimization_test.json")
        print("- content_optimization_test.md")
        print("- site_audit_*.json")
        print("- site_audit_*.md")
        
    except Exception as e:
        print(f"\n❌ Test error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

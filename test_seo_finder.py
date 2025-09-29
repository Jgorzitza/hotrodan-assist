#!/usr/bin/env python3
"""
Test script for SEO Opportunities Finder
"""

import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from seo_opportunities_finder import SEOOpportunityFinder, MCPConnector

async def test_mcp_connection():
    """Test MCP connector connection."""
    print("Testing MCP connector connection...")
    
    try:
        async with MCPConnector() as mcp:
            # Test health endpoint
            async with mcp.session.get(f"{mcp.base_url}/health") as response:
                if response.status == 200:
                    health_data = await response.json()
                    print(f"✅ MCP Connectors Health: {health_data.get('status', 'unknown')}")
                    return True
                else:
                    print(f"❌ MCP Connectors Health Check Failed: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ MCP Connection Error: {str(e)}")
        return False

async def test_seo_finder():
    """Test SEO opportunity finder with mock data."""
    print("\nTesting SEO Opportunity Finder...")
    
    try:
        finder = SEOOpportunityFinder()
        
        # Test with mock data (MCP connectors should return mock data)
        opportunities = await finder.find_opportunities(
            site_url="https://example.com",
            start_date="2024-08-01",
            end_date="2024-08-31",
            competitor_domains=["competitor1.com", "competitor2.com"],
            min_search_volume=50,
            max_difficulty=0.9
        )
        
        print(f"✅ Found {len(opportunities)} SEO opportunities")
        
        if opportunities:
            print("\nTop 3 Opportunities:")
            for i, opp in enumerate(opportunities[:3], 1):
                print(f"{i}. {opp.keyword}")
                print(f"   Score: {opp.opportunity_score:.2f}")
                print(f"   Difficulty: {opp.difficulty:.2f}")
                print(f"   Priority: {opp.priority}")
                print()
        
        return True
        
    except Exception as e:
        print(f"❌ SEO Finder Error: {str(e)}")
        return False

async def main():
    """Main test function."""
    print("🚀 Testing SEO Opportunities Finder - seo.opportunities-v1")
    print("=" * 60)
    
    # Test MCP connection
    mcp_ok = await test_mcp_connection()
    
    if mcp_ok:
        # Test SEO finder
        seo_ok = await test_seo_finder()
        
        if seo_ok:
            print("\n✅ All tests passed! SEO Opportunities Finder is ready.")
        else:
            print("\n❌ SEO Finder tests failed.")
    else:
        print("\n❌ MCP connection failed. Please ensure MCP connectors are running.")
        print("   Run: docker-compose up mcp-connectors")

if __name__ == "__main__":
    asyncio.run(main())

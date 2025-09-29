#!/usr/bin/env python3
"""
SEO Opportunities Finder - seo.opportunities-v1

Integrates with MCP connectors (GSC, Bing, GA4) to find SEO opportunities:
- Query clustering and gap detection
- Content brief generation
- Competitor analysis
- Opportunity scoring and ranking
"""

import os
import json
import requests
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
import logging
import re
from urllib.parse import urljoin, urlparse
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SEOOpportunity:
    """Represents an SEO opportunity."""
    keyword: str
    search_volume: int
    difficulty: float
    opportunity_score: float
    current_ranking: Optional[int]
    competitor_rankings: Dict[str, int]
    content_gaps: List[str]
    suggested_title: str
    suggested_h2s: List[str]
    suggested_outline: List[str]
    internal_links: List[str]
    priority: str  # high, medium, low
    category: str
    created_at: str

@dataclass
class ContentBrief:
    """Content brief for an SEO opportunity."""
    title: str
    meta_description: str
    h1: str
    h2s: List[str]
    outline: List[str]
    target_keywords: List[str]
    internal_links: List[str]
    word_count_target: int
    competitor_analysis: Dict[str, Any]
    content_gaps: List[str]

class MCPConnector:
    """Client for MCP connectors API."""
    
    def __init__(self, base_url: str = "http://localhost:8003"):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get_gsc_queries(self, site_url: str, start_date: str, end_date: str, limit: int = 1000) -> Dict[str, Any]:
        """Get GSC search queries."""
        url = f"{self.base_url}/connectors/gsc/queries"
        params = {
            "site_url": site_url,
            "start_date": start_date,
            "end_date": end_date,
            "limit": limit
        }
        
        async with self.session.get(url, params=params) as response:
            if response.status == 200:
                return await response.json()
            else:
                logger.error(f"GSC queries failed: {response.status}")
                return {"rows": []}
    
    async def get_gsc_pages(self, site_url: str, start_date: str, end_date: str, limit: int = 1000) -> Dict[str, Any]:
        """Get GSC top pages."""
        url = f"{self.base_url}/connectors/gsc/pages"
        params = {
            "site_url": site_url,
            "start_date": start_date,
            "end_date": end_date,
            "limit": limit
        }
        
        async with self.session.get(url, params=params) as response:
            if response.status == 200:
                return await response.json()
            else:
                logger.error(f"GSC pages failed: {response.status}")
                return {"rows": []}
    
    async def get_bing_keywords(self, site_url: str, start_date: str, end_date: str, limit: int = 1000) -> Dict[str, Any]:
        """Get Bing keywords."""
        url = f"{self.base_url}/connectors/bing/keywords"
        params = {
            "site_url": site_url,
            "start_date": start_date,
            "end_date": end_date,
            "limit": limit
        }
        
        async with self.session.get(url, params=params) as response:
            if response.status == 200:
                return await response.json()
            else:
                logger.error(f"Bing keywords failed: {response.status}")
                return {"value": []}
    
    async def get_ga4_traffic(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Get GA4 traffic data."""
        url = f"{self.base_url}/connectors/ga4/traffic"
        params = {
            "start_date": start_date,
            "end_date": end_date
        }
        
        async with self.session.get(url, params=params) as response:
            if response.status == 200:
                return await response.json()
            else:
                logger.error(f"GA4 traffic failed: {response.status}")
                return {}

class QueryClusterer:
    """Clusters search queries to identify content opportunities."""
    
    def __init__(self):
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
        }
    
    def extract_keywords(self, query: str) -> List[str]:
        """Extract meaningful keywords from a search query."""
        # Remove special characters and split
        words = re.findall(r'\b\w+\b', query.lower())
        # Filter out stop words and short words
        keywords = [word for word in words if len(word) > 2 and word not in self.stop_words]
        return keywords
    
    def calculate_similarity(self, query1: str, query2: str) -> float:
        """Calculate similarity between two queries."""
        keywords1 = set(self.extract_keywords(query1))
        keywords2 = set(self.extract_keywords(query2))
        
        if not keywords1 or not keywords2:
            return 0.0
        
        intersection = keywords1.intersection(keywords2)
        union = keywords1.union(keywords2)
        
        return len(intersection) / len(union) if union else 0.0
    
    def cluster_queries(self, queries: List[Dict[str, Any]], similarity_threshold: float = 0.3) -> List[List[Dict[str, Any]]]:
        """Cluster similar queries together."""
        clusters = []
        used_queries = set()
        
        for i, query1 in enumerate(queries):
            if i in used_queries:
                continue
            
            cluster = [query1]
            used_queries.add(i)
            
            for j, query2 in enumerate(queries[i+1:], i+1):
                if j in used_queries:
                    continue
                
                similarity = self.calculate_similarity(
                    query1.get('keys', [''])[0] if query1.get('keys') else '',
                    query2.get('keys', [''])[0] if query2.get('keys') else ''
                )
                
                if similarity >= similarity_threshold:
                    cluster.append(query2)
                    used_queries.add(j)
            
            clusters.append(cluster)
        
        return clusters

class CompetitorAnalyzer:
    """Analyzes competitor content to identify gaps."""
    
    def __init__(self):
        self.user_agent = "Mozilla/5.0 (compatible; SEO-Opportunity-Finder/1.0)"
        self.request_delay = 1.0  # Be respectful
    
    async def crawl_competitor_page(self, url: str) -> Dict[str, Any]:
        """Crawl a competitor page and extract SEO data."""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {'User-Agent': self.user_agent}
                async with session.get(url, headers=headers, timeout=10) as response:
                    if response.status == 200:
                        content = await response.text()
                        return self._extract_seo_data(content, url)
                    else:
                        logger.warning(f"Failed to crawl {url}: {response.status}")
                        return {}
        except Exception as e:
            logger.error(f"Error crawling {url}: {str(e)}")
            return {}
    
    def _extract_seo_data(self, html: str, url: str) -> Dict[str, Any]:
        """Extract SEO data from HTML content."""
        import re
        
        # Extract title
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else ""
        
        # Extract meta description
        desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']', html, re.IGNORECASE)
        meta_description = desc_match.group(1).strip() if desc_match else ""
        
        # Extract H1 tags
        h1_matches = re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.IGNORECASE | re.DOTALL)
        h1s = [re.sub(r'<[^>]+>', '', h1).strip() for h1 in h1_matches]
        
        # Extract H2 tags
        h2_matches = re.findall(r'<h2[^>]*>(.*?)</h2>', html, re.IGNORECASE | re.DOTALL)
        h2s = [re.sub(r'<[^>]+>', '', h2).strip() for h2 in h2_matches]
        
        # Extract internal links
        link_matches = re.findall(r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>', html, re.IGNORECASE)
        internal_links = []
        for link in link_matches:
            if link.startswith('/') or urlparse(link).netloc == urlparse(url).netloc:
                internal_links.append(urljoin(url, link))
        
        return {
            'url': url,
            'title': title,
            'meta_description': meta_description,
            'h1s': h1s,
            'h2s': h2s,
            'internal_links': internal_links[:10],  # Limit to first 10
            'word_count': len(html.split())
        }
    
    async def analyze_competitors(self, keywords: List[str], competitor_domains: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """Analyze competitor content for given keywords."""
        competitor_data = defaultdict(list)
        
        for keyword in keywords[:5]:  # Limit to top 5 keywords
            for domain in competitor_domains[:3]:  # Limit to top 3 competitors
                # Simulate search result URL (in real implementation, use search API)
                search_url = f"https://{domain}/search?q={keyword.replace(' ', '+')}"
                
                page_data = await self.crawl_competitor_page(search_url)
                if page_data:
                    page_data['keyword'] = keyword
                    competitor_data[keyword].append(page_data)
                
                # Be respectful - delay between requests
                await asyncio.sleep(self.request_delay)
        
        return dict(competitor_data)

class ContentBriefGenerator:
    """Generates content briefs for SEO opportunities."""
    
    def generate_brief(self, opportunity: SEOOpportunity, competitor_analysis: Dict[str, Any]) -> ContentBrief:
        """Generate a content brief for an SEO opportunity."""
        
        # Generate title
        title = self._generate_title(opportunity.keyword, competitor_analysis)
        
        # Generate meta description
        meta_description = self._generate_meta_description(opportunity.keyword, opportunity.search_volume)
        
        # Generate H1
        h1 = self._generate_h1(opportunity.keyword)
        
        # Generate H2s
        h2s = self._generate_h2s(opportunity.keyword, competitor_analysis)
        
        # Generate outline
        outline = self._generate_outline(opportunity.keyword, h2s)
        
        # Generate internal links
        internal_links = self._generate_internal_links(opportunity.keyword, opportunity.category)
        
        return ContentBrief(
            title=title,
            meta_description=meta_description,
            h1=h1,
            h2s=h2s,
            outline=outline,
            target_keywords=[opportunity.keyword],
            internal_links=internal_links,
            word_count_target=self._calculate_word_count_target(opportunity.difficulty),
            competitor_analysis=competitor_analysis,
            content_gaps=opportunity.content_gaps
        )
    
    def _generate_title(self, keyword: str, competitor_analysis: Dict[str, Any]) -> str:
        """Generate an SEO-optimized title."""
        # Simple title generation - in production, use AI/ML
        title_templates = [
            f"Complete Guide to {keyword.title()}",
            f"{keyword.title()}: Everything You Need to Know",
            f"Best {keyword.title()} Tips and Strategies",
            f"How to {keyword.title()}: Expert Guide"
        ]
        return title_templates[0]  # Use first template for now
    
    def _generate_meta_description(self, keyword: str, search_volume: int) -> str:
        """Generate meta description."""
        return f"Learn everything about {keyword} with our comprehensive guide. Expert tips, strategies, and insights to help you succeed. {search_volume}+ monthly searches."
    
    def _generate_h1(self, keyword: str) -> str:
        """Generate H1 tag."""
        return f"Complete Guide to {keyword.title()}"
    
    def _generate_h2s(self, keyword: str, competitor_analysis: Dict[str, Any]) -> List[str]:
        """Generate H2 headings."""
        base_h2s = [
            f"What is {keyword.title()}?",
            f"Benefits of {keyword.title()}",
            f"How to {keyword.title()}",
            f"Best Practices for {keyword.title()}",
            f"Common {keyword.title()} Mistakes to Avoid"
        ]
        
        # Add competitor-inspired H2s if available
        if competitor_analysis:
            competitor_h2s = []
            for analysis in competitor_analysis.values():
                for data in analysis:
                    competitor_h2s.extend(data.get('h2s', [])[:2])  # Take top 2 H2s
            
            # Add unique competitor H2s
            for h2 in competitor_h2s[:3]:
                if h2 not in base_h2s:
                    base_h2s.append(h2)
        
        return base_h2s[:6]  # Limit to 6 H2s
    
    def _generate_outline(self, keyword: str, h2s: List[str]) -> List[str]:
        """Generate content outline."""
        outline = []
        for h2 in h2s:
            outline.append(f"## {h2}")
            outline.append(f"- Introduction to {h2.lower()}")
            outline.append(f"- Key points and examples")
            outline.append(f"- Practical applications")
            outline.append("")
        return outline
    
    def _generate_internal_links(self, keyword: str, category: str) -> List[str]:
        """Generate suggested internal links."""
        # Simple internal link suggestions - in production, use site structure analysis
        return [
            f"/{category}",
            f"/{category}/guide",
            f"/{category}/tips",
            f"/blog/{keyword.replace(' ', '-')}"
        ]
    
    def _calculate_word_count_target(self, difficulty: float) -> int:
        """Calculate target word count based on difficulty."""
        # Higher difficulty = longer content needed
        base_count = 1500
        difficulty_multiplier = 1 + (difficulty * 0.5)
        return int(base_count * difficulty_multiplier)

class SEOOpportunityFinder:
    """Main class for finding SEO opportunities."""
    
    def __init__(self, mcp_base_url: str = "http://localhost:8003"):
        self.mcp_base_url = mcp_base_url
        self.query_clusterer = QueryClusterer()
        self.competitor_analyzer = CompetitorAnalyzer()
        self.content_brief_generator = ContentBriefGenerator()
    
    async def find_opportunities(
        self,
        site_url: str,
        start_date: str,
        end_date: str,
        competitor_domains: List[str] = None,
        min_search_volume: int = 100,
        max_difficulty: float = 0.8
    ) -> List[SEOOpportunity]:
        """Find SEO opportunities for a site."""
        
        if competitor_domains is None:
            competitor_domains = []
        
        logger.info(f"Finding SEO opportunities for {site_url}")
        
        async with MCPConnector(self.mcp_base_url) as mcp:
            # Get data from all sources
            gsc_queries_task = mcp.get_gsc_queries(site_url, start_date, end_date)
            gsc_pages_task = mcp.get_gsc_pages(site_url, start_date, end_date)
            bing_keywords_task = mcp.get_bing_keywords(site_url, start_date, end_date)
            ga4_traffic_task = mcp.get_ga4_traffic(start_date, end_date)
            
            # Wait for all data
            gsc_queries, gsc_pages, bing_keywords, ga4_traffic = await asyncio.gather(
                gsc_queries_task,
                gsc_pages_task,
                bing_keywords_task,
                ga4_traffic_task
            )
        
        # Process and combine data
        opportunities = await self._process_data(
            gsc_queries, gsc_pages, bing_keywords, ga4_traffic,
            site_url, competitor_domains, min_search_volume, max_difficulty
        )
        
        # Sort by opportunity score
        opportunities.sort(key=lambda x: x.opportunity_score, reverse=True)
        
        logger.info(f"Found {len(opportunities)} SEO opportunities")
        return opportunities
    
    async def _process_data(
        self,
        gsc_queries: Dict[str, Any],
        gsc_pages: Dict[str, Any],
        bing_keywords: Dict[str, Any],
        ga4_traffic: Dict[str, Any],
        site_url: str,
        competitor_domains: List[str],
        min_search_volume: int,
        max_difficulty: float
    ) -> List[SEOOpportunity]:
        """Process data from all sources to find opportunities."""
        
        opportunities = []
        
        # Process GSC queries
        gsc_rows = gsc_queries.get('rows', [])
        for row in gsc_rows:
            if len(row) >= 4:  # Ensure we have all expected columns
                query = row[0]
                clicks = row[1]
                impressions = row[2]
                ctr = row[3]
                position = row[4] if len(row) > 4 else None
                
                # Calculate opportunity score
                opportunity_score = self._calculate_opportunity_score(
                    clicks, impressions, ctr, position, min_search_volume
                )
                
                if opportunity_score > 0.3:  # Only include promising opportunities
                    # Determine difficulty based on current position
                    difficulty = self._calculate_difficulty(position, ctr)
                    
                    if difficulty <= max_difficulty:
                        # Analyze competitors if domains provided
                        competitor_rankings = {}
                        content_gaps = []
                        
                        if competitor_domains:
                            competitor_analysis = await self.competitor_analyzer.analyze_competitors(
                                [query], competitor_domains
                            )
                            content_gaps = self._identify_content_gaps(competitor_analysis, query)
                        
                        opportunity = SEOOpportunity(
                            keyword=query,
                            search_volume=int(impressions * 0.1),  # Rough estimate
                            difficulty=difficulty,
                            opportunity_score=opportunity_score,
                            current_ranking=int(position) if position else None,
                            competitor_rankings=competitor_rankings,
                            content_gaps=content_gaps,
                            suggested_title=self.content_brief_generator._generate_title(query, {}),
                            suggested_h2s=self.content_brief_generator._generate_h2s(query, {}),
                            suggested_outline=self.content_brief_generator._generate_outline(query, []),
                            internal_links=self.content_brief_generator._generate_internal_links(query, "general"),
                            priority=self._determine_priority(opportunity_score, difficulty),
                            category=self._categorize_keyword(query),
                            created_at=datetime.now().isoformat()
                        )
                        
                        opportunities.append(opportunity)
        
        return opportunities
    
    def _calculate_opportunity_score(self, clicks: int, impressions: int, ctr: float, position: float, min_volume: int) -> float:
        """Calculate opportunity score for a keyword."""
        if impressions < min_volume:
            return 0.0
        
        # Base score from impressions (search volume)
        volume_score = min(impressions / 10000, 1.0)  # Normalize to 0-1
        
        # CTR score (higher CTR = better opportunity)
        ctr_score = min(ctr * 10, 1.0)  # Normalize CTR to 0-1
        
        # Position score (lower position = better opportunity)
        position_score = 1.0 - (position / 100) if position else 0.5
        position_score = max(0, min(position_score, 1.0))
        
        # Weighted combination
        opportunity_score = (volume_score * 0.4) + (ctr_score * 0.3) + (position_score * 0.3)
        
        return opportunity_score
    
    def _calculate_difficulty(self, position: float, ctr: float) -> float:
        """Calculate keyword difficulty (0 = easy, 1 = hard)."""
        if not position:
            return 0.5  # Unknown difficulty
        
        # Position-based difficulty
        position_difficulty = min(position / 50, 1.0)  # Positions 1-50
        
        # CTR-based difficulty (low CTR = high difficulty)
        ctr_difficulty = 1.0 - min(ctr * 10, 1.0)
        
        # Combine factors
        difficulty = (position_difficulty * 0.7) + (ctr_difficulty * 0.3)
        
        return min(difficulty, 1.0)
    
    def _identify_content_gaps(self, competitor_analysis: Dict[str, Any], keyword: str) -> List[str]:
        """Identify content gaps from competitor analysis."""
        gaps = []
        
        if keyword in competitor_analysis:
            competitor_data = competitor_analysis[keyword]
            
            # Analyze competitor titles, H2s, etc.
            all_titles = [data.get('title', '') for data in competitor_data]
            all_h2s = []
            for data in competitor_data:
                all_h2s.extend(data.get('h2s', []))
            
            # Simple gap identification (in production, use more sophisticated analysis)
            if not any('guide' in title.lower() for title in all_titles):
                gaps.append("Missing comprehensive guide content")
            
            if not any('tips' in h2.lower() for h2 in all_h2s):
                gaps.append("Missing tips and best practices section")
        
        return gaps
    
    def _determine_priority(self, opportunity_score: float, difficulty: float) -> str:
        """Determine priority level for an opportunity."""
        if opportunity_score > 0.7 and difficulty < 0.5:
            return "high"
        elif opportunity_score > 0.5 and difficulty < 0.7:
            return "medium"
        else:
            return "low"
    
    def _categorize_keyword(self, keyword: str) -> str:
        """Categorize keyword for organization."""
        keyword_lower = keyword.lower()
        
        if any(word in keyword_lower for word in ['how', 'what', 'why', 'when', 'where']):
            return "informational"
        elif any(word in keyword_lower for word in ['buy', 'purchase', 'price', 'cost']):
            return "commercial"
        elif any(word in keyword_lower for word in ['best', 'top', 'review', 'compare']):
            return "comparison"
        else:
            return "general"
    
    async def generate_content_briefs(self, opportunities: List[SEOOpportunity]) -> List[ContentBrief]:
        """Generate content briefs for opportunities."""
        briefs = []
        
        for opportunity in opportunities:
            # Get competitor analysis for this keyword
            competitor_analysis = await self.competitor_analyzer.analyze_competitors(
                [opportunity.keyword], 
                ["competitor1.com", "competitor2.com"]  # Default competitors
            )
            
            brief = self.content_brief_generator.generate_brief(opportunity, competitor_analysis)
            briefs.append(brief)
        
        return briefs
    
    def export_opportunities(self, opportunities: List[SEOOpportunity], format: str = "json") -> str:
        """Export opportunities in specified format."""
        if format == "json":
            return json.dumps([asdict(opp) for opp in opportunities], indent=2)
        elif format == "csv":
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow([
                'keyword', 'search_volume', 'difficulty', 'opportunity_score',
                'current_ranking', 'priority', 'category', 'suggested_title'
            ])
            
            # Write data
            for opp in opportunities:
                writer.writerow([
                    opp.keyword, opp.search_volume, opp.difficulty, opp.opportunity_score,
                    opp.current_ranking, opp.priority, opp.category, opp.suggested_title
                ])
            
            return output.getvalue()
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def export_content_briefs(self, briefs: List[ContentBrief], format: str = "markdown") -> List[str]:
        """Export content briefs in specified format."""
        if format == "markdown":
            markdown_briefs = []
            
            for brief in briefs:
                md_content = f"""# Content Brief: {brief.title}

## Meta Information
- **Title**: {brief.title}
- **Meta Description**: {brief.meta_description}
- **Target Keywords**: {', '.join(brief.target_keywords)}
- **Word Count Target**: {brief.word_count_target}

## Content Structure

### H1
{brief.h1}

### H2 Headings
"""
                for h2 in brief.h2s:
                    md_content += f"- {h2}\n"
                
                md_content += f"""
## Outline
"""
                for item in brief.outline:
                    md_content += f"{item}\n"
                
                md_content += f"""
## Internal Links
"""
                for link in brief.internal_links:
                    md_content += f"- {link}\n"
                
                md_content += f"""
## Content Gaps
"""
                for gap in brief.content_gaps:
                    md_content += f"- {gap}\n"
                
                markdown_briefs.append(md_content)
            
            return markdown_briefs
        else:
            raise ValueError(f"Unsupported format: {format}")

async def main():
    """Main function to demonstrate SEO opportunity finding."""
    
    # Initialize finder
    finder = SEOOpportunityFinder()
    
    # Configuration
    site_url = "https://example.com"
    start_date = "2024-08-01"
    end_date = "2024-08-31"
    competitor_domains = ["competitor1.com", "competitor2.com"]
    
    try:
        # Find opportunities
        logger.info("Starting SEO opportunity analysis...")
        opportunities = await finder.find_opportunities(
            site_url=site_url,
            start_date=start_date,
            end_date=end_date,
            competitor_domains=competitor_domains,
            min_search_volume=100,
            max_difficulty=0.8
        )
        
        # Generate content briefs
        logger.info("Generating content briefs...")
        briefs = await finder.generate_content_briefs(opportunities[:5])  # Top 5 opportunities
        
        # Export results
        logger.info("Exporting results...")
        
        # Export opportunities as JSON
        opportunities_json = finder.export_opportunities(opportunities, "json")
        with open("seo_opportunities.json", "w") as f:
            f.write(opportunities_json)
        
        # Export opportunities as CSV
        opportunities_csv = finder.export_opportunities(opportunities, "csv")
        with open("seo_opportunities.csv", "w") as f:
            f.write(opportunities_csv)
        
        # Export content briefs as Markdown
        briefs_md = finder.export_content_briefs(briefs, "markdown")
        for i, brief_md in enumerate(briefs_md):
            with open(f"content_brief_{i+1}.md", "w") as f:
                f.write(brief_md)
        
        logger.info(f"Analysis complete! Found {len(opportunities)} opportunities.")
        logger.info("Files exported:")
        logger.info("- seo_opportunities.json")
        logger.info("- seo_opportunities.csv")
        logger.info("- content_brief_*.md")
        
        # Print top 5 opportunities
        print("\n=== TOP 5 SEO OPPORTUNITIES ===")
        for i, opp in enumerate(opportunities[:5], 1):
            print(f"{i}. {opp.keyword}")
            print(f"   Score: {opp.opportunity_score:.2f}")
            print(f"   Difficulty: {opp.difficulty:.2f}")
            print(f"   Priority: {opp.priority}")
            print(f"   Title: {opp.suggested_title}")
            print()
    
    except Exception as e:
        logger.error(f"Error in SEO opportunity analysis: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())

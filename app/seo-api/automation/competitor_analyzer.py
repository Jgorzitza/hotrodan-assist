#!/usr/bin/env python3
"""
Automated Competitor Content Analysis - seo.content-automation

Analyzes competitor content to identify opportunities:
- Automated competitor content analysis
- Content gap identification
- Keyword opportunity detection
- Content performance tracking
- Automated content recommendations
"""

import asyncio
import aiohttp
import json
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
import logging
from urllib.parse import urljoin, urlparse
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class CompetitorContent:
    """Represents competitor content analysis."""
    url: str
    title: str
    meta_description: str
    h1: str
    h2s: List[str]
    content: str
    word_count: int
    publish_date: Optional[str]
    content_type: str
    target_keywords: List[str]
    internal_links: List[str]
    external_links: List[str]
    images: List[str]
    social_shares: int
    estimated_traffic: int
    domain_authority: int
    created_at: str

@dataclass
class ContentGap:
    """Represents a content gap opportunity."""
    keyword: str
    search_volume: int
    competition: str
    competitor_urls: List[str]
    content_type: str
    opportunity_score: float
    suggested_title: str
    suggested_outline: List[str]
    estimated_difficulty: str
    priority: str
    created_at: str

@dataclass
class CompetitorAnalysis:
    """Complete competitor analysis report."""
    competitor_domain: str
    total_pages_analyzed: int
    content_gaps: List[ContentGap]
    top_performing_content: List[CompetitorContent]
    keyword_opportunities: List[Dict[str, Any]]
    content_recommendations: List[Dict[str, Any]]
    analysis_date: str

class CompetitorContentAnalyzer:
    """Analyzes competitor content for opportunities."""
    
    def __init__(self, max_concurrent: int = 5, delay: float = 1.0):
        self.max_concurrent = max_concurrent
        self.delay = delay
        self.session: Optional[aiohttp.ClientSession] = None
        self.analyzed_urls: set = set()
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={'User-Agent': 'SEO-Competitor-Analyzer/1.0 (Content Analysis Bot)'}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def analyze_competitor(self, competitor_domain: str, max_pages: int = 20) -> CompetitorAnalysis:
        """Analyze competitor content comprehensively."""
        
        logger.info(f"Starting competitor analysis for {competitor_domain}")
        
        # Discover competitor pages
        pages_to_analyze = await self._discover_competitor_pages(competitor_domain, max_pages)
        
        # Analyze each page
        competitor_content = []
        for page_url in pages_to_analyze:
            try:
                content = await self._analyze_competitor_page(page_url)
                if content:
                    competitor_content.append(content)
                    await asyncio.sleep(self.delay)  # Rate limiting
            except Exception as e:
                logger.error(f"Error analyzing {page_url}: {str(e)}")
        
        # Identify content gaps
        content_gaps = self._identify_content_gaps(competitor_content)
        
        # Find top performing content
        top_content = self._find_top_performing_content(competitor_content)
        
        # Identify keyword opportunities
        keyword_opportunities = self._identify_keyword_opportunities(competitor_content)
        
        # Generate content recommendations
        content_recommendations = self._generate_content_recommendations(competitor_content, content_gaps)
        
        return CompetitorAnalysis(
            competitor_domain=competitor_domain,
            total_pages_analyzed=len(competitor_content),
            content_gaps=content_gaps,
            top_performing_content=top_content,
            keyword_opportunities=keyword_opportunities,
            content_recommendations=content_recommendations,
            analysis_date=datetime.now().isoformat()
        )
    
    async def _discover_competitor_pages(self, domain: str, max_pages: int) -> List[str]:
        """Discover pages to analyze on competitor site."""
        
        pages = []
        base_url = f"https://{domain}"
        
        # Common page patterns to check
        common_paths = [
            "/",
            "/about",
            "/blog",
            "/products",
            "/services",
            "/contact",
            "/privacy",
            "/terms",
            "/faq",
            "/help",
            "/support"
        ]
        
        # Add common paths
        for path in common_paths:
            if len(pages) >= max_pages:
                break
            pages.append(urljoin(base_url, path))
        
        # Try to discover blog posts
        blog_pages = await self._discover_blog_pages(base_url, max_pages - len(pages))
        pages.extend(blog_pages)
        
        return pages[:max_pages]
    
    async def _discover_blog_pages(self, base_url: str, max_pages: int) -> List[str]:
        """Discover blog posts and articles."""
        
        blog_urls = []
        
        # Common blog patterns
        blog_patterns = [
            "/blog/",
            "/articles/",
            "/news/",
            "/insights/",
            "/resources/"
        ]
        
        for pattern in blog_patterns:
            if len(blog_urls) >= max_pages:
                break
            
            try:
                blog_url = urljoin(base_url, pattern)
                async with self.session.get(blog_url) as response:
                    if response.status == 200:
                        content = await response.text()
                        # Extract article links
                        article_links = self._extract_article_links(content, base_url)
                        blog_urls.extend(article_links[:max_pages - len(blog_urls)])
            except Exception as e:
                logger.error(f"Error discovering blog pages for {pattern}: {str(e)}")
        
        return blog_urls[:max_pages]
    
    def _extract_article_links(self, html_content: str, base_url: str) -> List[str]:
        """Extract article links from HTML content."""
        
        # Simple regex to find article links
        link_pattern = r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>'
        links = re.findall(link_pattern, html_content)
        
        article_links = []
        for link in links:
            full_url = urljoin(base_url, link)
            if self._is_article_url(full_url):
                article_links.append(full_url)
        
        return article_links[:10]  # Limit to first 10
    
    def _is_article_url(self, url: str) -> bool:
        """Check if URL is likely an article."""
        
        article_indicators = [
            '/blog/', '/article/', '/post/', '/news/',
            '/insights/', '/resources/', '/guide/',
            '/tutorial/', '/how-to/', '/tips/'
        ]
        
        return any(indicator in url.lower() for indicator in article_indicators)
    
    async def _analyze_competitor_page(self, url: str) -> Optional[CompetitorContent]:
        """Analyze a single competitor page."""
        
        if url in self.analyzed_urls:
            return None
        
        try:
            async with self.session.get(url) as response:
                if response.status != 200:
                    return None
                
                html_content = await response.text()
                self.analyzed_urls.add(url)
                
                # Extract content elements
                title = self._extract_title(html_content)
                meta_description = self._extract_meta_description(html_content)
                h1 = self._extract_h1(html_content)
                h2s = self._extract_h2s(html_content)
                content = self._extract_text_content(html_content)
                
                # Calculate metrics
                word_count = len(content.split())
                content_type = self._determine_content_type(url, title, content)
                target_keywords = self._extract_keywords(content, title)
                
                # Extract links
                internal_links = self._extract_internal_links(html_content, url)
                external_links = self._extract_external_links(html_content, url)
                images = self._extract_images(html_content)
                
                # Estimate performance metrics
                social_shares = self._estimate_social_shares(url)
                estimated_traffic = self._estimate_traffic(word_count, content_type)
                domain_authority = self._estimate_domain_authority(url)
                
                return CompetitorContent(
                    url=url,
                    title=title,
                    meta_description=meta_description,
                    h1=h1,
                    h2s=h2s,
                    content=content,
                    word_count=word_count,
                    publish_date=self._extract_publish_date(html_content),
                    content_type=content_type,
                    target_keywords=target_keywords,
                    internal_links=internal_links,
                    external_links=external_links,
                    images=images,
                    social_shares=social_shares,
                    estimated_traffic=estimated_traffic,
                    domain_authority=domain_authority,
                    created_at=datetime.now().isoformat()
                )
        
        except Exception as e:
            logger.error(f"Error analyzing page {url}: {str(e)}")
            return None
    
    def _extract_title(self, html: str) -> str:
        """Extract page title."""
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        return re.sub(r'<[^>]+>', '', title_match.group(1)).strip() if title_match else ""
    
    def _extract_meta_description(self, html: str) -> str:
        """Extract meta description."""
        desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']', html, re.IGNORECASE)
        return desc_match.group(1).strip() if desc_match else ""
    
    def _extract_h1(self, html: str) -> str:
        """Extract H1 tag."""
        h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.IGNORECASE | re.DOTALL)
        return re.sub(r'<[^>]+>', '', h1_match.group(1)).strip() if h1_match else ""
    
    def _extract_h2s(self, html: str) -> List[str]:
        """Extract H2 tags."""
        h2_matches = re.findall(r'<h2[^>]*>(.*?)</h2>', html, re.IGNORECASE | re.DOTALL)
        return [re.sub(r'<[^>]+>', '', h2).strip() for h2 in h2_matches]
    
    def _extract_text_content(self, html: str) -> str:
        """Extract main text content from HTML."""
        # Remove script and style tags
        content = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.IGNORECASE | re.DOTALL)
        content = re.sub(r'<style[^>]*>.*?</style>', '', content, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove HTML tags
        content = re.sub(r'<[^>]+>', ' ', content)
        
        # Clean up whitespace
        content = re.sub(r'\s+', ' ', content).strip()
        
        return content
    
    def _determine_content_type(self, url: str, title: str, content: str) -> str:
        """Determine content type based on URL and content."""
        
        url_lower = url.lower()
        title_lower = title.lower()
        
        if any(word in url_lower for word in ['blog', 'article', 'post']):
            return 'blog_post'
        elif any(word in url_lower for word in ['product', 'item']):
            return 'product_page'
        elif any(word in url_lower for word in ['about', 'company']):
            return 'about_page'
        elif any(word in url_lower for word in ['contact', 'support']):
            return 'contact_page'
        elif any(word in title_lower for word in ['guide', 'tutorial', 'how-to']):
            return 'guide'
        elif any(word in title_lower for word in ['faq', 'questions']):
            return 'faq'
        else:
            return 'general_page'
    
    def _extract_keywords(self, content: str, title: str) -> List[str]:
        """Extract potential target keywords from content."""
        
        # Simple keyword extraction
        words = re.findall(r'\b\w+\b', content.lower())
        word_freq = Counter(words)
        
        # Filter out common words and short words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'}
        
        keywords = []
        for word, count in word_freq.most_common(20):
            if len(word) > 3 and word not in stop_words and count > 2:
                keywords.append(word)
        
        return keywords[:10]
    
    def _extract_internal_links(self, html: str, base_url: str) -> List[str]:
        """Extract internal links from HTML."""
        link_matches = re.findall(r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>', html, re.IGNORECASE)
        internal_links = []
        base_domain = urlparse(base_url).netloc
        
        for link in link_matches:
            if link.startswith('/') or urlparse(link).netloc == base_domain:
                internal_links.append(urljoin(base_url, link))
        
        return internal_links[:10]
    
    def _extract_external_links(self, html: str, base_url: str) -> List[str]:
        """Extract external links from HTML."""
        link_matches = re.findall(r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>', html, re.IGNORECASE)
        external_links = []
        base_domain = urlparse(base_url).netloc
        
        for link in link_matches:
            parsed_link = urlparse(link)
            if parsed_link.netloc and parsed_link.netloc != base_domain:
                external_links.append(link)
        
        return external_links[:10]
    
    def _extract_images(self, html: str) -> List[str]:
        """Extract image URLs from HTML."""
        img_matches = re.findall(r'<img[^>]*src=["\']([^"\']*)["\'][^>]*>', html, re.IGNORECASE)
        return img_matches[:10]
    
    def _extract_publish_date(self, html: str) -> Optional[str]:
        """Extract publish date from HTML."""
        # Look for common date patterns
        date_patterns = [
            r'<meta[^>]*property=["\']article:published_time["\'][^>]*content=["\']([^"\']*)["\']',
            r'<time[^>]*datetime=["\']([^"\']*)["\']',
            r'<span[^>]*class=["\'][^"\']*date[^"\']*["\'][^>]*>([^<]*)</span>'
        ]
        
        for pattern in date_patterns:
            match = re.search(pattern, html, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _estimate_social_shares(self, url: str) -> int:
        """Estimate social shares (mock implementation)."""
        # In production, integrate with social media APIs
        return hash(url) % 1000
    
    def _estimate_traffic(self, word_count: int, content_type: str) -> int:
        """Estimate traffic based on content characteristics."""
        base_traffic = 100
        
        # Adjust based on word count
        if word_count > 2000:
            base_traffic *= 2
        elif word_count > 1000:
            base_traffic *= 1.5
        
        # Adjust based on content type
        if content_type == 'blog_post':
            base_traffic *= 1.5
        elif content_type == 'guide':
            base_traffic *= 2
        
        return int(base_traffic)
    
    def _estimate_domain_authority(self, url: str) -> int:
        """Estimate domain authority (mock implementation)."""
        # In production, integrate with Moz API or similar
        domain = urlparse(url).netloc
        return hash(domain) % 100
    
    def _identify_content_gaps(self, competitor_content: List[CompetitorContent]) -> List[ContentGap]:
        """Identify content gaps and opportunities."""
        
        gaps = []
        
        # Analyze keywords across all content
        all_keywords = []
        for content in competitor_content:
            all_keywords.extend(content.target_keywords)
        
        keyword_freq = Counter(all_keywords)
        
        # Find high-frequency keywords that could be opportunities
        for keyword, count in keyword_freq.most_common(20):
            if count >= 2:  # Keyword appears in multiple pieces of content
                # Find competitor URLs using this keyword
                competitor_urls = [
                    content.url for content in competitor_content
                    if keyword in content.target_keywords
                ]
                
                # Determine content type based on competitor usage
                content_type = self._determine_optimal_content_type(competitor_urls, keyword)
                
                # Calculate opportunity score
                opportunity_score = self._calculate_opportunity_score(keyword, count, competitor_urls)
                
                # Generate suggestions
                suggested_title = self._generate_suggested_title(keyword, content_type)
                suggested_outline = self._generate_suggested_outline(keyword, content_type)
                
                gap = ContentGap(
                    keyword=keyword,
                    search_volume=count * 100,  # Mock search volume
                    competition="medium",
                    competitor_urls=competitor_urls,
                    content_type=content_type,
                    opportunity_score=opportunity_score,
                    suggested_title=suggested_title,
                    suggested_outline=suggested_outline,
                    estimated_difficulty="medium",
                    priority="high" if opportunity_score > 0.7 else "medium",
                    created_at=datetime.now().isoformat()
                )
                
                gaps.append(gap)
        
        return gaps[:10]  # Return top 10 opportunities
    
    def _determine_optimal_content_type(self, urls: List[str], keyword: str) -> str:
        """Determine optimal content type for keyword."""
        
        # Analyze URL patterns
        blog_count = sum(1 for url in urls if 'blog' in url.lower())
        product_count = sum(1 for url in urls if 'product' in url.lower())
        guide_count = sum(1 for url in urls if 'guide' in url.lower())
        
        if blog_count > product_count and blog_count > guide_count:
            return 'blog_post'
        elif product_count > blog_count and product_count > guide_count:
            return 'product_page'
        elif guide_count > blog_count and guide_count > product_count:
            return 'guide'
        else:
            return 'blog_post'  # Default
    
    def _calculate_opportunity_score(self, keyword: str, frequency: int, urls: List[str]) -> float:
        """Calculate opportunity score for keyword."""
        
        score = 0.0
        
        # Frequency score (0-0.4)
        score += min(0.4, frequency * 0.1)
        
        # URL diversity score (0-0.3)
        unique_domains = len(set(urlparse(url).netloc for url in urls))
        score += min(0.3, unique_domains * 0.1)
        
        # Keyword length score (0-0.3)
        if len(keyword.split()) > 1:  # Long-tail keyword
            score += 0.3
        else:
            score += 0.1
        
        return min(1.0, score)
    
    def _generate_suggested_title(self, keyword: str, content_type: str) -> str:
        """Generate suggested title for keyword."""
        
        if content_type == 'blog_post':
            return f"Complete Guide to {keyword.title()}"
        elif content_type == 'product_page':
            return f"Best {keyword.title()} - Product Review"
        elif content_type == 'guide':
            return f"How to {keyword.title()} - Step by Step Guide"
        else:
            return f"Everything You Need to Know About {keyword.title()}"
    
    def _generate_suggested_outline(self, keyword: str, content_type: str) -> List[str]:
        """Generate suggested content outline."""
        
        if content_type == 'blog_post':
            return [
                f"Introduction to {keyword}",
                f"What is {keyword}?",
                f"Benefits of {keyword}",
                f"How to Use {keyword}",
                f"Best Practices for {keyword}",
                f"Conclusion and Next Steps"
            ]
        elif content_type == 'guide':
            return [
                f"Getting Started with {keyword}",
                f"Step 1: Understanding {keyword}",
                f"Step 2: Setting Up {keyword}",
                f"Step 3: Advanced {keyword} Techniques",
                f"Troubleshooting {keyword}",
                f"Resources and Further Reading"
            ]
        else:
            return [
                f"Overview of {keyword}",
                f"Key Features",
                f"Benefits and Use Cases",
                f"Implementation Guide",
                f"Best Practices"
            ]
    
    def _find_top_performing_content(self, competitor_content: List[CompetitorContent]) -> List[CompetitorContent]:
        """Find top performing content based on metrics."""
        
        # Sort by estimated traffic and social shares
        sorted_content = sorted(
            competitor_content,
            key=lambda x: (x.estimated_traffic + x.social_shares),
            reverse=True
        )
        
        return sorted_content[:5]  # Top 5 performing pieces
    
    def _identify_keyword_opportunities(self, competitor_content: List[CompetitorContent]) -> List[Dict[str, Any]]:
        """Identify keyword opportunities from competitor analysis."""
        
        opportunities = []
        
        # Analyze keyword patterns
        keyword_usage = defaultdict(list)
        for content in competitor_content:
            for keyword in content.target_keywords:
                keyword_usage[keyword].append(content)
        
        # Find opportunities
        for keyword, content_list in keyword_usage.items():
            if len(content_list) >= 2:  # Keyword used in multiple pieces
                opportunity = {
                    "keyword": keyword,
                    "competitor_count": len(content_list),
                    "avg_word_count": sum(c.word_count for c in content_list) / len(content_list),
                    "content_types": list(set(c.content_type for c in content_list)),
                    "opportunity_score": len(content_list) * 0.2,
                    "suggested_approach": self._suggest_keyword_approach(keyword, content_list)
                }
                opportunities.append(opportunity)
        
        return sorted(opportunities, key=lambda x: x["opportunity_score"], reverse=True)[:10]
    
    def _suggest_keyword_approach(self, keyword: str, content_list: List[CompetitorContent]) -> str:
        """Suggest approach for targeting keyword."""
        
        avg_word_count = sum(c.word_count for c in content_list) / len(content_list)
        content_types = set(c.content_type for c in content_list)
        
        if avg_word_count > 2000:
            return f"Create comprehensive, long-form content about {keyword}"
        elif 'blog_post' in content_types:
            return f"Write detailed blog post about {keyword}"
        elif 'guide' in content_types:
            return f"Create step-by-step guide for {keyword}"
        else:
            return f"Develop content strategy around {keyword}"
    
    def _generate_content_recommendations(self, competitor_content: List[CompetitorContent], content_gaps: List[ContentGap]) -> List[Dict[str, Any]]:
        """Generate content recommendations based on analysis."""
        
        recommendations = []
        
        # Analyze content performance patterns
        high_performing = [c for c in competitor_content if c.estimated_traffic > 500]
        
        if high_performing:
            # Recommend similar content
            avg_word_count = sum(c.word_count for c in high_performing) / len(high_performing)
            common_keywords = self._find_common_keywords(high_performing)
            
            recommendations.append({
                "type": "content_length",
                "title": "Optimize Content Length",
                "description": f"High-performing content averages {avg_word_count:.0f} words",
                "action": f"Aim for {int(avg_word_count)}-{int(avg_word_count * 1.2)} words in your content",
                "priority": "high"
            })
            
            if common_keywords:
                recommendations.append({
                    "type": "keyword_strategy",
                    "title": "Focus on High-Performing Keywords",
                    "description": f"Keywords that perform well: {', '.join(common_keywords[:5])}",
                    "action": f"Incorporate these keywords into your content strategy",
                    "priority": "high"
                })
        
        # Recommend content gaps
        for gap in content_gaps[:3]:
            recommendations.append({
                "type": "content_gap",
                "title": f"Create Content About {gap.keyword.title()}",
                "description": f"Opportunity score: {gap.opportunity_score:.2f}",
                "action": f"Create {gap.content_type} with title: {gap.suggested_title}",
                "priority": gap.priority
            })
        
        return recommendations

async def main():
    """Main function to demonstrate competitor analysis."""
    
    # Test competitor analysis
    competitor_domain = "example.com"
    
    async with CompetitorContentAnalyzer() as analyzer:
        print(f"Analyzing competitor: {competitor_domain}")
        
        analysis = await analyzer.analyze_competitor(competitor_domain, max_pages=5)
        
        print(f"✅ Competitor analysis complete!")
        print(f"Pages analyzed: {analysis.total_pages_analyzed}")
        print(f"Content gaps found: {len(analysis.content_gaps)}")
        print(f"Keyword opportunities: {len(analysis.keyword_opportunities)}")
        print(f"Content recommendations: {len(analysis.content_recommendations)}")
        
        # Save analysis
        with open("competitor_analysis.json", "w") as f:
            f.write(json.dumps(asdict(analysis), indent=2, default=str))
        
        print("\nFiles created:")
        print("- competitor_analysis.json")

if __name__ == "__main__":
    asyncio.run(main())

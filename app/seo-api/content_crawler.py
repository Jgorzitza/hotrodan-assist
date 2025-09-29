#!/usr/bin/env python3
"""
Content Crawler for SEO Optimization

Crawls websites to analyze content for optimization opportunities:
- Respectful crawling with rate limiting
- Content analysis and scoring
- Bulk optimization reports
- Site-wide content audit
"""

import asyncio
import aiohttp
import time
from typing import List, Optional, Set
from urllib.parse import urljoin, urlparse
from dataclasses import dataclass
import logging
from content_optimizer import ContentOptimizer, ContentOptimizationReport

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class CrawlResult:
    """Result of crawling a single page."""

    url: str
    success: bool
    content: Optional[str] = None
    error: Optional[str] = None
    response_time: float = 0.0
    status_code: int = 0


@dataclass
class SiteAuditReport:
    """Complete site audit report."""

    base_url: str
    pages_analyzed: int
    total_pages: int
    average_score: float
    high_priority_pages: List[str]
    optimization_reports: List[ContentOptimizationReport]
    created_at: str


class ContentCrawler:
    """Crawls websites for content optimization analysis."""

    def __init__(self, max_concurrent: int = 5, delay: float = 1.0):
        self.max_concurrent = max_concurrent
        self.delay = delay
        self.optimizer = ContentOptimizer()
        self.visited_urls: Set[str] = set()
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={"User-Agent": "SEO-Content-Optimizer/1.0 (Content Analysis Bot)"},
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def crawl_site(self, base_url: str, max_pages: int = 10) -> SiteAuditReport:
        """Crawl a website and analyze content for optimization."""

        logger.info(f"Starting site crawl for {base_url}")

        # Discover pages to crawl
        pages_to_crawl = await self._discover_pages(base_url, max_pages)

        # Crawl pages concurrently
        crawl_results = await self._crawl_pages(pages_to_crawl)

        # Analyze content
        optimization_reports = []
        for result in crawl_results:
            if result.success and result.content:
                try:
                    report = self.optimizer.optimize_content(result.content, result.url)
                    optimization_reports.append(report)
                except Exception as e:
                    logger.error(f"Error analyzing {result.url}: {str(e)}")

        # Generate site audit report
        audit_report = self._generate_audit_report(
            base_url, crawl_results, optimization_reports
        )

        logger.info(f"Site crawl complete. Analyzed {len(optimization_reports)} pages")

        return audit_report

    async def _discover_pages(self, base_url: str, max_pages: int) -> List[str]:
        """Discover pages to crawl on the site."""
        pages = [base_url]

        # Simple page discovery - in production, use sitemap or more sophisticated crawling
        # For now, we'll just return the base URL and a few common paths
        common_paths = [
            "/about",
            "/contact",
            "/blog",
            "/products",
            "/services",
            "/privacy",
            "/terms",
        ]

        for path in common_paths:
            if len(pages) >= max_pages:
                break
            full_url = urljoin(base_url, path)
            pages.append(full_url)

        return pages[:max_pages]

    async def _crawl_pages(self, urls: List[str]) -> List[CrawlResult]:
        """Crawl multiple pages concurrently."""
        semaphore = asyncio.Semaphore(self.max_concurrent)

        async def crawl_single_page(url: str) -> CrawlResult:
            async with semaphore:
                return await self._crawl_single_page(url)

        tasks = [crawl_single_page(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle exceptions
        crawl_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                crawl_results.append(
                    CrawlResult(url=urls[i], success=False, error=str(result))
                )
            else:
                crawl_results.append(result)

        return crawl_results

    async def _crawl_single_page(self, url: str) -> CrawlResult:
        """Crawl a single page."""
        start_time = time.time()

        try:
            async with self.session.get(url) as response:
                content = await response.text()
                response_time = time.time() - start_time

                return CrawlResult(
                    url=url,
                    success=True,
                    content=content,
                    response_time=response_time,
                    status_code=response.status,
                )

        except Exception as e:
            response_time = time.time() - start_time
            return CrawlResult(
                url=url, success=False, error=str(e), response_time=response_time
            )

    def _generate_audit_report(
        self,
        base_url: str,
        crawl_results: List[CrawlResult],
        optimization_reports: List[ContentOptimizationReport],
    ) -> SiteAuditReport:
        """Generate site audit report."""

        total_pages = len(crawl_results)
        pages_analyzed = len(optimization_reports)

        # Calculate average score
        if optimization_reports:
            average_score = sum(
                r.analysis.overall_score for r in optimization_reports
            ) / len(optimization_reports)
        else:
            average_score = 0.0

        # Identify high-priority pages (score below 50)
        high_priority_pages = [
            r.url for r in optimization_reports if r.analysis.overall_score < 50
        ]

        return SiteAuditReport(
            base_url=base_url,
            pages_analyzed=pages_analyzed,
            total_pages=total_pages,
            average_score=average_score,
            high_priority_pages=high_priority_pages,
            optimization_reports=optimization_reports,
            created_at=time.strftime("%Y-%m-%d %H:%M:%S"),
        )

    def export_audit_report(self, report: SiteAuditReport, format: str = "json") -> str:
        """Export site audit report."""
        if format == "json":
            import json
            from dataclasses import asdict

            return json.dumps(asdict(report), indent=2, default=str)
        elif format == "markdown":
            return self._generate_markdown_audit_report(report)
        else:
            raise ValueError(f"Unsupported format: {format}")

    def _generate_markdown_audit_report(self, report: SiteAuditReport) -> str:
        """Generate markdown audit report."""
        md_content = f"""# Site Content Audit Report

## Site: {report.base_url}
**Generated**: {report.created_at}

## Summary

- **Pages Analyzed**: {report.pages_analyzed}/{report.total_pages}
- **Average Content Score**: {report.average_score:.1f}/100
- **High-Priority Pages**: {len(report.high_priority_pages)}

## High-Priority Pages (Score < 50)

"""
        for url in report.high_priority_pages:
            md_content += f"- {url}\n"

        md_content += """
## Page-by-Page Analysis

"""
        for opt_report in report.optimization_reports:
            analysis = opt_report.analysis
            md_content += f"""
### {opt_report.url}

- **Overall Score**: {analysis.overall_score:.1f}/100
- **SEO Score**: {analysis.seo_score:.1f}/100
- **Readability Score**: {analysis.readability_score:.1f}/100
- **Word Count**: {analysis.word_count}
- **Issues**: {len(analysis.issues)}

**Issues:**
"""
            for issue in analysis.issues:
                md_content += f"- ❌ {issue}\n"

            md_content += """
**Suggestions:**
"""
            high_priority = [s for s in opt_report.suggestions if s.priority == "high"]
            for suggestion in high_priority:
                md_content += f"- 🔴 **{suggestion.title}**: {suggestion.description}\n"

            medium_priority = [
                s for s in opt_report.suggestions if s.priority == "medium"
            ]
            for suggestion in medium_priority:
                md_content += f"- 🟡 **{suggestion.title}**: {suggestion.description}\n"

            md_content += "\n---\n\n"

        md_content += """
## Recommendations

1. **Focus on high-priority pages first** - Address pages with scores below 50
2. **Improve content structure** - Add proper headings and improve readability
3. **Optimize SEO elements** - Fix title tags, meta descriptions, and H1 tags
4. **Monitor progress** - Track improvements over time

## Next Steps

1. Implement high-priority optimizations
2. Re-analyze pages after changes
3. Set up ongoing monitoring
4. Track performance improvements
"""

        return md_content


async def main():
    """Main function to demonstrate content crawling."""

    # Test URLs
    test_urls = ["https://example.com", "https://httpbin.org/html"]

    for url in test_urls:
        print(f"\nCrawling {url}...")

        async with ContentCrawler(max_concurrent=3, delay=1.0) as crawler:
            try:
                audit_report = await crawler.crawl_site(url, max_pages=5)

                print("Site audit complete!")
                print(f"Pages analyzed: {audit_report.pages_analyzed}")
                print(f"Average score: {audit_report.average_score:.1f}/100")
                print(f"High-priority pages: {len(audit_report.high_priority_pages)}")

                # Export reports
                json_report = crawler.export_audit_report(audit_report, "json")
                markdown_report = crawler.export_audit_report(audit_report, "markdown")

                # Save reports
                domain = urlparse(url).netloc.replace(".", "_")
                with open(f"site_audit_{domain}.json", "w") as f:
                    f.write(json_report)

                with open(f"site_audit_{domain}.md", "w") as f:
                    f.write(markdown_report)

                print(
                    f"Reports saved: site_audit_{domain}.json, site_audit_{domain}.md"
                )

            except Exception as e:
                print(f"Error crawling {url}: {str(e)}")


if __name__ == "__main__":
    asyncio.run(main())

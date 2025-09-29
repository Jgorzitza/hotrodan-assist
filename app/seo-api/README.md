# SEO Opportunities API

A comprehensive SEO opportunity analysis system that provides competitor crawling, keyword gap detection, content brief generation, and opportunity scoring.

## Features

### 🤖 Respectful Competitor Crawling
- **Robots.txt compliance** - Automatically checks and respects robots.txt files
- **Rate limiting** - Configurable delays between requests to be respectful to target sites
- **Concurrent crawling** - Efficient async crawling with configurable concurrency limits
- **Error handling** - Graceful handling of network errors and timeouts
- **SEO data extraction** - Extracts titles, meta descriptions, headings, links, and content metrics

### 🔍 Keyword Gap Detection
- **Competitor analysis** - Identifies keywords competitors rank for that you don't
- **Intent classification** - Automatically categorizes keywords by user intent (transactional, informational, navigational)
- **Opportunity scoring** - Multi-factor scoring based on search volume, competition, and business relevance
- **Content suggestions** - Provides actionable content recommendations for each gap

### 📝 Content Brief Generation
- **Structured briefs** - Generates comprehensive content briefs with titles, H2s, outlines, and internal links
- **Content type detection** - Automatically determines optimal content type (blog post, product page, guide, landing page)
- **SEO optimization** - Includes meta descriptions, target word counts, and SEO recommendations
- **Template system** - Flexible templates for different content types and intents

### 📊 Opportunity Scoring & Ranking
- **Multi-factor scoring** - Considers search volume, competition difficulty, user intent, and business relevance
- **Priority classification** - Categorizes opportunities as high, medium, or low priority
- **Quick wins identification** - Identifies high-impact, low-effort opportunities
- **ROI estimation** - Calculates estimated return on investment for each opportunity
- **Resource planning** - Identifies required resources and dependencies

## Quick Start

### Basic Usage

```python
from app.seo_api import SEOOpportunitiesAPI, SEOAnalysisRequest

# Initialize the API
api = SEOOpportunitiesAPI()

# Create analysis request
request = SEOAnalysisRequest(
    domain="your-site.com",
    competitor_domains=["competitor1.com", "competitor2.com"],
    target_keywords=["your", "existing", "keywords"],
    max_pages_per_competitor=50,
    min_search_volume=100
)

# Run analysis
result = await api.analyze_opportunities(request)

# Access results
print(f"Found {len(result.opportunities)} opportunities")
print(f"High priority: {len(result.opportunity_ranking.high_priority)}")
print(f"Quick wins: {len(result.opportunity_ranking.quick_wins)}")
```

### Individual Components

```python
from app.seo_api import (
    RobotsRespectingCrawler, CrawlConfig,
    KeywordGapDetector, KeywordMetrics,
    ContentBriefGenerator,
    OpportunityScorer, SEOOpportunity
)

# Crawl a competitor
config = CrawlConfig(max_pages=50, delay_between_requests=1.0)
crawler = RobotsRespectingCrawler(config)
analysis = await crawler.crawl_competitor("competitor.com")

# Detect keyword gaps
detector = KeywordGapDetector()
gaps = detector.find_keyword_gaps(your_keywords, competitor_keywords)

# Generate content brief
generator = ContentBriefGenerator()
brief = generator.generate_brief(
    target_keyword="custom hot rod builds",
    intent="informational",
    search_volume=5000,
    difficulty=65.0
)

# Score opportunities
scorer = OpportunityScorer()
ranking = scorer.rank_opportunities(opportunities, business_context)
```

## Configuration

### Crawler Configuration

```python
config = CrawlConfig(
    max_pages=100,                    # Maximum pages to crawl per domain
    delay_between_requests=1.0,       # Seconds between requests
    timeout=10,                       # Request timeout in seconds
    max_concurrent=5,                 # Maximum concurrent requests
    respect_robots=True,              # Whether to respect robots.txt
    user_agent="SEO-Analyzer/1.0"     # User agent string
)
```

### Business Context

```python
business_context = {
    'primary_services': [
        'custom hot rod builds',
        'hot rod restoration',
        'performance modifications'
    ],
    'target_audience': [
        'hot rod enthusiasts',
        'car collectors',
        'racing drivers'
    ]
}
```

## Testing

Run the basic test suite:

```bash
python3 app/seo-api/simple_test.py
```

## Architecture

```
app/seo-api/
├── main.py                    # Main orchestrator
├── crawler.py                 # Web crawling functionality
├── keyword_gap_detection.py   # Keyword analysis algorithms
├── content_brief_generator.py # Content brief creation
├── opportunity_scorer.py      # Scoring and ranking system
├── test_api.py               # Comprehensive test suite
├── simple_test.py            # Basic functionality tests
├── requirements.txt          # Python dependencies
└── README.md                # This file
```

## Integration Points

- **Dashboard integration** - Designed to work with existing Shopify Polaris dashboard
- **MCP connectors** - Ready to integrate with GSC, GA4, Bing connectors
- **Mock data support** - Fully functional with mock data for development
- **Storage system** - Results saved to JSON files for persistence

## Dependencies

- `aiohttp` - Async HTTP client for crawling
- `requests` - HTTP requests library
- `beautifulsoup4` - HTML parsing
- `asyncio` - Async processing
- Standard library modules for data processing

## Roadmap

- [ ] Real-time competitor monitoring
- [ ] Advanced NLP for content analysis
- [ ] Integration with keyword research APIs
- [ ] Content performance tracking
- [ ] Automated reporting and alerts

## Contributing

This is part of the SEO & Content Intelligence Engineer role in the llama_rag project. See `plans/agents/seo/direction.md` for project context and requirements.

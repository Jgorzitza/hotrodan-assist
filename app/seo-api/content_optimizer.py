#!/usr/bin/env python3
"""
Content Optimization System - seo.content-optimization

Analyzes existing content and provides optimization suggestions:
- Content audit and quality scoring
- SEO optimization recommendations
- Readability analysis
- Keyword optimization
- Content structure improvements
- Performance tracking
"""

import json
import re
from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import dataclass, asdict
from collections import Counter
import logging
from urllib.parse import urljoin, urlparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ContentAnalysis:
    """Represents content analysis results."""

    url: str
    title: str
    meta_description: str
    h1: str
    h2s: List[str]
    content: str
    word_count: int
    readability_score: float
    seo_score: float
    overall_score: float
    issues: List[str]
    suggestions: List[str]
    keyword_density: Dict[str, float]
    internal_links: List[str]
    external_links: List[str]
    images: List[str]
    headings_structure: Dict[str, int]
    created_at: str


@dataclass
class OptimizationSuggestion:
    """Represents a specific optimization suggestion."""

    type: str  # seo, readability, structure, keyword, technical
    priority: str  # high, medium, low
    title: str
    description: str
    current_value: str
    suggested_value: str
    impact: str
    effort: str
    code_example: Optional[str] = None


@dataclass
class ContentOptimizationReport:
    """Complete content optimization report."""

    url: str
    analysis: ContentAnalysis
    suggestions: List[OptimizationSuggestion]
    priority_actions: List[str]
    estimated_impact: str
    effort_required: str
    created_at: str


class ContentAnalyzer:
    """Analyzes content for optimization opportunities."""

    def __init__(self):
        self.stop_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "must",
            "can",
            "this",
            "that",
            "these",
            "those",
        }

    def analyze_content(self, html_content: str, url: str) -> ContentAnalysis:
        """Analyze HTML content and return analysis results."""

        # Extract basic SEO elements
        title = self._extract_title(html_content)
        meta_description = self._extract_meta_description(html_content)
        h1 = self._extract_h1(html_content)
        h2s = self._extract_h2s(html_content)
        content = self._extract_text_content(html_content)

        # Calculate metrics
        word_count = len(content.split())
        readability_score = self._calculate_readability_score(content)
        seo_score = self._calculate_seo_score(
            title, meta_description, h1, h2s, content, word_count
        )
        overall_score = (readability_score + seo_score) / 2

        # Identify issues and suggestions
        issues = self._identify_issues(
            title, meta_description, h1, h2s, content, word_count
        )
        suggestions = self._generate_suggestions(
            title, meta_description, h1, h2s, content, word_count
        )

        # Analyze keyword density
        keyword_density = self._analyze_keyword_density(content)

        # Extract links and images
        internal_links = self._extract_internal_links(html_content, url)
        external_links = self._extract_external_links(html_content, url)
        images = self._extract_images(html_content)

        # Analyze heading structure
        headings_structure = self._analyze_headings_structure(html_content)

        return ContentAnalysis(
            url=url,
            title=title,
            meta_description=meta_description,
            h1=h1,
            h2s=h2s,
            content=content,
            word_count=word_count,
            readability_score=readability_score,
            seo_score=seo_score,
            overall_score=overall_score,
            issues=issues,
            suggestions=suggestions,
            keyword_density=keyword_density,
            internal_links=internal_links,
            external_links=external_links,
            images=images,
            headings_structure=headings_structure,
            created_at=datetime.now().isoformat(),
        )

    def _extract_title(self, html: str) -> str:
        """Extract page title."""
        title_match = re.search(
            r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL
        )
        return (
            re.sub(r"<[^>]+>", "", title_match.group(1)).strip() if title_match else ""
        )

    def _extract_meta_description(self, html: str) -> str:
        """Extract meta description."""
        desc_match = re.search(
            r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']',
            html,
            re.IGNORECASE,
        )
        return desc_match.group(1).strip() if desc_match else ""

    def _extract_h1(self, html: str) -> str:
        """Extract H1 tag."""
        h1_match = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.IGNORECASE | re.DOTALL)
        return re.sub(r"<[^>]+>", "", h1_match.group(1)).strip() if h1_match else ""

    def _extract_h2s(self, html: str) -> List[str]:
        """Extract H2 tags."""
        h2_matches = re.findall(r"<h2[^>]*>(.*?)</h2>", html, re.IGNORECASE | re.DOTALL)
        return [re.sub(r"<[^>]+>", "", h2).strip() for h2 in h2_matches]

    def _extract_text_content(self, html: str) -> str:
        """Extract main text content from HTML."""
        # Remove script and style tags
        content = re.sub(
            r"<script[^>]*>.*?</script>", "", html, flags=re.IGNORECASE | re.DOTALL
        )
        content = re.sub(
            r"<style[^>]*>.*?</style>", "", content, flags=re.IGNORECASE | re.DOTALL
        )

        # Remove HTML tags
        content = re.sub(r"<[^>]+>", " ", content)

        # Clean up whitespace
        content = re.sub(r"\s+", " ", content).strip()

        return content

    def _calculate_readability_score(self, content: str) -> float:
        """Calculate Flesch Reading Ease score."""
        sentences = re.split(r"[.!?]+", content)
        words = content.split()

        if not sentences or not words:
            return 0.0

        # Count syllables (simplified)
        syllables = sum(self._count_syllables(word) for word in words)

        # Flesch Reading Ease formula
        score = (
            206.835
            - (1.015 * (len(words) / len(sentences)))
            - (84.6 * (syllables / len(words)))
        )

        return max(0, min(100, score))

    def _count_syllables(self, word: str) -> int:
        """Count syllables in a word (simplified)."""
        word = word.lower()
        vowels = "aeiouy"
        syllable_count = 0
        prev_was_vowel = False

        for char in word:
            is_vowel = char in vowels
            if is_vowel and not prev_was_vowel:
                syllable_count += 1
            prev_was_vowel = is_vowel

        # Handle silent 'e'
        if word.endswith("e") and syllable_count > 1:
            syllable_count -= 1

        return max(1, syllable_count)

    def _calculate_seo_score(
        self,
        title: str,
        meta_description: str,
        h1: str,
        h2s: List[str],
        content: str,
        word_count: int,
    ) -> float:
        """Calculate SEO score based on various factors."""
        score = 0.0
        max_score = 100.0

        # Title optimization (20 points)
        if title:
            if 30 <= len(title) <= 60:
                score += 20
            elif 20 <= len(title) <= 70:
                score += 15
            else:
                score += 5

        # Meta description optimization (15 points)
        if meta_description:
            if 120 <= len(meta_description) <= 160:
                score += 15
            elif 100 <= len(meta_description) <= 180:
                score += 10
            else:
                score += 5

        # H1 optimization (15 points)
        if h1:
            if 20 <= len(h1) <= 60:
                score += 15
            elif 10 <= len(h1) <= 80:
                score += 10
            else:
                score += 5

        # H2 structure (15 points)
        if len(h2s) >= 3:
            score += 15
        elif len(h2s) >= 1:
            score += 10

        # Content length (15 points)
        if 300 <= word_count <= 2000:
            score += 15
        elif 200 <= word_count <= 3000:
            score += 10
        else:
            score += 5

        # Keyword density (10 points)
        keyword_density = self._analyze_keyword_density(content)
        if keyword_density:
            avg_density = sum(keyword_density.values()) / len(keyword_density)
            if 1.0 <= avg_density <= 3.0:
                score += 10
            elif 0.5 <= avg_density <= 4.0:
                score += 7
            else:
                score += 3

        # Internal linking (10 points)
        internal_links = self._extract_internal_links_from_content(content)
        if len(internal_links) >= 3:
            score += 10
        elif len(internal_links) >= 1:
            score += 5

        return min(max_score, score)

    def _analyze_keyword_density(self, content: str) -> Dict[str, float]:
        """Analyze keyword density in content."""
        words = re.findall(r"\b\w+\b", content.lower())
        word_count = len(words)

        if word_count == 0:
            return {}

        # Count word frequency
        word_freq = Counter(words)

        # Calculate density for words that appear more than once
        keyword_density = {}
        for word, count in word_freq.items():
            if count > 1 and len(word) > 3 and word not in self.stop_words:
                density = (count / word_count) * 100
                keyword_density[word] = round(density, 2)

        # Return top 10 keywords by density
        return dict(
            sorted(keyword_density.items(), key=lambda x: x[1], reverse=True)[:10]
        )

    def _extract_internal_links(self, html: str, base_url: str) -> List[str]:
        """Extract internal links from HTML."""
        link_matches = re.findall(
            r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>', html, re.IGNORECASE
        )
        internal_links = []
        base_domain = urlparse(base_url).netloc

        for link in link_matches:
            if link.startswith("/") or urlparse(link).netloc == base_domain:
                internal_links.append(urljoin(base_url, link))

        return internal_links[:10]  # Limit to first 10

    def _extract_internal_links_from_content(self, content: str) -> List[str]:
        """Extract internal links from text content (simplified)."""
        # This is a simplified version - in practice, you'd parse the original HTML
        return []

    def _extract_external_links(self, html: str, base_url: str) -> List[str]:
        """Extract external links from HTML."""
        link_matches = re.findall(
            r'<a[^>]*href=["\']([^"\']*)["\'][^>]*>', html, re.IGNORECASE
        )
        external_links = []
        base_domain = urlparse(base_url).netloc

        for link in link_matches:
            parsed_link = urlparse(link)
            if parsed_link.netloc and parsed_link.netloc != base_domain:
                external_links.append(link)

        return external_links[:10]  # Limit to first 10

    def _extract_images(self, html: str) -> List[str]:
        """Extract image URLs from HTML."""
        img_matches = re.findall(
            r'<img[^>]*src=["\']([^"\']*)["\'][^>]*>', html, re.IGNORECASE
        )
        return img_matches[:10]  # Limit to first 10

    def _analyze_headings_structure(self, html: str) -> Dict[str, int]:
        """Analyze heading structure (H1, H2, H3, etc.)."""
        headings = {}
        for level in range(1, 7):
            pattern = f"<h{level}[^>]*>.*?</h{level}>"
            matches = re.findall(pattern, html, re.IGNORECASE | re.DOTALL)
            headings[f"H{level}"] = len(matches)

        return headings

    def _identify_issues(
        self,
        title: str,
        meta_description: str,
        h1: str,
        h2s: List[str],
        content: str,
        word_count: int,
    ) -> List[str]:
        """Identify content issues."""
        issues = []

        # Title issues
        if not title:
            issues.append("Missing page title")
        elif len(title) < 30:
            issues.append("Title too short (under 30 characters)")
        elif len(title) > 60:
            issues.append("Title too long (over 60 characters)")

        # Meta description issues
        if not meta_description:
            issues.append("Missing meta description")
        elif len(meta_description) < 120:
            issues.append("Meta description too short (under 120 characters)")
        elif len(meta_description) > 160:
            issues.append("Meta description too long (over 160 characters)")

        # H1 issues
        if not h1:
            issues.append("Missing H1 tag")
        elif len(h1) < 20:
            issues.append("H1 too short (under 20 characters)")
        elif len(h1) > 60:
            issues.append("H1 too long (over 60 characters)")

        # Content structure issues
        if len(h2s) < 2:
            issues.append("Insufficient heading structure (less than 2 H2 tags)")

        if word_count < 300:
            issues.append("Content too short (under 300 words)")
        elif word_count > 3000:
            issues.append("Content too long (over 3000 words)")

        # Readability issues
        readability_score = self._calculate_readability_score(content)
        if readability_score < 30:
            issues.append("Content difficult to read (readability score below 30)")
        elif readability_score > 80:
            issues.append("Content too simple (readability score above 80)")

        return issues

    def _generate_suggestions(
        self,
        title: str,
        meta_description: str,
        h1: str,
        h2s: List[str],
        content: str,
        word_count: int,
    ) -> List[str]:
        """Generate optimization suggestions."""
        suggestions = []

        # Title suggestions
        if not title:
            suggestions.append("Add a descriptive title tag (30-60 characters)")
        elif len(title) < 30:
            suggestions.append("Expand title to 30-60 characters for better SEO")
        elif len(title) > 60:
            suggestions.append("Shorten title to under 60 characters")

        # Meta description suggestions
        if not meta_description:
            suggestions.append("Add a compelling meta description (120-160 characters)")
        elif len(meta_description) < 120:
            suggestions.append("Expand meta description to 120-160 characters")
        elif len(meta_description) > 160:
            suggestions.append("Shorten meta description to under 160 characters")

        # H1 suggestions
        if not h1:
            suggestions.append("Add a clear H1 tag that describes the main topic")
        elif len(h1) < 20:
            suggestions.append("Make H1 more descriptive (20-60 characters)")
        elif len(h1) > 60:
            suggestions.append("Shorten H1 to under 60 characters")

        # Content structure suggestions
        if len(h2s) < 2:
            suggestions.append("Add more H2 tags to improve content structure")

        if word_count < 300:
            suggestions.append("Expand content to at least 300 words for better SEO")
        elif word_count > 3000:
            suggestions.append("Consider breaking long content into multiple pages")

        # Readability suggestions
        readability_score = self._calculate_readability_score(content)
        if readability_score < 30:
            suggestions.append(
                "Simplify language and sentence structure for better readability"
            )
        elif readability_score > 80:
            suggestions.append("Add more detailed explanations and technical content")

        return suggestions


class OptimizationSuggestionGenerator:
    """Generates specific optimization suggestions."""

    def generate_suggestions(
        self, analysis: ContentAnalysis
    ) -> List[OptimizationSuggestion]:
        """Generate specific optimization suggestions based on content analysis."""
        suggestions = []

        # SEO suggestions
        suggestions.extend(self._generate_seo_suggestions(analysis))

        # Readability suggestions
        suggestions.extend(self._generate_readability_suggestions(analysis))

        # Structure suggestions
        suggestions.extend(self._generate_structure_suggestions(analysis))

        # Keyword suggestions
        suggestions.extend(self._generate_keyword_suggestions(analysis))

        # Technical suggestions
        suggestions.extend(self._generate_technical_suggestions(analysis))

        return suggestions

    def _generate_seo_suggestions(
        self, analysis: ContentAnalysis
    ) -> List[OptimizationSuggestion]:
        """Generate SEO-specific suggestions."""
        suggestions = []

        # Title optimization
        if not analysis.title:
            suggestions.append(
                OptimizationSuggestion(
                    type="seo",
                    priority="high",
                    title="Add Title Tag",
                    description="Missing title tag is critical for SEO",
                    current_value="None",
                    suggested_value="Add descriptive title (30-60 characters)",
                    impact="High - Essential for search engine indexing",
                    effort="Low - Quick fix",
                )
            )
        elif len(analysis.title) < 30:
            suggestions.append(
                OptimizationSuggestion(
                    type="seo",
                    priority="medium",
                    title="Expand Title Length",
                    description="Title is too short for optimal SEO",
                    current_value=f"{len(analysis.title)} characters",
                    suggested_value="30-60 characters",
                    impact="Medium - Better search visibility",
                    effort="Low - Quick edit",
                )
            )

        # Meta description optimization
        if not analysis.meta_description:
            suggestions.append(
                OptimizationSuggestion(
                    type="seo",
                    priority="high",
                    title="Add Meta Description",
                    description="Missing meta description affects click-through rates",
                    current_value="None",
                    suggested_value="Add compelling description (120-160 characters)",
                    impact="High - Improves click-through rates",
                    effort="Medium - Requires copywriting",
                )
            )

        return suggestions

    def _generate_readability_suggestions(
        self, analysis: ContentAnalysis
    ) -> List[OptimizationSuggestion]:
        """Generate readability suggestions."""
        suggestions = []

        if analysis.readability_score < 30:
            suggestions.append(
                OptimizationSuggestion(
                    type="readability",
                    priority="high",
                    title="Improve Readability",
                    description="Content is difficult to read",
                    current_value=f"Score: {analysis.readability_score:.1f}",
                    suggested_value="Score: 50-70 (easier to read)",
                    impact="High - Better user experience",
                    effort="High - Requires content rewriting",
                    code_example="Use shorter sentences, simpler words, and active voice",
                )
            )

        return suggestions

    def _generate_structure_suggestions(
        self, analysis: ContentAnalysis
    ) -> List[OptimizationSuggestion]:
        """Generate content structure suggestions."""
        suggestions = []

        if len(analysis.h2s) < 2:
            suggestions.append(
                OptimizationSuggestion(
                    type="structure",
                    priority="medium",
                    title="Improve Heading Structure",
                    description="Insufficient heading structure for good SEO",
                    current_value=f"{len(analysis.h2s)} H2 tags",
                    suggested_value="At least 2-3 H2 tags",
                    impact="Medium - Better content organization",
                    effort="Medium - Requires content restructuring",
                )
            )

        return suggestions

    def _generate_keyword_suggestions(
        self, analysis: ContentAnalysis
    ) -> List[OptimizationSuggestion]:
        """Generate keyword optimization suggestions."""
        suggestions = []

        if not analysis.keyword_density:
            suggestions.append(
                OptimizationSuggestion(
                    type="keyword",
                    priority="medium",
                    title="Add Target Keywords",
                    description="No clear keyword focus detected",
                    current_value="No keywords identified",
                    suggested_value="Add 2-3 target keywords",
                    impact="Medium - Better search targeting",
                    effort="Medium - Requires keyword research and content updates",
                )
            )

        return suggestions

    def _generate_technical_suggestions(
        self, analysis: ContentAnalysis
    ) -> List[OptimizationSuggestion]:
        """Generate technical SEO suggestions."""
        suggestions = []

        if len(analysis.internal_links) < 3:
            suggestions.append(
                OptimizationSuggestion(
                    type="technical",
                    priority="low",
                    title="Add Internal Links",
                    description="Insufficient internal linking",
                    current_value=f"{len(analysis.internal_links)} internal links",
                    suggested_value="At least 3-5 internal links",
                    impact="Low - Improves site structure",
                    effort="Low - Quick additions",
                )
            )

        return suggestions


class ContentOptimizer:
    """Main class for content optimization."""

    def __init__(self):
        self.analyzer = ContentAnalyzer()
        self.suggestion_generator = OptimizationSuggestionGenerator()

    def optimize_content(
        self, html_content: str, url: str
    ) -> ContentOptimizationReport:
        """Analyze content and generate optimization report."""

        # Analyze content
        analysis = self.analyzer.analyze_content(html_content, url)

        # Generate suggestions
        suggestions = self.suggestion_generator.generate_suggestions(analysis)

        # Generate priority actions
        priority_actions = self._generate_priority_actions(suggestions)

        # Estimate impact and effort
        estimated_impact = self._estimate_impact(suggestions)
        effort_required = self._estimate_effort(suggestions)

        return ContentOptimizationReport(
            url=url,
            analysis=analysis,
            suggestions=suggestions,
            priority_actions=priority_actions,
            estimated_impact=estimated_impact,
            effort_required=effort_required,
            created_at=datetime.now().isoformat(),
        )

    def _generate_priority_actions(
        self, suggestions: List[OptimizationSuggestion]
    ) -> List[str]:
        """Generate priority action list."""
        high_priority = [s for s in suggestions if s.priority == "high"]
        medium_priority = [s for s in suggestions if s.priority == "medium"]

        actions = []

        if high_priority:
            actions.append(f"Address {len(high_priority)} high-priority issues first")

        if medium_priority:
            actions.append(f"Plan {len(medium_priority)} medium-priority improvements")

        actions.append("Monitor performance after implementing changes")

        return actions

    def _estimate_impact(self, suggestions: List[OptimizationSuggestion]) -> str:
        """Estimate overall impact of suggestions."""
        high_impact = len([s for s in suggestions if s.impact == "High"])
        medium_impact = len([s for s in suggestions if s.impact == "Medium"])

        if high_impact >= 3:
            return "High - Significant SEO improvements expected"
        elif high_impact >= 1 or medium_impact >= 3:
            return "Medium - Moderate improvements expected"
        else:
            return "Low - Minor improvements expected"

    def _estimate_effort(self, suggestions: List[OptimizationSuggestion]) -> str:
        """Estimate effort required for suggestions."""
        high_effort = len([s for s in suggestions if s.effort == "High"])
        medium_effort = len([s for s in suggestions if s.effort == "Medium"])

        if high_effort >= 2:
            return "High - Requires significant content work"
        elif high_effort >= 1 or medium_effort >= 3:
            return "Medium - Moderate effort required"
        else:
            return "Low - Quick fixes and minor updates"

    def export_report(
        self, report: ContentOptimizationReport, format: str = "json"
    ) -> str:
        """Export optimization report in specified format."""
        if format == "json":
            return json.dumps(asdict(report), indent=2)
        elif format == "markdown":
            return self._generate_markdown_report(report)
        else:
            raise ValueError(f"Unsupported format: {format}")

    def _generate_markdown_report(self, report: ContentOptimizationReport) -> str:
        """Generate markdown report."""
        analysis = report.analysis

        md_content = f"""# Content Optimization Report

## URL: {report.url}
**Generated**: {report.created_at}

## Content Analysis Summary

### Basic Metrics
- **Word Count**: {analysis.word_count}
- **Readability Score**: {analysis.readability_score:.1f}/100
- **SEO Score**: {analysis.seo_score:.1f}/100
- **Overall Score**: {analysis.overall_score:.1f}/100

### Content Elements
- **Title**: {analysis.title or 'Missing'}
- **Meta Description**: {analysis.meta_description or 'Missing'}
- **H1**: {analysis.h1 or 'Missing'}
- **H2 Tags**: {len(analysis.h2s)}

## Issues Identified

"""
        for issue in analysis.issues:
            md_content += f"- ❌ {issue}\n"

        md_content += """
## Optimization Suggestions

### High Priority
"""
        high_priority = [s for s in report.suggestions if s.priority == "high"]
        for suggestion in high_priority:
            md_content += f"- **{suggestion.title}**: {suggestion.description}\n"
            md_content += f"  - Current: {suggestion.current_value}\n"
            md_content += f"  - Suggested: {suggestion.suggested_value}\n"
            md_content += f"  - Impact: {suggestion.impact}\n"
            md_content += f"  - Effort: {suggestion.effort}\n\n"

        md_content += """
### Medium Priority
"""
        medium_priority = [s for s in report.suggestions if s.priority == "medium"]
        for suggestion in medium_priority:
            md_content += f"- **{suggestion.title}**: {suggestion.description}\n"
            md_content += f"  - Current: {suggestion.current_value}\n"
            md_content += f"  - Suggested: {suggestion.suggested_value}\n"
            md_content += f"  - Impact: {suggestion.impact}\n"
            md_content += f"  - Effort: {suggestion.effort}\n\n"

        md_content += """
## Priority Actions

"""
        for action in report.priority_actions:
            md_content += f"- {action}\n"

        md_content += f"""
## Impact & Effort Summary

- **Estimated Impact**: {report.estimated_impact}
- **Effort Required**: {report.effort_required}

## Next Steps

1. Address high-priority issues first
2. Implement medium-priority improvements
3. Monitor performance metrics
4. Track improvements over time
"""

        return md_content


def main():
    """Main function to demonstrate content optimization."""

    # Sample HTML content for testing
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

    # Export report
    json_report = optimizer.export_report(report, "json")
    markdown_report = optimizer.export_report(report, "markdown")

    # Save reports
    with open("content_optimization_report.json", "w") as f:
        f.write(json_report)

    with open("content_optimization_report.md", "w") as f:
        f.write(markdown_report)

    print("Content optimization analysis complete!")
    print(f"Overall Score: {report.analysis.overall_score:.1f}/100")
    print(f"Issues Found: {len(report.analysis.issues)}")
    print(f"Suggestions Generated: {len(report.suggestions)}")
    print("\nFiles created:")
    print("- content_optimization_report.json")
    print("- content_optimization_report.md")


if __name__ == "__main__":
    main()

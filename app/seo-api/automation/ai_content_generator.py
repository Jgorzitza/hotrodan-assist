#!/usr/bin/env python3
"""
AI-Powered Content Generation System - seo.content-automation

Generates high-quality content briefs and full content using AI:
- AI-powered content brief generation
- Automated content creation
- SEO-optimized content generation
- Content calendar integration
- Performance tracking
"""

import os
import json
import asyncio
import aiohttp
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import logging
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ContentType(Enum):
    BLOG_POST = "blog_post"
    PRODUCT_PAGE = "product_page"
    LANDING_PAGE = "landing_page"
    GUIDE = "guide"
    FAQ = "faq"
    NEWS_ARTICLE = "news_article"


class ContentStatus(Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"


@dataclass
class ContentBrief:
    """AI-generated content brief."""

    id: str
    title: str
    content_type: ContentType
    target_keywords: List[str]
    primary_keyword: str
    meta_description: str
    h1: str
    h2s: List[str]
    content_outline: List[str]
    internal_links: List[str]
    external_links: List[str]
    word_count_target: int
    readability_target: int
    seo_score_target: int
    tone: str
    target_audience: str
    call_to_action: str
    created_at: str
    updated_at: str


@dataclass
class GeneratedContent:
    """AI-generated content."""

    id: str
    brief_id: str
    title: str
    content: str
    meta_description: str
    h1: str
    h2s: List[str]
    word_count: int
    readability_score: float
    seo_score: float
    keyword_density: Dict[str, float]
    internal_links: List[str]
    external_links: List[str]
    status: ContentStatus
    created_at: str
    updated_at: str


@dataclass
class ContentCalendar:
    """Content calendar entry."""

    id: str
    title: str
    content_type: ContentType
    brief_id: Optional[str]
    content_id: Optional[str]
    scheduled_date: str
    publish_date: Optional[str]
    status: ContentStatus
    priority: str
    assigned_to: Optional[str]
    notes: str
    created_at: str


class AIContentGenerator:
    """AI-powered content generation system."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = "https://api.openai.com/v1"
        self.model = "gpt-4"
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=60),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def generate_content_brief(
        self,
        topic: str,
        content_type: ContentType,
        target_keywords: List[str],
        competitor_analysis: Optional[Dict] = None,
        seo_opportunity: Optional[Dict] = None,
    ) -> ContentBrief:
        """Generate AI-powered content brief."""

        prompt = self._build_brief_prompt(
            topic, content_type, target_keywords, competitor_analysis, seo_opportunity
        )

        try:
            response = await self._call_openai_api(prompt)
            brief_data = self._parse_brief_response(
                response, topic, content_type, target_keywords
            )
            return brief_data
        except Exception as e:
            logger.error(f"Error generating content brief: {str(e)}")
            # Return fallback brief
            return self._create_fallback_brief(topic, content_type, target_keywords)

    async def generate_content(self, brief: ContentBrief) -> GeneratedContent:
        """Generate full content from brief."""

        prompt = self._build_content_prompt(brief)

        try:
            response = await self._call_openai_api(prompt)
            content_data = self._parse_content_response(response, brief)
            return content_data
        except Exception as e:
            logger.error(f"Error generating content: {str(e)}")
            # Return fallback content
            return self._create_fallback_content(brief)

    async def optimize_content(
        self, content: GeneratedContent, target_metrics: Dict[str, Any]
    ) -> GeneratedContent:
        """Optimize content for better SEO and readability."""

        prompt = self._build_optimization_prompt(content, target_metrics)

        try:
            response = await self._call_openai_api(prompt)
            optimized_content = self._parse_optimization_response(response, content)
            return optimized_content
        except Exception as e:
            logger.error(f"Error optimizing content: {str(e)}")
            return content

    def _build_brief_prompt(
        self,
        topic: str,
        content_type: ContentType,
        target_keywords: List[str],
        competitor_analysis: Optional[Dict],
        seo_opportunity: Optional[Dict],
    ) -> str:
        """Build prompt for content brief generation."""

        prompt = f"""Generate a comprehensive content brief for the following:

Topic: {topic}
Content Type: {content_type.value}
Target Keywords: {', '.join(target_keywords)}

Please provide a detailed content brief in JSON format with the following structure:
{{
    "title": "Compelling, SEO-optimized title (50-60 characters)",
    "meta_description": "Compelling meta description (120-160 characters)",
    "h1": "Main heading that includes primary keyword",
    "h2s": ["Subheading 1", "Subheading 2", "Subheading 3", "Subheading 4"],
    "content_outline": [
        "Introduction paragraph with hook",
        "Main point 1 with supporting details",
        "Main point 2 with supporting details", 
        "Main point 3 with supporting details",
        "Conclusion with call-to-action"
    ],
    "internal_links": ["/related-page-1", "/related-page-2"],
    "external_links": ["https://authority-site.com"],
    "word_count_target": 1500,
    "readability_target": 65,
    "seo_score_target": 85,
    "tone": "Professional but approachable",
    "target_audience": "Small business owners and entrepreneurs",
    "call_to_action": "Contact us for a free consultation"
}}

Requirements:
- Title must include primary keyword and be compelling
- Meta description must include target keywords and encourage clicks
- H1 should be clear and keyword-optimized
- H2s should create logical content structure
- Content outline should be detailed and actionable
- Include relevant internal and external links
- Target 1500+ words for comprehensive coverage
- Aim for 60-70 readability score (accessible but not too simple)
- Target 80+ SEO score
- Tone should match content type and audience
- Include clear call-to-action

"""

        if competitor_analysis:
            prompt += (
                f"\nCompetitor Analysis:\n{json.dumps(competitor_analysis, indent=2)}\n"
            )

        if seo_opportunity:
            prompt += f"\nSEO Opportunity:\n{json.dumps(seo_opportunity, indent=2)}\n"

        return prompt

    def _build_content_prompt(self, brief: ContentBrief) -> str:
        """Build prompt for full content generation."""

        prompt = f"""Write a comprehensive {brief.content_type.value} based on this content brief:

Title: {brief.title}
Meta Description: {brief.meta_description}
H1: {brief.h1}
H2s: {', '.join(brief.h2s)}
Content Outline: {', '.join(brief.content_outline)}
Target Keywords: {', '.join(brief.target_keywords)}
Primary Keyword: {brief.primary_keyword}
Word Count Target: {brief.word_count_target}
Tone: {brief.tone}
Target Audience: {brief.target_audience}
Call to Action: {brief.call_to_action}

Requirements:
- Write in {brief.tone} tone for {brief.target_audience}
- Include primary keyword naturally throughout (target 1-2% density)
- Use secondary keywords 3-5 times each
- Follow the H2 structure provided
- Include internal links: {', '.join(brief.internal_links)}
- Include external links: {', '.join(brief.external_links)}
- Target {brief.word_count_target} words
- Aim for {brief.readability_target} readability score
- Include the call-to-action: {brief.call_to_action}
- Make content engaging and valuable
- Use subheadings, bullet points, and formatting for readability
- Include relevant examples and case studies
- End with a strong conclusion

Please provide the content in HTML format with proper heading tags, paragraphs, and formatting.
"""

        return prompt

    def _build_optimization_prompt(
        self, content: GeneratedContent, target_metrics: Dict[str, Any]
    ) -> str:
        """Build prompt for content optimization."""

        prompt = f"""Optimize this content for better SEO and readability:

Current Content:
Title: {content.title}
Word Count: {content.word_count}
Readability Score: {content.readability_score}
SEO Score: {content.seo_score}

Target Metrics:
- Word Count: {target_metrics.get('word_count', content.word_count)}
- Readability Score: {target_metrics.get('readability_score', content.readability_score)}
- SEO Score: {target_metrics.get('seo_score', content.seo_score)}

Content:
{content.content}

Please optimize the content to meet the target metrics while maintaining quality and readability. Focus on:
- Improving keyword density and distribution
- Enhancing readability without losing technical accuracy
- Strengthening SEO elements (title, headings, meta description)
- Improving content structure and flow
- Adding more internal and external links if needed

Return the optimized content in the same HTML format.
"""

        return prompt

    async def _call_openai_api(self, prompt: str) -> str:
        """Call OpenAI API for content generation."""

        if not self.session:
            raise Exception("Session not initialized")

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert SEO content writer and strategist. Generate high-quality, SEO-optimized content that ranks well and provides value to readers.",
                },
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 4000,
            "temperature": 0.7,
        }

        async with self.session.post(
            f"{self.base_url}/chat/completions", json=payload
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"OpenAI API error: {response.status} - {error_text}")

            data = await response.json()
            return data["choices"][0]["message"]["content"]

    def _parse_brief_response(
        self,
        response: str,
        topic: str,
        content_type: ContentType,
        target_keywords: List[str],
    ) -> ContentBrief:
        """Parse AI response into ContentBrief object."""

        try:
            # Extract JSON from response
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            json_str = response[json_start:json_end]
            brief_data = json.loads(json_str)

            return ContentBrief(
                id=f"brief_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                title=brief_data.get("title", f"Content about {topic}"),
                content_type=content_type,
                target_keywords=target_keywords,
                primary_keyword=target_keywords[0] if target_keywords else topic,
                meta_description=brief_data.get("meta_description", ""),
                h1=brief_data.get("h1", ""),
                h2s=brief_data.get("h2s", []),
                content_outline=brief_data.get("content_outline", []),
                internal_links=brief_data.get("internal_links", []),
                external_links=brief_data.get("external_links", []),
                word_count_target=brief_data.get("word_count_target", 1500),
                readability_target=brief_data.get("readability_target", 65),
                seo_score_target=brief_data.get("seo_score_target", 85),
                tone=brief_data.get("tone", "Professional"),
                target_audience=brief_data.get("target_audience", "General audience"),
                call_to_action=brief_data.get("call_to_action", "Learn more"),
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
            )
        except Exception as e:
            logger.error(f"Error parsing brief response: {str(e)}")
            return self._create_fallback_brief(topic, content_type, target_keywords)

    def _parse_content_response(
        self, response: str, brief: ContentBrief
    ) -> GeneratedContent:
        """Parse AI response into GeneratedContent object."""

        # Extract content from HTML response
        content = response.strip()

        # Calculate basic metrics
        word_count = len(content.split())
        readability_score = self._calculate_readability_score(content)
        seo_score = self._calculate_seo_score(content, brief)
        keyword_density = self._calculate_keyword_density(
            content, brief.target_keywords
        )

        return GeneratedContent(
            id=f"content_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            brief_id=brief.id,
            title=brief.title,
            content=content,
            meta_description=brief.meta_description,
            h1=brief.h1,
            h2s=brief.h2s,
            word_count=word_count,
            readability_score=readability_score,
            seo_score=seo_score,
            keyword_density=keyword_density,
            internal_links=brief.internal_links,
            external_links=brief.external_links,
            status=ContentStatus.DRAFT,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
        )

    def _parse_optimization_response(
        self, response: str, original_content: GeneratedContent
    ) -> GeneratedContent:
        """Parse optimization response into GeneratedContent object."""

        # Update content with optimized version
        optimized_content = original_content
        optimized_content.content = response.strip()
        optimized_content.word_count = len(response.split())
        optimized_content.readability_score = self._calculate_readability_score(
            response
        )
        optimized_content.seo_score = self._calculate_seo_score(response, None)
        optimized_content.updated_at = datetime.now().isoformat()

        return optimized_content

    def _create_fallback_brief(
        self, topic: str, content_type: ContentType, target_keywords: List[str]
    ) -> ContentBrief:
        """Create fallback brief when AI generation fails."""

        return ContentBrief(
            id=f"brief_fallback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            title=f"Complete Guide to {topic}",
            content_type=content_type,
            target_keywords=target_keywords,
            primary_keyword=target_keywords[0] if target_keywords else topic,
            meta_description=f"Learn everything about {topic} with our comprehensive guide",
            h1=f"Complete Guide to {topic}",
            h2s=[
                f"What is {topic}?",
                f"Benefits of {topic}",
                f"How to Use {topic}",
                "Best Practices",
            ],
            content_outline=[
                f"Introduction to {topic}",
                "Key concepts and benefits",
                "Step-by-step implementation",
                "Common challenges and solutions",
                "Conclusion and next steps",
            ],
            internal_links=["/related-guide", "/contact"],
            external_links=["https://authority-site.com"],
            word_count_target=1500,
            readability_target=65,
            seo_score_target=85,
            tone="Professional",
            target_audience="General audience",
            call_to_action="Get started today",
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
        )

    def _create_fallback_content(self, brief: ContentBrief) -> GeneratedContent:
        """Create fallback content when AI generation fails."""

        content = f"""
        <h1>{brief.h1}</h1>
        <p>This is a comprehensive guide about {brief.primary_keyword}.</p>
        """

        for h2 in brief.h2s:
            content += f"<h2>{h2}</h2><p>Detailed information about {h2.lower()}.</p>"

        content += f"<p>{brief.call_to_action}</p>"

        return GeneratedContent(
            id=f"content_fallback_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            brief_id=brief.id,
            title=brief.title,
            content=content,
            meta_description=brief.meta_description,
            h1=brief.h1,
            h2s=brief.h2s,
            word_count=len(content.split()),
            readability_score=50.0,
            seo_score=60.0,
            keyword_density={brief.primary_keyword: 1.0},
            internal_links=brief.internal_links,
            external_links=brief.external_links,
            status=ContentStatus.DRAFT,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
        )

    def _calculate_readability_score(self, content: str) -> float:
        """Calculate Flesch Reading Ease score."""
        # Simplified readability calculation
        sentences = content.count(".") + content.count("!") + content.count("?")
        words = len(content.split())

        if sentences == 0 or words == 0:
            return 50.0

        avg_sentence_length = words / sentences
        avg_syllables = sum(len(word) for word in content.split()) / words

        score = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables)
        return max(0, min(100, score))

    def _calculate_seo_score(
        self, content: str, brief: Optional[ContentBrief]
    ) -> float:
        """Calculate SEO score."""
        score = 0.0

        # Basic SEO factors
        if "<h1>" in content:
            score += 20
        if "<h2>" in content:
            score += 15
        if len(content) > 500:
            score += 20
        if len(content) > 1000:
            score += 15
        if "meta" in content.lower():
            score += 10
        if "alt=" in content:
            score += 10
        if "<a href=" in content:
            score += 10

        return min(100, score)

    def _calculate_keyword_density(
        self, content: str, keywords: List[str]
    ) -> Dict[str, float]:
        """Calculate keyword density."""
        word_count = len(content.split())
        if word_count == 0:
            return {}

        density = {}
        for keyword in keywords:
            count = content.lower().count(keyword.lower())
            density[keyword] = (count / word_count) * 100

        return density


class ContentCalendarManager:
    """Manages content calendar and publishing workflow."""

    def __init__(self):
        self.calendar_entries: List[ContentCalendar] = []

    def add_content_to_calendar(
        self,
        title: str,
        content_type: ContentType,
        scheduled_date: str,
        brief_id: Optional[str] = None,
        content_id: Optional[str] = None,
        priority: str = "medium",
        assigned_to: Optional[str] = None,
        notes: str = "",
    ) -> ContentCalendar:
        """Add content to calendar."""

        entry = ContentCalendar(
            id=f"calendar_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            title=title,
            content_type=content_type,
            brief_id=brief_id,
            content_id=content_id,
            scheduled_date=scheduled_date,
            publish_date=None,
            status=ContentStatus.DRAFT,
            priority=priority,
            assigned_to=assigned_to,
            notes=notes,
            created_at=datetime.now().isoformat(),
        )

        self.calendar_entries.append(entry)
        return entry

    def get_upcoming_content(self, days: int = 30) -> List[ContentCalendar]:
        """Get upcoming content for the next N days."""

        cutoff_date = datetime.now() + timedelta(days=days)

        return [
            entry
            for entry in self.calendar_entries
            if datetime.fromisoformat(entry.scheduled_date) <= cutoff_date
        ]

    def update_content_status(self, content_id: str, status: ContentStatus) -> bool:
        """Update content status."""

        for entry in self.calendar_entries:
            if entry.content_id == content_id:
                entry.status = status
                if status == ContentStatus.PUBLISHED:
                    entry.publish_date = datetime.now().isoformat()
                return True

        return False


async def main():
    """Main function to demonstrate AI content generation."""

    # Sample data
    topic = "SEO Best Practices for E-commerce"
    content_type = ContentType.BLOG_POST
    target_keywords = [
        "seo best practices",
        "e-commerce seo",
        "online store optimization",
    ]

    # Initialize AI content generator
    async with AIContentGenerator() as generator:
        # Generate content brief
        print("Generating content brief...")
        brief = await generator.generate_content_brief(
            topic, content_type, target_keywords
        )

        print("✅ Content brief generated!")
        print(f"Title: {brief.title}")
        print(f"Target Keywords: {brief.target_keywords}")
        print(f"Word Count Target: {brief.word_count_target}")

        # Generate full content
        print("\nGenerating full content...")
        content = await generator.generate_content(brief)

        print("✅ Content generated!")
        print(f"Word Count: {content.word_count}")
        print(f"Readability Score: {content.readability_score:.1f}")
        print(f"SEO Score: {content.seo_score:.1f}")

        # Save results
        with open("ai_generated_brief.json", "w") as f:
            f.write(json.dumps(asdict(brief), indent=2))

        with open("ai_generated_content.json", "w") as f:
            f.write(json.dumps(asdict(content), indent=2))

        print("\nFiles created:")
        print("- ai_generated_brief.json")
        print("- ai_generated_content.json")


if __name__ == "__main__":
    asyncio.run(main())

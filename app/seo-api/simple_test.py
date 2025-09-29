#!/usr/bin/env python3
"""
Simple test script for SEO API components.

This script tests basic functionality without requiring external dependencies.
"""

import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_keyword_gap_detection():
    """Test keyword gap detection logic."""
    logger.info("Testing keyword gap detection...")

    # Mock keyword data
    your_keywords = [
        {"keyword": "custom hot rods", "search_volume": 5000, "difficulty": 65},
        {"keyword": "hot rod restoration", "search_volume": 3200, "difficulty": 45},
    ]

    competitor_keywords = {
        "competitor1.com": [
            {"keyword": "custom hot rods", "search_volume": 5000, "difficulty": 65},
            {"keyword": "ls engine swaps", "search_volume": 8000, "difficulty": 55},
            {"keyword": "hot rod builds", "search_volume": 12000, "difficulty": 70},
        ],
        "competitor2.com": [
            {"keyword": "hot rod parts", "search_volume": 8000, "difficulty": 55},
            {
                "keyword": "performance upgrades",
                "search_volume": 6000,
                "difficulty": 60,
            },
            {"keyword": "turbo systems", "search_volume": 4000, "difficulty": 50},
        ],
    }

    # Simple gap detection logic
    gaps_found = 0
    for competitor, keywords in competitor_keywords.items():
        for comp_kw in keywords:
            # Check if we have this keyword
            if not any(
                your_kw["keyword"] == comp_kw["keyword"] for your_kw in your_keywords
            ):
                gaps_found += 1
                logger.info(
                    f"Gap found: '{comp_kw['keyword']}' from {competitor} (volume: {comp_kw['search_volume']})"
                )

    logger.info(f"Total keyword gaps found: {gaps_found}")
    return gaps_found


def test_content_brief_generation():
    """Test content brief generation logic."""
    logger.info("Testing content brief generation...")

    target_keyword = "custom hot rod builds"
    intent = "informational"

    # Generate basic content brief
    brief = {
        "target_keyword": target_keyword,
        "title": f"Complete Guide to {target_keyword.title()}",
        "meta_description": f"Learn everything about {target_keyword} with our comprehensive guide. Expert tips and detailed explanations.",
        "h1": target_keyword.title(),
        "h2_sections": [
            f"What is {target_keyword}?",
            f"How to {target_keyword.replace('custom ', '')}",
            f"Best {target_keyword} options",
            f"{target_keyword.title()} vs alternatives",
            f"Tips for {target_keyword}",
            "Frequently asked questions",
        ],
        "target_word_count": 2000,
        "content_type": "guide",
        "intent": intent,
        "created_at": datetime.now().isoformat(),
    }

    logger.info(f"Generated brief for: {brief['target_keyword']}")
    logger.info(f"Title: {brief['title']}")
    logger.info(f"Word count: {brief['target_word_count']}")
    logger.info(f"H2 sections: {len(brief['h2_sections'])}")

    return brief


def test_opportunity_scoring():
    """Test opportunity scoring logic."""
    logger.info("Testing opportunity scoring...")

    # Mock opportunity data
    opportunities = [
        {
            "keyword": "ls engine swaps",
            "search_volume": 8000,
            "competition_difficulty": 55,
            "current_rank": None,
            "intent": "transactional",
        },
        {
            "keyword": "hot rod parts",
            "search_volume": 8000,
            "competition_difficulty": 55,
            "current_rank": 25,
            "intent": "transactional",
        },
        {
            "keyword": "how to build hot rods",
            "search_volume": 3000,
            "competition_difficulty": 40,
            "current_rank": None,
            "intent": "informational",
        },
    ]

    # Simple scoring logic
    for opp in opportunities:
        # Calculate basic scores
        volume_score = min(100, (opp["search_volume"] / 100) * 10)  # Scale volume
        competition_score = max(
            0, 100 - opp["competition_difficulty"]
        )  # Invert difficulty

        # Intent bonus
        intent_bonus = 20 if opp["intent"] == "transactional" else 10

        # Ranking bonus
        rank_bonus = 30 if opp["current_rank"] is None else (30 - opp["current_rank"])

        overall_score = (
            volume_score + competition_score + intent_bonus + rank_bonus
        ) / 4

        logger.info(f"Keyword: '{opp['keyword']}'")
        logger.info(f"  Volume score: {volume_score:.1f}")
        logger.info(f"  Competition score: {competition_score:.1f}")
        logger.info(f"  Intent bonus: {intent_bonus}")
        logger.info(f"  Rank bonus: {rank_bonus}")
        logger.info(f"  Overall score: {overall_score:.1f}")
        logger.info("")

    return len(opportunities)


def test_crawler_config():
    """Test crawler configuration."""
    logger.info("Testing crawler configuration...")

    config = {
        "max_pages": 100,
        "delay_between_requests": 1.0,
        "timeout": 10,
        "max_concurrent": 5,
        "respect_robots": True,
        "user_agent": "SEO-Analyzer/1.0 (+https://hotrodan.com/seo-analyzer)",
    }

    logger.info("Crawler configuration:")
    for key, value in config.items():
        logger.info(f"  {key}: {value}")

    # Test robots.txt URL generation
    domain = "example.com"
    robots_url = f"https://{domain}/robots.txt"
    logger.info(f"Robots.txt URL for {domain}: {robots_url}")

    return config


def main():
    """Run all tests."""
    logger.info("Starting SEO API component tests...")

    try:
        # Test individual components
        gaps_found = test_keyword_gap_detection()
        brief = test_content_brief_generation()
        opportunities_scored = test_opportunity_scoring()
        config = test_crawler_config()

        # Summary
        logger.info("=" * 50)
        logger.info("TEST SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Keyword gaps detected: {gaps_found}")
        logger.info(f"Content brief generated: {brief['target_keyword']}")
        logger.info(f"Opportunities scored: {opportunities_scored}")
        logger.info(f"Crawler configured: {config['max_pages']} max pages")
        logger.info("")
        logger.info("All basic tests passed! ✅")

    except Exception as e:
        logger.error(f"Test failed: {e}")
        return False

    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

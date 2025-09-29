from __future__ import annotations
import json
import re
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Set
from datetime import datetime


@dataclass
class Entity:
    name: str
    type: str  # person, organization, location, concept, etc.
    relevance_score: float
    mentions: int


@dataclass
class HeaderStructure:
    h1: str
    h2s: List[str]
    h3s: List[str]
    suggested_headers: List[str]


@dataclass
class FAQ:
    question: str
    answer: str
    keyword_density: float
    search_intent: str  # informational, navigational, transactional


@dataclass
class ContentBrief:
    topic: str
    target_keyword: str
    entities: List[Entity]
    header_structure: HeaderStructure
    faqs: List[FAQ]
    word_count_target: int
    readability_score: float
    semantic_keywords: List[str]
    competitor_insights: List[str]
    content_gaps: List[str]
    generated_at: datetime


class ContentBriefsGenerator:
    def __init__(self):
        self.entity_patterns = {
            "person": r"\b[A-Z][a-z]+ [A-Z][a-z]+\b",
            "organization": r"\b[A-Z][a-z]+ (Inc|Corp|LLC|Ltd|Company|Group|Systems|Technologies)\b",
            "location": r"\b[A-Z][a-z]+(?: [A-Z][a-z]+)* (?:City|State|Country|Region|Area)\b",
            "concept": r"\b(?:AI|SEO|API|CRM|SaaS|B2B|B2C|ROI|KPI|CTR|CVR)\b"
        }
        
        self.header_templates = {
            "how_to": ["What is {topic}?", "How to {action}", "Step-by-Step Guide", "Best Practices", "Common Mistakes", "Tools and Resources"],
            "comparison": ["{topic} vs {alternative}", "Key Differences", "Pros and Cons", "Which is Better?", "Use Cases", "Pricing Comparison"],
            "review": ["Overview", "Features", "Pricing", "Pros and Cons", "Alternatives", "Final Verdict"],
            "guide": ["Introduction", "Getting Started", "Advanced Techniques", "Tips and Tricks", "Troubleshooting", "Conclusion"]
        }
        
        self.faq_templates = [
            "What is {topic}?",
            "How does {topic} work?",
            "What are the benefits of {topic}?",
            "How much does {topic} cost?",
            "Is {topic} worth it?",
            "What are the alternatives to {topic}?",
            "How do I get started with {topic}?",
            "What are the common problems with {topic}?"
        ]

    def extract_entities(self, text: str) -> List[Entity]:
        """Extract entities from text using pattern matching."""
        entities = []
        entity_counts = {}
        
        for entity_type, pattern in self.entity_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                entity_name = match if isinstance(match, str) else match[0]
                entity_counts[entity_name] = entity_counts.get(entity_name, 0) + 1
        
        for entity_name, mentions in entity_counts.items():
            # Simple relevance scoring based on mentions and length
            relevance_score = min(1.0, mentions * 0.2 + len(entity_name.split()) * 0.1)
            entities.append(Entity(
                name=entity_name,
                type=self._classify_entity_type(entity_name),
                relevance_score=relevance_score,
                mentions=mentions
            ))
        
        return sorted(entities, key=lambda e: e.relevance_score, reverse=True)

    def _classify_entity_type(self, entity_name: str) -> str:
        """Classify entity type based on name patterns."""
        if re.search(r"\b(?:Inc|Corp|LLC|Ltd|Company|Group|Systems|Technologies)\b", entity_name):
            return "organization"
        elif re.search(r"\b(?:City|State|Country|Region|Area)\b", entity_name):
            return "location"
        elif re.search(r"\b(?:AI|SEO|API|CRM|SaaS|B2B|B2C|ROI|KPI|CTR|CVR)\b", entity_name):
            return "concept"
        elif re.search(r"\b[A-Z][a-z]+ [A-Z][a-z]+\b", entity_name):
            return "person"
        else:
            return "concept"

    def generate_header_structure(self, topic: str, content_type: str = "guide") -> HeaderStructure:
        """Generate header structure based on topic and content type."""
        templates = self.header_templates.get(content_type, self.header_templates["guide"])
        
        h1 = f"Complete Guide to {topic}"
        h2s = []
        h3s = []
        suggested_headers = []
        
        for template in templates[:4]:  # Limit to 4 main H2s
            header = template.format(topic=topic, action=topic.lower())
            h2s.append(header)
            
            # Generate H3s for each H2
            if "What is" in header:
                h3s.extend([f"Definition of {topic}", f"Key Features of {topic}", f"Benefits of {topic}"])
            elif "How to" in header:
                h3s.extend([f"Prerequisites", f"Step 1: Planning", f"Step 2: Implementation", f"Step 3: Testing"])
            elif "Best Practices" in header:
                h3s.extend([f"Dos

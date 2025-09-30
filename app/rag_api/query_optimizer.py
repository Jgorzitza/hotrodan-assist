"""Advanced query optimization and routing for RAG API."""

import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class QueryComplexity(Enum):
    """Query complexity levels."""
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    VERY_COMPLEX = "very_complex"


class QueryIntent(Enum):
    """Query intent types."""
    FACTUAL = "factual"
    COMPARISON = "comparison"
    TROUBLESHOOTING = "troubleshooting"
    HOW_TO = "how_to"
    EXPLANATION = "explanation"
    RECOMMENDATION = "recommendation"


@dataclass
class QueryAnalysis:
    """Comprehensive query analysis result."""
    complexity: QueryComplexity
    intent: QueryIntent
    keywords: List[str]
    entities: List[str]
    recommended_top_k: int
    recommended_provider: Optional[str]
    confidence: float
    reasoning: str


class QueryOptimizer:
    """Advanced query optimization with intent detection and routing."""
    
    def __init__(self):
        # Intent patterns
        self.intent_patterns = {
            QueryIntent.FACTUAL: [
                r'\bwhat is\b', r'\bdefine\b', r'\bwho\b', r'\bwhen\b', r'\bwhere\b'
            ],
            QueryIntent.COMPARISON: [
                r'\bvs\b', r'\bversus\b', r'\bdifference between\b', r'\bcompare\b',
                r'\bbetter\b', r'\bworse\b'
            ],
            QueryIntent.TROUBLESHOOTING: [
                r'\bproblem\b', r'\bissue\b', r'\berror\b', r'\bfail\b', r'\bnot working\b',
                r'\bwon\'?t\b', r'\bcan\'?t\b', r'\bdoesn\'?t\b', r'\bwrong\b', r'\bdropping\b'
            ],
            QueryIntent.HOW_TO: [
                r'\bhow to\b', r'\bhow do\b', r'\bhow can\b', r'\bsteps\b', r'\bguide\b', r'\binstall\b'
            ],
            QueryIntent.EXPLANATION: [
                r'\bwhy\b', r'\bexplain\b', r'\breason\b', r'\bcause\b', r'\bwork\b'
            ],
            QueryIntent.RECOMMENDATION: [
                r'\brecommend\b', r'\bsuggest\b', r'\bshould\b', r'\bbest\b', r'\bideal\b'
            ]
        }
    
    def analyze_query(self, question: str) -> QueryAnalysis:
        """Perform comprehensive query analysis."""
        question_lower = question.lower()
        
        # Detect intent
        intent = self._detect_intent(question_lower)
        
        # Calculate complexity
        complexity = self._calculate_complexity(question_lower)
        
        # Extract keywords
        keywords = self._extract_keywords(question_lower)
        entities = self._extract_entities(question)
        
        # Recommend parameters
        recommended_top_k = self._recommend_top_k(complexity, intent)
        recommended_provider = self._recommend_provider(complexity, intent)
        
        # Calculate confidence
        confidence = 0.8  # Simplified confidence
        
        # Generate reasoning
        reasoning = f"Query classified as {intent.value} with {complexity.value} complexity. Key terms: {', '.join(keywords[:5])}"
        
        return QueryAnalysis(
            complexity=complexity,
            intent=intent,
            keywords=keywords,
            entities=entities,
            recommended_top_k=recommended_top_k,
            recommended_provider=recommended_provider,
            confidence=confidence,
            reasoning=reasoning
        )
    
    def _detect_intent(self, question: str) -> QueryIntent:
        """Detect query intent from patterns."""
        scores = {}
        
        for intent, patterns in self.intent_patterns.items():
            score = sum(1 for pattern in patterns if re.search(pattern, question))
            if score > 0:
                scores[intent] = score
        
        if scores:
            return max(scores.items(), key=lambda x: x[1])[0]
        
        return QueryIntent.EXPLANATION
    
    def _calculate_complexity(self, question: str) -> QueryComplexity:
        """Calculate query complexity."""
        word_count = len(question.split())
        
        if word_count > 20:
            return QueryComplexity.VERY_COMPLEX
        elif word_count > 10:
            return QueryComplexity.COMPLEX
        elif word_count > 5:
            return QueryComplexity.MODERATE
        return QueryComplexity.SIMPLE
    
    def _extract_keywords(self, question: str) -> List[str]:
        """Extract relevant keywords from question."""
        words = question.split()
        stop_words = {'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 
                     'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                     'would', 'should', 'can', 'could', 'may', 'might', 'must',
                     'what', 'when', 'where', 'why', 'how', 'which', 'who', 'whom'}
        
        keywords = [
            word.strip('.,!?;:') 
            for word in words 
            if word.lower() not in stop_words and len(word) > 2
        ]
        
        return keywords[:10]
    
    def _extract_entities(self, question: str) -> List[str]:
        """Extract named entities."""
        entities = []
        
        # Extract capitalized words
        words = question.split()
        for word in words:
            if word and word[0].isupper() and len(word) > 1:
                entities.append(word.strip('.,!?;:'))
        
        return entities
    
    def _recommend_top_k(self, complexity: QueryComplexity, intent: QueryIntent) -> int:
        """Recommend optimal top_k."""
        base_k = 10
        
        if complexity == QueryComplexity.VERY_COMPLEX:
            base_k = 20
        elif complexity == QueryComplexity.COMPLEX:
            base_k = 15
        
        if intent in [QueryIntent.TROUBLESHOOTING, QueryIntent.COMPARISON]:
            base_k = int(base_k * 1.5)
        
        return min(base_k, 50)
    
    def _recommend_provider(self, complexity: QueryComplexity, intent: QueryIntent) -> Optional[str]:
        """Recommend optimal provider."""
        if complexity in [QueryComplexity.COMPLEX, QueryComplexity.VERY_COMPLEX]:
            return "openai"
        
        if intent == QueryIntent.TROUBLESHOOTING:
            return "openai"
        
        return None


# Global optimizer instance
QUERY_OPTIMIZER = QueryOptimizer()

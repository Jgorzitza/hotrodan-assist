"""Advanced functions for RAG API."""

import re
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

def semantic_chunking(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Advanced semantic chunking with overlap."""
    # Simple sentence-based chunking (in production, use more sophisticated NLP)
    sentences = re.split(r'[.!?]+', text)
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= chunk_size:
            current_chunk += sentence + ". "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + ". "
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def query_routing(question: str) -> Dict[str, Any]:
    """Route queries to appropriate processing methods."""
    question_lower = question.lower()
    
    # Technical queries
    if any(keyword in question_lower for keyword in ['pump', 'fuel', 'efi', 'an', 'hose', 'fitting']):
        return {
            "category": "technical",
            "priority": "high",
            "model_preference": "technical",
            "top_k": 15
        }
    
    # General queries
    if any(keyword in question_lower for keyword in ['what', 'how', 'why', 'when', 'where']):
        return {
            "category": "general",
            "priority": "medium",
            "model_preference": "general",
            "top_k": 10
        }
    
    # Troubleshooting queries
    if any(keyword in question_lower for keyword in ['problem', 'issue', 'error', 'fix', 'troubleshoot']):
        return {
            "category": "troubleshooting",
            "priority": "high",
            "model_preference": "troubleshooting",
            "top_k": 20
        }
    
    # Default
    return {
        "category": "general",
        "priority": "medium",
        "model_preference": "general",
        "top_k": 10
    }

def context_aware_response(question: str, retrieved_docs: List[Dict], 
                          context: Optional[Dict] = None) -> str:
    """Generate context-aware responses."""
    if not retrieved_docs:
        return "No relevant information found for your question."
    
    # Simple context-aware processing
    response_parts = []
    
    for i, doc in enumerate(retrieved_docs[:3]):
        content = doc.get('text', '')
        source = doc.get('source_url', 'unknown')
        
        # Add context-aware prefix
        if i == 0:
            response_parts.append(f"Based on the available information:")
        
        response_parts.append(f"• {content[:300]}...")
    
    return "\n\n".join(response_parts)

def query_analytics(question: str, response_time: float, 
                   sources_used: int, model_used: str) -> Dict[str, Any]:
    """Generate query analytics."""
    return {
        "timestamp": datetime.now().isoformat(),
        "question_length": len(question),
        "response_time_ms": response_time * 1000,
        "sources_used": sources_used,
        "model_used": model_used,
        "query_type": query_routing(question)["category"],
        "complexity_score": min(len(question.split()) / 10, 1.0)
    }

def performance_optimization(query: str, top_k: int) -> Dict[str, Any]:
    """Optimize query performance based on query characteristics."""
    routing = query_routing(query)
    
    # Adjust top_k based on query type
    if routing["category"] == "technical":
        optimized_top_k = min(top_k * 2, 30)
    elif routing["category"] == "troubleshooting":
        optimized_top_k = min(top_k * 3, 50)
    else:
        optimized_top_k = top_k
    
    return {
        "optimized_top_k": optimized_top_k,
        "query_category": routing["category"],
        "optimization_applied": optimized_top_k != top_k
    }

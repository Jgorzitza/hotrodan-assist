#!/usr/bin/env python3
"""
Optimized Query Router for Inventory Intelligence
High-performance query processing with parallel execution and intelligent caching
Designed for 1000+ SKU production environments
"""

import os
import sys
import re
import pathlib
import yaml
import chromadb
import asyncio
import time
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from textwrap import shorten
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta

from chromadb.config import Settings as ChromaSettings
from llama_index.core import StorageContext, load_index_from_storage, Settings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.openai import OpenAI

from rag_config import (
    CHROMA_PATH,
    COLLECTION,
    INDEX_ID,
    PERSIST_DIR,
    configure_settings,
)
from router_config import ESCALATE_KEYWORDS, LEN_THRESHOLD

# Performance configuration
@dataclass
class PerformanceConfig:
    max_workers: int = 8
    cache_size: int = 1000
    cache_ttl: int = 300  # 5 minutes
    batch_size: int = 100
    enable_parallel: bool = True
    enable_caching: bool = True

# Cache entry for storing query results
@dataclass
class CacheEntry:
    result: Any
    timestamp: float
    ttl: float

class OptimizedQueryRouter:
    """
    High-performance query router with parallel processing and intelligent caching
    """
    
    def __init__(self, config: PerformanceConfig = None):
        self.config = config or PerformanceConfig()
        self.cache: Dict[str, CacheEntry] = {}
        self.performance_metrics = {
            'total_queries': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'parallel_queries': 0,
            'avg_response_time': 0.0,
            'total_processing_time': 0.0
        }
        
        # Initialize ChromaDB and LLaMA Index
        self._initialize_components()
        
    def _initialize_components(self):
        """Initialize ChromaDB and LLaMA Index components"""
        try:
            # Configure ChromaDB
            chroma_settings = ChromaSettings(
                persist_directory=CHROMA_PATH,
                anonymized_telemetry=False
            )
            
            # Initialize ChromaDB client
            self.chroma_client = chromadb.PersistentClient(
                path=CHROMA_PATH,
                settings=chroma_settings
            )
            
            # Get or create collection
            self.collection = self.chroma_client.get_or_create_collection(
                name=COLLECTION
            )
            
            # Initialize LLaMA Index
            configure_settings()
            self.vector_store = ChromaVectorStore(chroma_collection=self.collection)
            self.storage_context = StorageContext.from_defaults(
                vector_store=self.vector_store
            )
            
            # Load index
            self.index = load_index_from_storage(
                storage_context=self.storage_context,
                index_id=INDEX_ID
            )
            
            print(f"✅ OptimizedQueryRouter initialized with {self.config.max_workers} workers")
            
        except Exception as e:
            print(f"❌ Error initializing components: {e}")
            raise
    
    def _get_cache_key(self, query: str, context: Dict = None) -> str:
        """Generate cache key for query"""
        context_str = json.dumps(context or {}, sort_keys=True)
        return f"{hash(query)}_{hash(context_str)}"
    
    def _is_cache_valid(self, entry: CacheEntry) -> bool:
        """Check if cache entry is still valid"""
        return time.time() - entry.timestamp < entry.ttl
    
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get result from cache if valid"""
        if not self.config.enable_caching:
            return None
            
        entry = self.cache.get(key)
        if entry and self._is_cache_valid(entry):
            self.performance_metrics['cache_hits'] += 1
            return entry.result
        
        if entry:
            # Remove expired entry
            del self.cache[key]
        
        self.performance_metrics['cache_misses'] += 1
        return None
    
    def _set_cache(self, key: str, result: Any, ttl: float = None):
        """Store result in cache"""
        if not self.config.enable_caching:
            return
            
        ttl = ttl or self.config.cache_ttl
        
        # Remove oldest entries if cache is full
        if len(self.cache) >= self.config.cache_size:
            oldest_key = min(self.cache.keys(), 
                           key=lambda k: self.cache[k].timestamp)
            del self.cache[oldest_key]
        
        self.cache[key] = CacheEntry(
            result=result,
            timestamp=time.time(),
            ttl=ttl
        )
    
    def _choose_model(self, question: str) -> OpenAI:
        """Choose appropriate model based on question complexity"""
        q = question.lower()
        long_q = len(q) >= LEN_THRESHOLD
        keyword_hit = any(k in q for k in ESCALATE_KEYWORDS)
        
        model_name = "gpt-4o" if (long_q or keyword_hit) else "gpt-4o-mini"
        return OpenAI(model=model_name, temperature=0.2)
    
    def _process_single_query(self, query: str, context: Dict = None) -> Dict[str, Any]:
        """Process a single query with performance tracking"""
        start_time = time.time()
        
        try:
            # Choose model
            llm = self._choose_model(query)
            
            # Create query engine
            query_engine = self.index.as_query_engine(
                llm=llm,
                similarity_top_k=5,
                response_mode="compact"
            )
            
            # Execute query
            response = query_engine.query(query)
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            return {
                'query': query,
                'response': str(response),
                'processing_time': processing_time,
                'model_used': llm.model,
                'context': context,
                'success': True,
                'error': None
            }
            
        except Exception as e:
            processing_time = time.time() - start_time
            return {
                'query': query,
                'response': None,
                'processing_time': processing_time,
                'model_used': None,
                'context': context,
                'success': False,
                'error': str(e)
            }
    
    def query(self, question: str, context: Dict = None) -> Dict[str, Any]:
        """
        Process a single query with caching and performance tracking
        """
        start_time = time.time()
        
        # Check cache first
        cache_key = self._get_cache_key(question, context)
        cached_result = self._get_from_cache(cache_key)
        
        if cached_result:
            self.performance_metrics['total_queries'] += 1
            return cached_result
        
        # Process query
        result = self._process_single_query(question, context)
        
        # Cache successful results
        if result['success']:
            self._set_cache(cache_key, result)
        
        # Update metrics
        self.performance_metrics['total_queries'] += 1
        self.performance_metrics['total_processing_time'] += result['processing_time']
        self.performance_metrics['avg_response_time'] = (
            self.performance_metrics['total_processing_time'] / 
            self.performance_metrics['total_queries']
        )
        
        return result
    
    def batch_query(self, questions: List[str], contexts: List[Dict] = None) -> List[Dict[str, Any]]:
        """
        Process multiple queries in parallel for maximum performance
        """
        if not self.config.enable_parallel or len(questions) == 1:
            # Process sequentially
            contexts = contexts or [{}] * len(questions)
            return [self.query(q, c) for q, c in zip(questions, contexts)]
        
        start_time = time.time()
        results = []
        
        # Prepare query data
        contexts = contexts or [{}] * len(questions)
        query_data = list(zip(questions, contexts))
        
        # Process in parallel
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            # Submit all queries
            future_to_query = {
                executor.submit(self._process_single_query, query, context): (query, context)
                for query, context in query_data
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_query):
                query, context = future_to_query[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    results.append({
                        'query': query,
                        'response': None,
                        'processing_time': 0,
                        'model_used': None,
                        'context': context,
                        'success': False,
                        'error': str(e)
                    })
        
        # Update metrics
        total_time = time.time() - start_time
        self.performance_metrics['parallel_queries'] += len(questions)
        
        print(f"✅ Processed {len(questions)} queries in {total_time:.2f}s "
              f"({len(questions)/total_time:.1f} queries/sec)")
        
        return results
    
    def inventory_query(self, sku_ids: List[str], query_type: str = "analysis") -> Dict[str, Any]:
        """
        Specialized query for inventory analysis with optimized processing
        """
        start_time = time.time()
        
        # Build inventory-specific query
        if query_type == "analysis":
            question = f"Analyze inventory for SKUs: {', '.join(sku_ids[:10])}"
            if len(sku_ids) > 10:
                question += f" and {len(sku_ids) - 10} more SKUs"
        elif query_type == "reorder":
            question = f"Calculate reorder points for SKUs: {', '.join(sku_ids[:10])}"
        elif query_type == "forecast":
            question = f"Generate demand forecast for SKUs: {', '.join(sku_ids[:10])}"
        else:
            question = f"Process inventory query for SKUs: {', '.join(sku_ids[:10])}"
        
        # Process with inventory context
        context = {
            'sku_ids': sku_ids,
            'query_type': query_type,
            'timestamp': datetime.now().isoformat(),
            'batch_size': len(sku_ids)
        }
        
        result = self.query(question, context)
        
        # Add inventory-specific metrics
        result['inventory_metrics'] = {
            'sku_count': len(sku_ids),
            'processing_time': time.time() - start_time,
            'query_type': query_type
        }
        
        return result
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        cache_hit_rate = (
            self.performance_metrics['cache_hits'] / 
            max(self.performance_metrics['total_queries'], 1) * 100
        )
        
        return {
            **self.performance_metrics,
            'cache_hit_rate': cache_hit_rate,
            'cache_size': len(self.cache),
            'max_workers': self.config.max_workers,
            'parallel_efficiency': (
                self.performance_metrics['parallel_queries'] / 
                max(self.performance_metrics['total_queries'], 1) * 100
            )
        }
    
    def clear_cache(self):
        """Clear the query cache"""
        self.cache.clear()
        print("✅ Query cache cleared")
    
    def optimize_for_inventory(self, sku_count: int):
        """
        Optimize configuration for inventory workloads
        """
        if sku_count > 1000:
            self.config.max_workers = min(16, sku_count // 100)
            self.config.cache_size = min(5000, sku_count * 2)
            self.config.batch_size = min(200, sku_count // 10)
        elif sku_count > 500:
            self.config.max_workers = min(8, sku_count // 50)
            self.config.cache_size = min(2000, sku_count * 2)
            self.config.batch_size = min(100, sku_count // 5)
        
        print(f"✅ Optimized for {sku_count} SKUs: "
              f"{self.config.max_workers} workers, "
              f"{self.config.cache_size} cache size, "
              f"{self.config.batch_size} batch size")

# Legacy compatibility functions
def pick_model(name: str, temperature=0.2):
    return OpenAI(model=name, temperature=temperature)

def choose_model(question: str):
    q = question.lower()
    long_q = len(q) >= LEN_THRESHOLD
    keyword_hit = any(k in q for k in ESCALATE_KEYWORDS)
    return pick_model("gpt-4o" if (long_q or keyword_hit) else "gpt-4o-mini")

# Main execution
if __name__ == "__main__":
    # Example usage
    router = OptimizedQueryRouter()
    
    # Test single query
    result = router.query("What is the current inventory status?")
    print(f"Query result: {result['response'][:100]}...")
    
    # Test batch queries
    questions = [
        "What are the top selling products?",
        "Which products need reordering?",
        "What is the demand forecast for next month?"
    ]
    
    batch_results = router.batch_query(questions)
    print(f"Processed {len(batch_results)} queries in batch")
    
    # Test inventory query
    inventory_result = router.inventory_query(
        sku_ids=["SKU001", "SKU002", "SKU003"],
        query_type="analysis"
    )
    print(f"Inventory analysis: {inventory_result['inventory_metrics']}")
    
    # Show performance metrics
    metrics = router.get_performance_metrics()
    print(f"Performance metrics: {json.dumps(metrics, indent=2)}")

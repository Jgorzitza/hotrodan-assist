#!/usr/bin/env python3
"""
MCP Inventory Integration Layer
Optimized integration with MCP connectors for live data
Supports Shopify, GA4, GSC, Bing, and Zoho data sources
"""

import os
import sys
import time
import json
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class McpConfig:
    """MCP connector configuration"""
    connectors_api_url: str = "http://localhost:8003"
    use_mock_data: bool = True
    enable_mcp: bool = True
    timeout: int = 30
    max_retries: int = 3
    retry_delay: float = 1.0

@dataclass
class ShopifyProduct:
    """Shopify product data structure"""
    id: str
    title: str
    sku: str
    inventory_quantity: int
    price: float
    vendor: str
    product_type: str
    tags: List[str]
    created_at: str
    updated_at: str

@dataclass
class GoogleAnalyticsData:
    """Google Analytics data structure"""
    date: str
    sessions: int
    page_views: int
    bounce_rate: float
    conversion_rate: float
    revenue: float
    transactions: int

@dataclass
class SearchConsoleData:
    """Search Console data structure"""
    query: str
    page: str
    clicks: int
    impressions: int
    ctr: float
    position: float
    date: str

@dataclass
class InventorySignal:
    """Unified inventory signal from multiple sources"""
    sku_id: str
    sku: str
    source: str  # "shopify", "ga4", "gsc", "bing", "zoho"
    signal_type: str  # "sales", "traffic", "search", "email"
    value: float
    confidence: float
    timestamp: str
    metadata: Dict[str, Any]

class McpInventoryIntegration:
    """
    High-performance MCP integration for inventory intelligence
    """
    
    def __init__(self, config: McpConfig = None):
        self.config = config or McpConfig()
        self.session: Optional[aiohttp.ClientSession] = None
        self.cache: Dict[str, Any] = {}
        self.performance_metrics = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'avg_response_time': 0.0,
            'total_processing_time': 0.0
        }
        
        # Load configuration from environment
        self._load_config()
    
    def _load_config(self):
        """Load configuration from environment variables"""
        self.config.connectors_api_url = os.getenv('CONNECTORS_API_URL', self.config.connectors_api_url)
        self.config.use_mock_data = os.getenv('USE_MOCK_DATA', 'true').lower() == 'true'
        self.config.enable_mcp = os.getenv('ENABLE_MCP', 'true').lower() == 'true'
        
        logger.info(f"MCP Integration configured: {self.config.connectors_api_url}, "
                   f"Mock: {self.config.use_mock_data}, MCP: {self.config.enable_mcp}")
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=self.config.timeout)
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session
    
    async def _close_session(self):
        """Close aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    def _get_cache_key(self, endpoint: str, params: Dict = None) -> str:
        """Generate cache key for request"""
        params_str = json.dumps(params or {}, sort_keys=True)
        return f"{endpoint}_{hash(params_str)}"
    
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get result from cache"""
        if key in self.cache:
            self.performance_metrics['cache_hits'] += 1
            return self.cache[key]
        
        self.performance_metrics['cache_misses'] += 1
        return None
    
    def _set_cache(self, key: str, result: Any, ttl: int = 300):
        """Store result in cache"""
        self.cache[key] = {
            'data': result,
            'timestamp': time.time(),
            'ttl': ttl
        }
    
    def _is_cache_valid(self, entry: Dict) -> bool:
        """Check if cache entry is valid"""
        return time.time() - entry['timestamp'] < entry['ttl']
    
    async def _make_request(self, endpoint: str, params: Dict = None, use_cache: bool = True) -> Dict[str, Any]:
        """Make HTTP request to MCP connector"""
        start_time = time.time()
        
        # Check cache first
        if use_cache:
            cache_key = self._get_cache_key(endpoint, params)
            cached_result = self._get_from_cache(cache_key)
            if cached_result and self._is_cache_valid(cached_result):
                return cached_result['data']
        
        try:
            session = await self._get_session()
            url = f"{self.config.connectors_api_url}/{endpoint.lstrip('/')}"
            
            # Make request with retries
            for attempt in range(self.config.max_retries):
                try:
                    async with session.get(url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            
                            # Cache successful results
                            if use_cache:
                                self._set_cache(cache_key, data)
                            
                            # Update metrics
                            processing_time = time.time() - start_time
                            self.performance_metrics['total_requests'] += 1
                            self.performance_metrics['successful_requests'] += 1
                            self.performance_metrics['total_processing_time'] += processing_time
                            self.performance_metrics['avg_response_time'] = (
                                self.performance_metrics['total_processing_time'] / 
                                self.performance_metrics['total_requests']
                            )
                            
                            return data
                        else:
                            logger.warning(f"Request failed with status {response.status}")
                            
                except asyncio.TimeoutError:
                    logger.warning(f"Request timeout on attempt {attempt + 1}")
                    if attempt < self.config.max_retries - 1:
                        await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                    else:
                        raise
                except Exception as e:
                    logger.warning(f"Request error on attempt {attempt + 1}: {e}")
                    if attempt < self.config.max_retries - 1:
                        await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                    else:
                        raise
            
        except Exception as e:
            logger.error(f"Failed to make request to {endpoint}: {e}")
            self.performance_metrics['total_requests'] += 1
            self.performance_metrics['failed_requests'] += 1
            
            # Return mock data if MCP is disabled or request fails
            if self.config.use_mock_data:
                return self._get_mock_data(endpoint, params)
            
            raise
    
    def _get_mock_data(self, endpoint: str, params: Dict = None) -> Dict[str, Any]:
        """Get mock data for testing/fallback"""
        mock_data = {
            'shopify/products': {
                'products': [
                    {
                        'id': f'prod_{i}',
                        'title': f'Mock Product {i}',
                        'sku': f'MOCK{i:03d}',
                        'inventory_quantity': 100 - i,
                        'price': 10.0 + i,
                        'vendor': f'Mock Vendor {i % 5}',
                        'product_type': 'Mock Type',
                        'tags': ['mock', 'test'],
                        'created_at': '2024-01-01T00:00:00Z',
                        'updated_at': '2024-01-01T00:00:00Z'
                    }
                    for i in range(10)
                ]
            },
            'ga4/traffic-summary': {
                'sessions': 1000,
                'page_views': 5000,
                'bounce_rate': 0.3,
                'conversion_rate': 0.05,
                'revenue': 5000.0,
                'transactions': 50
            },
            'gsc/search-queries': {
                'queries': [
                    {
                        'query': f'mock query {i}',
                        'page': f'/mock-page-{i}',
                        'clicks': 10 + i,
                        'impressions': 100 + i * 10,
                        'ctr': 0.1,
                        'position': 5.0 + i,
                        'date': '2024-01-01'
                    }
                    for i in range(10)
                ]
            }
        }
        
        return mock_data.get(endpoint, {'data': [], 'message': 'Mock data not available'})
    
    async def get_shopify_products(self, limit: int = 100, page: int = 1) -> List[ShopifyProduct]:
        """Get products from Shopify"""
        try:
            data = await self._make_request('shopify/products', {
                'limit': limit,
                'page': page
            })
            
            products = []
            for product_data in data.get('products', []):
                product = ShopifyProduct(
                    id=str(product_data.get('id', '')),
                    title=product_data.get('title', ''),
                    sku=product_data.get('sku', ''),
                    inventory_quantity=product_data.get('inventory_quantity', 0),
                    price=float(product_data.get('price', 0)),
                    vendor=product_data.get('vendor', ''),
                    product_type=product_data.get('product_type', ''),
                    tags=product_data.get('tags', []),
                    created_at=product_data.get('created_at', ''),
                    updated_at=product_data.get('updated_at', '')
                )
                products.append(product)
            
            return products
            
        except Exception as e:
            logger.error(f"Failed to get Shopify products: {e}")
            return []
    
    async def get_ga4_traffic_data(self, start_date: str, end_date: str) -> GoogleAnalyticsData:
        """Get Google Analytics traffic data"""
        try:
            data = await self._make_request('ga4/traffic-summary', {
                'start_date': start_date,
                'end_date': end_date
            })
            
            return GoogleAnalyticsData(
                date=start_date,
                sessions=data.get('sessions', 0),
                page_views=data.get('page_views', 0),
                bounce_rate=data.get('bounce_rate', 0.0),
                conversion_rate=data.get('conversion_rate', 0.0),
                revenue=data.get('revenue', 0.0),
                transactions=data.get('transactions', 0)
            )
            
        except Exception as e:
            logger.error(f"Failed to get GA4 data: {e}")
            return GoogleAnalyticsData(
                date=start_date,
                sessions=0,
                page_views=0,
                bounce_rate=0.0,
                conversion_rate=0.0,
                revenue=0.0,
                transactions=0
            )
    
    async def get_search_console_data(self, start_date: str, end_date: str) -> List[SearchConsoleData]:
        """Get Search Console data"""
        try:
            data = await self._make_request('gsc/search-queries', {
                'start_date': start_date,
                'end_date': end_date
            })
            
            queries = []
            for query_data in data.get('queries', []):
                query = SearchConsoleData(
                    query=query_data.get('query', ''),
                    page=query_data.get('page', ''),
                    clicks=query_data.get('clicks', 0),
                    impressions=query_data.get('impressions', 0),
                    ctr=query_data.get('ctr', 0.0),
                    position=query_data.get('position', 0.0),
                    date=query_data.get('date', start_date)
                )
                queries.append(query)
            
            return queries
            
        except Exception as e:
            logger.error(f"Failed to get Search Console data: {e}")
            return []
    
    async def get_inventory_signals(self, sku_ids: List[str]) -> List[InventorySignal]:
        """Get unified inventory signals from all sources"""
        signals = []
        
        # Get data from all sources in parallel
        tasks = [
            self.get_shopify_products(),
            self.get_ga4_traffic_data('2024-01-01', '2024-01-31'),
            self.get_search_console_data('2024-01-01', '2024-01-31')
        ]
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process Shopify products
            if not isinstance(results[0], Exception):
                products = results[0]
                for product in products:
                    if product.sku in sku_ids:
                        signal = InventorySignal(
                            sku_id=product.sku,
                            sku=product.title,
                            source='shopify',
                            signal_type='inventory',
                            value=product.inventory_quantity,
                            confidence=0.9,
                            timestamp=product.updated_at,
                            metadata={
                                'price': product.price,
                                'vendor': product.vendor,
                                'product_type': product.product_type
                            }
                        )
                        signals.append(signal)
            
            # Process GA4 data
            if not isinstance(results[1], Exception):
                ga4_data = results[1]
                signal = InventorySignal(
                    sku_id='overall',
                    sku='Overall Traffic',
                    source='ga4',
                    signal_type='traffic',
                    value=ga4_data.sessions,
                    confidence=0.8,
                    timestamp=ga4_data.date,
                    metadata={
                        'page_views': ga4_data.page_views,
                        'bounce_rate': ga4_data.bounce_rate,
                        'conversion_rate': ga4_data.conversion_rate,
                        'revenue': ga4_data.revenue
                    }
                )
                signals.append(signal)
            
            # Process Search Console data
            if not isinstance(results[2], Exception):
                gsc_data = results[2]
                for query in gsc_data:
                    signal = InventorySignal(
                        sku_id='search',
                        sku=query.query,
                        source='gsc',
                        signal_type='search',
                        value=query.clicks,
                        confidence=0.7,
                        timestamp=query.date,
                        metadata={
                            'impressions': query.impressions,
                            'ctr': query.ctr,
                            'position': query.position,
                            'page': query.page
                        }
                    )
                    signals.append(signal)
            
        except Exception as e:
            logger.error(f"Failed to get inventory signals: {e}")
        
        return signals
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics"""
        success_rate = (
            self.performance_metrics['successful_requests'] / 
            max(self.performance_metrics['total_requests'], 1) * 100
        )
        
        cache_hit_rate = (
            self.performance_metrics['cache_hits'] / 
            max(self.performance_metrics['total_requests'], 1) * 100
        )
        
        return {
            **self.performance_metrics,
            'success_rate': success_rate,
            'cache_hit_rate': cache_hit_rate,
            'cache_size': len(self.cache)
        }
    
    async def close(self):
        """Close the integration and cleanup resources"""
        await self._close_session()
        logger.info("MCP Inventory Integration closed")

# Example usage
async def main():
    """Example usage of MCP Inventory Integration"""
    integration = McpInventoryIntegration()
    
    try:
        # Get inventory signals
        sku_ids = ['MOCK001', 'MOCK002', 'MOCK003']
        signals = await integration.get_inventory_signals(sku_ids)
        
        print(f"📊 Retrieved {len(signals)} inventory signals")
        for signal in signals[:5]:  # Show first 5
            print(f"  {signal.source}: {signal.sku} = {signal.value} (confidence: {signal.confidence})")
        
        # Get performance metrics
        metrics = integration.get_performance_metrics()
        print(f"\n⚡ Performance Metrics:")
        print(f"  Success rate: {metrics['success_rate']:.1f}%")
        print(f"  Cache hit rate: {metrics['cache_hit_rate']:.1f}%")
        print(f"  Avg response time: {metrics['avg_response_time']:.3f}s")
        
    finally:
        await integration.close()

if __name__ == "__main__":
    asyncio.run(main())

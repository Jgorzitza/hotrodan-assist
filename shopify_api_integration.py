#!/usr/bin/env python3
"""
Shopify API Integration Patterns
Thin, typed clients for MCP connector integration
"""

import asyncio
import aiohttp
import json
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ShopifyConfig:
    """Shopify API configuration"""
    shop_domain: str
    access_token: str
    api_version: str = "2024-01"
    timeout: int = 30
    max_retries: int = 3
    rate_limit_delay: float = 0.5

@dataclass
class ShopifyProduct:
    """Shopify product data structure"""
    id: int
    title: str
    handle: str
    status: str
    vendor: str
    product_type: str
    tags: List[str]
    variants: List[Dict[str, Any]]
    created_at: str
    updated_at: str

@dataclass
class ShopifyInventoryItem:
    """Shopify inventory item data structure"""
    id: int
    sku: str
    tracked: bool
    requires_shipping: bool
    country_code_of_origin: str
    province_code_of_origin: str
    harmonized_system_code: str
    country_harmonized_system_codes: List[Dict[str, Any]]
    created_at: str
    updated_at: str

@dataclass
class ShopifyInventoryLevel:
    """Shopify inventory level data structure"""
    inventory_item_id: int
    location_id: int
    available: int
    updated_at: str

class ShopifyAPIError(Exception):
    """Custom exception for Shopify API errors"""
    def __init__(self, message: str, status_code: int = None, response_data: Dict = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data

class ShopifyAPIClient:
    """
    Thin, typed client for Shopify API integration
    Designed for MCP connector integration
    """
    
    def __init__(self, config: ShopifyConfig):
        self.config = config
        self.base_url = f"https://{config.shop_domain}.myshopify.com/admin/api/{config.api_version}"
        self.headers = {
            "X-Shopify-Access-Token": config.access_token,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limiter = asyncio.Semaphore(2)  # Limit concurrent requests
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.config.timeout),
            headers=self.headers
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def _make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict[str, Any]:
        """Make HTTP request with retry logic and rate limiting"""
        async with self.rate_limiter:
            url = f"{self.base_url}/{endpoint.lstrip('/')}"
            
            for attempt in range(self.config.max_retries + 1):
                try:
                    async with self.session.request(method, url, json=data, params=params) as response:
                        # Handle rate limiting
                        if response.status == 429:
                            retry_after = float(response.headers.get('Retry-After', 2))
                            logger.warning(f"Rate limited, waiting {retry_after} seconds")
                            await asyncio.sleep(retry_after)
                            continue
                        
                        # Handle other errors
                        if response.status >= 400:
                            error_data = await response.json() if response.content_type == 'application/json' else {}
                            raise ShopifyAPIError(
                                f"API request failed: {response.reason}",
                                response.status,
                                error_data
                            )
                        
                        # Success
                        result = await response.json()
                        await asyncio.sleep(self.config.rate_limit_delay)  # Rate limiting
                        return result
                
                except aiohttp.ClientError as e:
                    if attempt == self.config.max_retries:
                        raise ShopifyAPIError(f"Request failed after {self.config.max_retries} retries: {e}")
                    
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.warning(f"Request failed (attempt {attempt + 1}), retrying in {wait_time}s: {e}")
                    await asyncio.sleep(wait_time)
    
    async def get_products(self, limit: int = 250, page_info: str = None) -> Dict[str, Any]:
        """Get products with pagination support"""
        params = {"limit": limit}
        if page_info:
            params["page_info"] = page_info
        
        return await self._make_request("GET", "products.json", params=params)
    
    async def get_product(self, product_id: int) -> Dict[str, Any]:
        """Get single product by ID"""
        return await self._make_request("GET", f"products/{product_id}.json")
    
    async def get_inventory_items(self, ids: List[int] = None, limit: int = 250) -> Dict[str, Any]:
        """Get inventory items"""
        params = {"limit": limit}
        if ids:
            params["ids"] = ",".join(map(str, ids))
        
        return await self._make_request("GET", "inventory_items.json", params=params)
    
    async def get_inventory_levels(self, inventory_item_ids: List[int], location_ids: List[int] = None) -> Dict[str, Any]:
        """Get inventory levels for specific items"""
        params = {"inventory_item_ids": ",".join(map(str, inventory_item_ids))}
        if location_ids:
            params["location_ids"] = ",".join(map(str, location_ids))
        
        return await self._make_request("GET", "inventory_levels.json", params=params)
    
    async def update_inventory_level(self, inventory_item_id: int, location_id: int, available: int) -> Dict[str, Any]:
        """Update inventory level for specific item and location"""
        data = {
            "location_id": location_id,
            "inventory_item_id": inventory_item_id,
            "available": available
        }
        
        return await self._make_request("POST", "inventory_levels/set.json", data=data)
    
    async def get_locations(self) -> Dict[str, Any]:
        """Get all locations"""
        return await self._make_request("GET", "locations.json")
    
    async def search_products(self, query: str, limit: int = 250) -> Dict[str, Any]:
        """Search products by query"""
        params = {
            "q": query,
            "limit": limit
        }
        return await self._make_request("GET", "products/search.json", params=params)

class ShopifyDataMapper:
    """
    Data mapping between Shopify API and internal inventory system
    """
    
    @staticmethod
    def map_product_to_inventory_sku(shopify_product: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Map Shopify product to internal inventory SKU format"""
        skus = []
        
        for variant in shopify_product.get('variants', []):
            sku = {
                'id': f"shopify_{variant['id']}",
                'sku': variant.get('sku', ''),
                'name': shopify_product['title'],
                'variant_title': variant.get('title', ''),
                'vendor': shopify_product.get('vendor', ''),
                'product_type': shopify_product.get('product_type', ''),
                'status': 'active' if shopify_product.get('status') == 'active' else 'inactive',
                'unit_cost': {
                    'amount': float(variant.get('cost_price', 0)),
                    'currency': 'USD'
                },
                'price': {
                    'amount': float(variant.get('price', 0)),
                    'currency': 'USD'
                },
                'weight': variant.get('weight', 0),
                'requires_shipping': variant.get('requires_shipping', True),
                'inventory_management': variant.get('inventory_management'),
                'inventory_policy': variant.get('inventory_policy'),
                'fulfillment_service': variant.get('fulfillment_service'),
                'inventory_item_id': variant.get('inventory_item_id'),
                'created_at': variant.get('created_at'),
                'updated_at': variant.get('updated_at'),
                'tags': shopify_product.get('tags', '').split(',') if shopify_product.get('tags') else []
            }
            skus.append(sku)
        
        return skus
    
    @staticmethod
    def map_inventory_levels_to_stock(shopify_levels: List[Dict[str, Any]], location_mapping: Dict[int, str]) -> Dict[str, Any]:
        """Map Shopify inventory levels to internal stock format"""
        stock_data = {}
        
        for level in shopify_levels:
            inventory_item_id = level['inventory_item_id']
            location_id = level['location_id']
            available = level['available']
            
            if inventory_item_id not in stock_data:
                stock_data[inventory_item_id] = {
                    'total_available': 0,
                    'locations': {}
                }
            
            stock_data[inventory_item_id]['total_available'] += available
            stock_data[inventory_item_id]['locations'][location_mapping.get(location_id, f"location_{location_id}")] = available
        
        return stock_data
    
    @staticmethod
    def map_internal_sku_to_shopify_variant(internal_sku: Dict[str, Any]) -> Dict[str, Any]:
        """Map internal SKU format to Shopify variant for updates"""
        return {
            'id': int(internal_sku['id'].replace('shopify_', '')),
            'sku': internal_sku['sku'],
            'price': str(internal_sku['price']['amount']),
            'cost_price': str(internal_sku['unit_cost']['amount']),
            'weight': internal_sku.get('weight', 0),
            'requires_shipping': internal_sku.get('requires_shipping', True),
            'inventory_management': internal_sku.get('inventory_management', 'shopify'),
            'inventory_policy': internal_sku.get('inventory_policy', 'deny')
        }

class ShopifyIntegrationService:
    """
    High-level service for Shopify integration
    Combines API client and data mapping
    """
    
    def __init__(self, config: ShopifyConfig):
        self.config = config
        self.client = ShopifyAPIClient(config)
        self.mapper = ShopifyDataMapper()
        self.location_cache = {}
    
    async def sync_inventory_data(self) -> Dict[str, Any]:
        """Sync inventory data from Shopify"""
        async with self.client as client:
            try:
                # Get all products with pagination
                all_products = []
                page_info = None
                
                while True:
                    products_response = await client.get_products(page_info=page_info)
                    products = products_response.get('products', [])
                    all_products.extend(products)
                    
                    # Check for next page
                    link_header = products_response.get('link', '')
                    if 'next' not in link_header:
                        break
                    
                    # Extract page_info from link header (simplified)
                    page_info = self._extract_page_info(link_header)
                    if not page_info:
                        break
                
                # Get inventory levels for all variants
                variant_ids = []
                for product in all_products:
                    for variant in product.get('variants', []):
                        if variant.get('inventory_item_id'):
                            variant_ids.append(variant['inventory_item_id'])
                
                inventory_levels = []
                if variant_ids:
                    levels_response = await client.get_inventory_levels(variant_ids)
                    inventory_levels = levels_response.get('inventory_levels', [])
                
                # Get locations for mapping
                locations_response = await client.get_locations()
                locations = {loc['id']: loc['name'] for loc in locations_response.get('locations', [])}
                
                # Map data to internal format
                mapped_skus = []
                for product in all_products:
                    skus = self.mapper.map_product_to_inventory_sku(product)
                    mapped_skus.extend(skus)
                
                stock_data = self.mapper.map_inventory_levels_to_stock(inventory_levels, locations)
                
                return {
                    'skus': mapped_skus,
                    'stock_data': stock_data,
                    'total_products': len(all_products),
                    'total_variants': sum(len(p.get('variants', [])) for p in all_products),
                    'sync_timestamp': datetime.now().isoformat()
                }
                
            except Exception as e:
                logger.error(f"Error syncing inventory data: {e}")
                raise
    
    async def update_inventory_levels(self, updates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Update inventory levels in Shopify"""
        async with self.client as client:
            results = []
            
            for update in updates:
                try:
                    result = await client.update_inventory_level(
                        update['inventory_item_id'],
                        update['location_id'],
                        update['available']
                    )
                    results.append({
                        'success': True,
                        'inventory_item_id': update['inventory_item_id'],
                        'location_id': update['location_id'],
                        'result': result
                    })
                except Exception as e:
                    results.append({
                        'success': False,
                        'inventory_item_id': update['inventory_item_id'],
                        'location_id': update['location_id'],
                        'error': str(e)
                    })
            
            return {
                'updates': results,
                'successful': sum(1 for r in results if r['success']),
                'failed': sum(1 for r in results if not r['success']),
                'timestamp': datetime.now().isoformat()
            }
    
    def _extract_page_info(self, link_header: str) -> Optional[str]:
        """Extract page_info from link header (simplified implementation)"""
        # This is a simplified implementation
        # In production, you'd properly parse the Link header
        if 'next' in link_header and 'page_info=' in link_header:
            start = link_header.find('page_info=') + 10
            end = link_header.find('>', start)
            if end == -1:
                end = link_header.find(';', start)
            if end == -1:
                end = len(link_header)
            return link_header[start:end]
        return None

# Feature flag implementation
class FeatureFlags:
    """Feature flags for MCP integration"""
    
    def __init__(self):
        self.flags = {
            'shopify_integration_enabled': True,
            'real_time_sync_enabled': False,
            'bulk_operations_enabled': True,
            'advanced_analytics_enabled': True,
            'auto_reorder_enabled': False
        }
    
    def is_enabled(self, flag_name: str) -> bool:
        """Check if feature flag is enabled"""
        return self.flags.get(flag_name, False)
    
    def set_flag(self, flag_name: str, enabled: bool):
        """Set feature flag value"""
        self.flags[flag_name] = enabled

# Example usage and testing
async def main():
    """Example usage of Shopify integration"""
    config = ShopifyConfig(
        shop_domain="your-shop",
        access_token="your-access-token"
    )
    
    service = ShopifyIntegrationService(config)
    feature_flags = FeatureFlags()
    
    if feature_flags.is_enabled('shopify_integration_enabled'):
        try:
            # Sync inventory data
            sync_result = await service.sync_inventory_data()
            print(f"Synced {sync_result['total_products']} products with {sync_result['total_variants']} variants")
            
            # Example inventory level update
            if feature_flags.is_enabled('bulk_operations_enabled'):
                updates = [
                    {
                        'inventory_item_id': 123456789,
                        'location_id': 987654321,
                        'available': 100
                    }
                ]
                
                update_result = await service.update_inventory_levels(updates)
                print(f"Updated {update_result['successful']} inventory levels")
                
        except Exception as e:
            print(f"Integration error: {e}")

if __name__ == "__main__":
    asyncio.run(main())

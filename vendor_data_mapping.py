#!/usr/bin/env python3
"""
Vendor System Data Mapping Schemas
Standardized data mapping for various vendor systems
"""

from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
from datetime import datetime
import json

@dataclass
class VendorSystemConfig:
    """Configuration for vendor system integration"""
    system_type: str  # 'shopify', 'woocommerce', 'magento', 'custom'
    api_endpoint: str
    api_key: str
    api_secret: Optional[str] = None
    timeout: int = 30
    rate_limit: int = 100  # requests per minute
    retry_attempts: int = 3

@dataclass
class StandardizedProduct:
    """Standardized product data structure"""
    id: str
    sku: str
    name: str
    description: str
    category: str
    brand: str
    price: float
    cost: float
    weight: float
    dimensions: Dict[str, float]
    status: str
    vendor_id: str
    vendor_name: str
    created_at: str
    updated_at: str
    metadata: Dict[str, Any]

@dataclass
class StandardizedInventory:
    """Standardized inventory data structure"""
    sku: str
    location: str
    available: int
    reserved: int
    on_hand: int
    reorder_point: int
    reorder_quantity: int
    lead_time_days: int
    last_updated: str

@dataclass
class StandardizedOrder:
    """Standardized order data structure"""
    order_id: str
    vendor_id: str
    status: str
    items: List[Dict[str, Any]]
    total_amount: float
    currency: str
    order_date: str
    expected_delivery: str
    tracking_number: Optional[str] = None

class VendorDataMapper:
    """
    Universal data mapper for different vendor systems
    """
    
    def __init__(self, system_type: str):
        self.system_type = system_type
        self.mapping_rules = self._get_mapping_rules(system_type)
    
    def _get_mapping_rules(self, system_type: str) -> Dict[str, Any]:
        """Get mapping rules for specific vendor system"""
        rules = {
            'shopify': {
                'product_id_field': 'id',
                'sku_field': 'variants.0.sku',
                'name_field': 'title',
                'price_field': 'variants.0.price',
                'cost_field': 'variants.0.cost_price',
                'status_field': 'status',
                'vendor_field': 'vendor',
                'created_field': 'created_at',
                'updated_field': 'updated_at'
            },
            'woocommerce': {
                'product_id_field': 'id',
                'sku_field': 'sku',
                'name_field': 'name',
                'price_field': 'price',
                'cost_field': 'meta_data.cost_price',
                'status_field': 'status',
                'vendor_field': 'meta_data.vendor',
                'created_field': 'date_created',
                'updated_field': 'date_modified'
            },
            'magento': {
                'product_id_field': 'id',
                'sku_field': 'sku',
                'name_field': 'name',
                'price_field': 'price',
                'cost_field': 'cost',
                'status_field': 'status',
                'vendor_field': 'extension_attributes.vendor',
                'created_field': 'created_at',
                'updated_field': 'updated_at'
            },
            'custom': {
                'product_id_field': 'product_id',
                'sku_field': 'product_sku',
                'name_field': 'product_name',
                'price_field': 'selling_price',
                'cost_field': 'cost_price',
                'status_field': 'active_status',
                'vendor_field': 'supplier_name',
                'created_field': 'created_timestamp',
                'updated_field': 'modified_timestamp'
            }
        }
        return rules.get(system_type, rules['custom'])
    
    def map_product(self, raw_product: Dict[str, Any]) -> StandardizedProduct:
        """Map raw product data to standardized format"""
        rules = self.mapping_rules
        
        # Extract fields using mapping rules
        product_id = self._extract_nested_field(raw_product, rules['product_id_field'])
        sku = self._extract_nested_field(raw_product, rules['sku_field'])
        name = self._extract_nested_field(raw_product, rules['name_field'])
        price = float(self._extract_nested_field(raw_product, rules['price_field']) or 0)
        cost = float(self._extract_nested_field(raw_product, rules['cost_field']) or 0)
        status = self._extract_nested_field(raw_product, rules['status_field'])
        vendor = self._extract_nested_field(raw_product, rules['vendor_field'])
        created_at = self._extract_nested_field(raw_product, rules['created_field'])
        updated_at = self._extract_nested_field(raw_product, rules['updated_field'])
        
        # Handle system-specific transformations
        if self.system_type == 'shopify':
            # Shopify has variants, take first one for basic info
            variants = raw_product.get('variants', [])
            if variants:
                sku = variants[0].get('sku', sku)
                price = float(variants[0].get('price', price))
                cost = float(variants[0].get('cost_price', cost))
        
        return StandardizedProduct(
            id=str(product_id),
            sku=str(sku) if sku else '',
            name=str(name) if name else '',
            description=raw_product.get('description', ''),
            category=raw_product.get('product_type', ''),
            brand=raw_product.get('vendor', ''),
            price=price,
            cost=cost,
            weight=float(raw_product.get('weight', 0)),
            dimensions=self._extract_dimensions(raw_product),
            status=self._normalize_status(status),
            vendor_id=str(vendor) if vendor else '',
            vendor_name=str(vendor) if vendor else '',
            created_at=self._normalize_timestamp(created_at),
            updated_at=self._normalize_timestamp(updated_at),
            metadata=self._extract_metadata(raw_product)
        )
    
    def map_inventory(self, raw_inventory: Dict[str, Any]) -> StandardizedInventory:
        """Map raw inventory data to standardized format"""
        return StandardizedInventory(
            sku=str(raw_inventory.get('sku', '')),
            location=str(raw_inventory.get('location', 'default')),
            available=int(raw_inventory.get('available', 0)),
            reserved=int(raw_inventory.get('reserved', 0)),
            on_hand=int(raw_inventory.get('on_hand', 0)),
            reorder_point=int(raw_inventory.get('reorder_point', 0)),
            reorder_quantity=int(raw_inventory.get('reorder_quantity', 0)),
            lead_time_days=int(raw_inventory.get('lead_time_days', 30)),
            last_updated=self._normalize_timestamp(raw_inventory.get('last_updated'))
        )
    
    def map_order(self, raw_order: Dict[str, Any]) -> StandardizedOrder:
        """Map raw order data to standardized format"""
        return StandardizedOrder(
            order_id=str(raw_order.get('id', '')),
            vendor_id=str(raw_order.get('vendor_id', '')),
            status=self._normalize_order_status(raw_order.get('status', '')),
            items=self._extract_order_items(raw_order),
            total_amount=float(raw_order.get('total', 0)),
            currency=str(raw_order.get('currency', 'USD')),
            order_date=self._normalize_timestamp(raw_order.get('order_date')),
            expected_delivery=self._normalize_timestamp(raw_order.get('expected_delivery')),
            tracking_number=raw_order.get('tracking_number')
        )
    
    def _extract_nested_field(self, data: Dict[str, Any], field_path: str) -> Any:
        """Extract field value using dot notation path"""
        keys = field_path.split('.')
        value = data
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        
        return value
    
    def _extract_dimensions(self, product: Dict[str, Any]) -> Dict[str, float]:
        """Extract product dimensions"""
        dimensions = {}
        
        # Try different dimension field names
        dimension_fields = ['dimensions', 'size', 'measurements']
        for field in dimension_fields:
            if field in product:
                dim_data = product[field]
                if isinstance(dim_data, dict):
                    dimensions.update({
                        k: float(v) for k, v in dim_data.items() 
                        if isinstance(v, (int, float, str)) and str(v).replace('.', '').isdigit()
                    })
                break
        
        # Default dimensions if none found
        if not dimensions:
            dimensions = {
                'length': 0.0,
                'width': 0.0,
                'height': 0.0
            }
        
        return dimensions
    
    def _extract_metadata(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """Extract additional metadata from product"""
        metadata = {}
        
        # Common metadata fields
        metadata_fields = [
            'tags', 'categories', 'attributes', 'custom_fields',
            'meta_data', 'extension_attributes', 'options'
        ]
        
        for field in metadata_fields:
            if field in product:
                metadata[field] = product[field]
        
        return metadata
    
    def _normalize_status(self, status: str) -> str:
        """Normalize product status across systems"""
        if not status:
            return 'inactive'
        
        status_lower = status.lower()
        
        # Map various status values to standard ones
        if status_lower in ['active', 'published', 'enabled', 'live', 'available']:
            return 'active'
        elif status_lower in ['inactive', 'draft', 'disabled', 'unpublished', 'hidden']:
            return 'inactive'
        elif status_lower in ['archived', 'deleted', 'trash']:
            return 'archived'
        else:
            return 'unknown'
    
    def _normalize_order_status(self, status: str) -> str:
        """Normalize order status across systems"""
        if not status:
            return 'pending'
        
        status_lower = status.lower()
        
        # Map various order statuses to standard ones
        status_mapping = {
            'pending': ['pending', 'new', 'received', 'processing'],
            'confirmed': ['confirmed', 'accepted', 'approved'],
            'shipped': ['shipped', 'dispatched', 'in_transit'],
            'delivered': ['delivered', 'completed', 'fulfilled'],
            'cancelled': ['cancelled', 'canceled', 'void'],
            'returned': ['returned', 'refunded']
        }
        
        for standard_status, variants in status_mapping.items():
            if status_lower in variants:
                return standard_status
        
        return 'unknown'
    
    def _normalize_timestamp(self, timestamp: str) -> str:
        """Normalize timestamp format"""
        if not timestamp:
            return datetime.now().isoformat()
        
        # Handle different timestamp formats
        try:
            # Try parsing common formats
            for fmt in [
                '%Y-%m-%dT%H:%M:%S.%fZ',
                '%Y-%m-%dT%H:%M:%SZ',
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d'
            ]:
                try:
                    dt = datetime.strptime(timestamp, fmt)
                    return dt.isoformat()
                except ValueError:
                    continue
            
            # If all parsing fails, return as-is
            return timestamp
        except:
            return datetime.now().isoformat()
    
    def _extract_order_items(self, order: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract order items from order data"""
        items = []
        
        # Try different item field names
        item_fields = ['items', 'line_items', 'products', 'order_items']
        
        for field in item_fields:
            if field in order and isinstance(order[field], list):
                for item in order[field]:
                    standardized_item = {
                        'sku': str(item.get('sku', '')),
                        'name': str(item.get('name', '')),
                        'quantity': int(item.get('quantity', 0)),
                        'price': float(item.get('price', 0)),
                        'total': float(item.get('total', 0))
                    }
                    items.append(standardized_item)
                break
        
        return items

class VendorSystemRegistry:
    """
    Registry for managing different vendor systems
    """
    
    def __init__(self):
        self.systems = {}
        self.mappers = {}
    
    def register_system(self, system_id: str, config: VendorSystemConfig, mapper: VendorDataMapper):
        """Register a vendor system"""
        self.systems[system_id] = config
        self.mappers[system_id] = mapper
    
    def get_mapper(self, system_id: str) -> Optional[VendorDataMapper]:
        """Get mapper for specific system"""
        return self.mappers.get(system_id)
    
    def list_systems(self) -> List[str]:
        """List all registered systems"""
        return list(self.systems.keys())
    
    def map_products(self, system_id: str, raw_products: List[Dict[str, Any]]) -> List[StandardizedProduct]:
        """Map products for specific system"""
        mapper = self.get_mapper(system_id)
        if not mapper:
            raise ValueError(f"No mapper found for system: {system_id}")
        
        return [mapper.map_product(product) for product in raw_products]
    
    def map_inventory(self, system_id: str, raw_inventory: List[Dict[str, Any]]) -> List[StandardizedInventory]:
        """Map inventory for specific system"""
        mapper = self.get_mapper(system_id)
        if not mapper:
            raise ValueError(f"No mapper found for system: {system_id}")
        
        return [mapper.map_inventory(inv) for inv in raw_inventory]
    
    def map_orders(self, system_id: str, raw_orders: List[Dict[str, Any]]) -> List[StandardizedOrder]:
        """Map orders for specific system"""
        mapper = self.get_mapper(system_id)
        if not mapper:
            raise ValueError(f"No mapper found for system: {system_id}")
        
        return [mapper.map_order(order) for order in raw_orders]

# Example usage and testing
def main():
    """Example usage of vendor data mapping"""
    
    # Initialize registry
    registry = VendorSystemRegistry()
    
    # Register different vendor systems
    shopify_config = VendorSystemConfig(
        system_type='shopify',
        api_endpoint='https://your-shop.myshopify.com/admin/api/2024-01',
        api_key='your-api-key'
    )
    shopify_mapper = VendorDataMapper('shopify')
    registry.register_system('shopify', shopify_config, shopify_mapper)
    
    woocommerce_config = VendorSystemConfig(
        system_type='woocommerce',
        api_endpoint='https://your-store.com/wp-json/wc/v3',
        api_key='your-consumer-key',
        api_secret='your-consumer-secret'
    )
    woocommerce_mapper = VendorDataMapper('woocommerce')
    registry.register_system('woocommerce', woocommerce_config, woocommerce_mapper)
    
    # Example Shopify product data
    shopify_product = {
        'id': 123456,
        'title': 'Test Product',
        'vendor': 'Test Vendor',
        'product_type': 'Electronics',
        'status': 'active',
        'created_at': '2024-01-01T00:00:00Z',
        'updated_at': '2024-01-15T10:30:00Z',
        'variants': [{
            'id': 789012,
            'sku': 'TEST-001',
            'price': '29.99',
            'cost_price': '15.50',
            'weight': 0.5
        }]
    }
    
    # Map to standardized format
    standardized_product = registry.map_products('shopify', [shopify_product])[0]
    
    print("=== VENDOR DATA MAPPING EXAMPLE ===")
    print(f"Original Shopify Product ID: {shopify_product['id']}")
    print(f"Standardized Product ID: {standardized_product.id}")
    print(f"SKU: {standardized_product.sku}")
    print(f"Name: {standardized_product.name}")
    print(f"Price: ${standardized_product.price}")
    print(f"Cost: ${standardized_product.cost}")
    print(f"Status: {standardized_product.status}")
    print(f"Vendor: {standardized_product.vendor_name}")

if __name__ == "__main__":
    main()

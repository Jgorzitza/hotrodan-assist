#!/usr/bin/env python3
"""
Automated Purchase Order Generation System
Intelligent PO generation with optimization and rules engine
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import json

class OrderPriority(Enum):
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class OrderStatus(Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    SENT = "sent"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"

@dataclass
class PurchaseOrderItem:
    sku_id: str
    sku_name: str
    quantity: int
    unit_cost: float
    total_cost: float
    vendor_id: str
    vendor_name: str
    lead_time_days: int
    priority: OrderPriority
    reason: str
    reorder_point: int
    current_stock: int
    forecasted_demand: float

@dataclass
class PurchaseOrder:
    po_id: str
    vendor_id: str
    vendor_name: str
    total_amount: float
    items: List[PurchaseOrderItem]
    priority: OrderPriority
    status: OrderStatus
    created_date: str
    requested_delivery_date: str
    notes: str
    approval_required: bool

@dataclass
class OrderRule:
    rule_id: str
    name: str
    condition: str
    action: str
    priority: int
    enabled: bool

class AutomatedPurchaseOrderGenerator:
    """
    Intelligent purchase order generation with optimization
    """
    
    def __init__(self):
        self.rules = self._initialize_rules()
        self.vendor_data = {}
        self.sku_data = {}
        
    def _initialize_rules(self) -> List[OrderRule]:
        """Initialize business rules for PO generation"""
        return [
            OrderRule(
                rule_id="stockout_prevention",
                name="Stockout Prevention",
                condition="current_stock <= reorder_point AND forecasted_demand > 0",
                action="generate_urgent_order",
                priority=1,
                enabled=True
            ),
            OrderRule(
                rule_id="low_stock_alert",
                name="Low Stock Alert",
                condition="current_stock <= reorder_point * 1.2 AND forecasted_demand > 0",
                action="generate_high_priority_order",
                priority=2,
                enabled=True
            ),
            OrderRule(
                rule_id="seasonal_demand",
                name="Seasonal Demand Preparation",
                condition="seasonality_factor > 1.5 AND days_to_season > 30",
                action="generate_medium_priority_order",
                priority=3,
                enabled=True
            ),
            OrderRule(
                rule_id="cost_optimization",
                name="Cost Optimization",
                condition="vendor_discount_available AND total_order_value > 1000",
                action="consolidate_orders",
                priority=4,
                enabled=True
            ),
            OrderRule(
                rule_id="vendor_performance",
                name="Vendor Performance Based",
                condition="vendor_score < 0.6",
                action="find_alternative_vendor",
                priority=5,
                enabled=True
            )
        ]
    
    def generate_purchase_orders(self, inventory_data: List[Dict], vendor_data: Dict, forecast_data: List[Dict]) -> List[PurchaseOrder]:
        """
        Generate purchase orders based on inventory, vendor, and forecast data
        """
        self.vendor_data = vendor_data
        self.sku_data = {sku['id']: sku for sku in inventory_data}
        
        # Group SKUs by vendor for consolidation
        vendor_skus = self._group_skus_by_vendor(inventory_data)
        
        purchase_orders = []
        
        for vendor_id, skus in vendor_skus.items():
            if not skus:
                continue
                
            # Generate PO items for this vendor
            po_items = []
            total_amount = 0
            
            for sku in skus:
                po_item = self._create_po_item(sku, forecast_data)
                if po_item:
                    po_items.append(po_item)
                    total_amount += po_item.total_cost
            
            if po_items:
                # Create purchase order
                po = self._create_purchase_order(vendor_id, po_items, total_amount)
                purchase_orders.append(po)
        
        # Apply optimization rules
        purchase_orders = self._apply_optimization_rules(purchase_orders)
        
        return purchase_orders
    
    def _group_skus_by_vendor(self, inventory_data: List[Dict]) -> Dict[str, List[Dict]]:
        """Group SKUs by vendor for order consolidation"""
        vendor_skus = {}
        
        for sku in inventory_data:
            vendor_id = sku.get('vendorId', 'unknown')
            if vendor_id not in vendor_skus:
                vendor_skus[vendor_id] = []
            vendor_skus[vendor_id].append(sku)
        
        return vendor_skus
    
    def _create_po_item(self, sku: Dict, forecast_data: List[Dict]) -> Optional[PurchaseOrderItem]:
        """Create a purchase order item for a SKU"""
        sku_id = sku.get('id')
        if not sku_id:
            return None
        
        # Get forecast data for this SKU
        forecast = next((f for f in forecast_data if f.get('sku_id') == sku_id), {})
        
        # Check if order is needed
        if not self._should_generate_order(sku, forecast):
            return None
        
        # Calculate order quantity
        quantity = self._calculate_order_quantity(sku, forecast)
        if quantity <= 0:
            return None
        
        # Get vendor information
        vendor_id = sku.get('vendorId', 'unknown')
        vendor_info = self.vendor_data.get(vendor_id, {})
        
        # Calculate costs
        unit_cost = sku.get('unitCost', {}).get('amount', 0)
        total_cost = quantity * unit_cost
        
        # Determine priority
        priority = self._determine_priority(sku, forecast)
        
        # Get lead time
        lead_time = vendor_info.get('average_lead_time', 30)
        
        return PurchaseOrderItem(
            sku_id=sku_id,
            sku_name=sku.get('sku', 'Unknown SKU'),
            quantity=quantity,
            unit_cost=unit_cost,
            total_cost=total_cost,
            vendor_id=vendor_id,
            vendor_name=vendor_info.get('name', 'Unknown Vendor'),
            lead_time_days=lead_time,
            priority=priority,
            reason=self._get_order_reason(sku, forecast),
            reorder_point=sku.get('reorderPoint', 0),
            current_stock=sku.get('onHand', 0),
            forecasted_demand=forecast.get('forecasted_demand', [0])[0] if forecast.get('forecasted_demand') else 0
        )
    
    def _should_generate_order(self, sku: Dict, forecast: Dict) -> bool:
        """Determine if an order should be generated for this SKU"""
        current_stock = sku.get('onHand', 0)
        committed = sku.get('committed', 0)
        net_stock = current_stock - committed
        reorder_point = sku.get('reorderPoint', 0)
        
        # Check if below reorder point
        if net_stock <= reorder_point:
            return True
        
        # Check forecast-based reorder
        forecasted_demand = forecast.get('forecasted_demand', [0])
        if forecasted_demand and len(forecasted_demand) > 0:
            avg_forecast = np.mean(forecasted_demand)
            days_until_stockout = net_stock / avg_forecast if avg_forecast > 0 else float('inf')
            
            # Reorder if stock will run out in less than 30 days
            if days_until_stockout < 30:
                return True
        
        return False
    
    def _calculate_order_quantity(self, sku: Dict, forecast: Dict) -> int:
        """Calculate optimal order quantity using EOQ and other factors"""
        # Economic Order Quantity (EOQ) calculation
        annual_demand = self._estimate_annual_demand(sku, forecast)
        ordering_cost = 50  # Default ordering cost
        holding_cost_rate = 0.2  # 20% of unit cost
        unit_cost = sku.get('unitCost', {}).get('amount', 0)
        
        if annual_demand <= 0 or unit_cost <= 0:
            return 0
        
        # EOQ formula
        eoq = np.sqrt((2 * annual_demand * ordering_cost) / (unit_cost * holding_cost_rate))
        
        # Adjust for lead time demand
        lead_time_days = 30  # Default lead time
        lead_time_demand = annual_demand * (lead_time_days / 365)
        
        # Add safety stock
        safety_stock = self._calculate_safety_stock(sku, forecast)
        
        # Calculate total order quantity
        order_quantity = int(eoq + lead_time_demand + safety_stock)
        
        # Apply minimum and maximum constraints
        min_order = sku.get('minimumOrderQuantity', 1)
        max_order = sku.get('maximumOrderQuantity', 10000)
        
        order_quantity = max(min_order, min(order_quantity, max_order))
        
        return order_quantity
    
    def _estimate_annual_demand(self, sku: Dict, forecast: Dict) -> float:
        """Estimate annual demand from historical and forecast data"""
        # Use forecast data if available
        forecasted_demand = forecast.get('forecasted_demand', [])
        if forecasted_demand and len(forecasted_demand) > 0:
            avg_monthly = np.mean(forecasted_demand)
            return avg_monthly * 12
        
        # Fallback to historical velocity
        velocity = sku.get('velocity', {})
        weekly_demand = velocity.get('lastWeekUnits', 0)
        return weekly_demand * 52
    
    def _calculate_safety_stock(self, sku: Dict, forecast: Dict) -> float:
        """Calculate safety stock based on demand variability"""
        forecasted_demand = forecast.get('forecasted_demand', [])
        if not forecasted_demand or len(forecasted_demand) < 2:
            return 0
        
        # Calculate demand standard deviation
        demand_std = np.std(forecasted_demand)
        
        # Service level factor (95% service level = 1.65)
        service_level_factor = 1.65
        
        # Lead time (in days)
        lead_time_days = 30
        
        # Safety stock = service_level_factor * demand_std * sqrt(lead_time)
        safety_stock = service_level_factor * demand_std * np.sqrt(lead_time_days)
        
        return max(0, safety_stock)
    
    def _determine_priority(self, sku: Dict, forecast: Dict) -> OrderPriority:
        """Determine order priority based on urgency factors"""
        current_stock = sku.get('onHand', 0)
        committed = sku.get('committed', 0)
        net_stock = current_stock - committed
        reorder_point = sku.get('reorderPoint', 0)
        
        # Urgent if already below reorder point
        if net_stock <= reorder_point:
            return OrderPriority.URGENT
        
        # High if very close to reorder point
        if net_stock <= reorder_point * 1.2:
            return OrderPriority.HIGH
        
        # Check forecast-based urgency
        forecasted_demand = forecast.get('forecasted_demand', [0])
        if forecasted_demand and len(forecasted_demand) > 0:
            avg_forecast = np.mean(forecasted_demand)
            days_until_stockout = net_stock / avg_forecast if avg_forecast > 0 else float('inf')
            
            if days_until_stockout < 7:
                return OrderPriority.URGENT
            elif days_until_stockout < 14:
                return OrderPriority.HIGH
            elif days_until_stockout < 30:
                return OrderPriority.MEDIUM
        
        return OrderPriority.LOW
    
    def _get_order_reason(self, sku: Dict, forecast: Dict) -> str:
        """Generate human-readable reason for the order"""
        current_stock = sku.get('onHand', 0)
        committed = sku.get('committed', 0)
        net_stock = current_stock - committed
        reorder_point = sku.get('reorderPoint', 0)
        
        if net_stock <= reorder_point:
            return f"Stock below reorder point ({net_stock} <= {reorder_point})"
        
        forecasted_demand = forecast.get('forecasted_demand', [0])
        if forecasted_demand and len(forecasted_demand) > 0:
            avg_forecast = np.mean(forecasted_demand)
            days_until_stockout = net_stock / avg_forecast if avg_forecast > 0 else float('inf')
            
            if days_until_stockout < 30:
                return f"Forecast indicates stockout in {days_until_stockout:.1f} days"
        
        return "Preventive reorder based on demand forecast"
    
    def _create_purchase_order(self, vendor_id: str, items: List[PurchaseOrderItem], total_amount: float) -> PurchaseOrder:
        """Create a purchase order for a vendor"""
        vendor_info = self.vendor_data.get(vendor_id, {})
        
        # Determine overall priority
        priorities = [item.priority for item in items]
        if OrderPriority.URGENT in priorities:
            overall_priority = OrderPriority.URGENT
        elif OrderPriority.HIGH in priorities:
            overall_priority = OrderPriority.HIGH
        elif OrderPriority.MEDIUM in priorities:
            overall_priority = OrderPriority.MEDIUM
        else:
            overall_priority = OrderPriority.LOW
        
        # Calculate delivery date
        max_lead_time = max(item.lead_time_days for item in items)
        delivery_date = datetime.now() + timedelta(days=max_lead_time)
        
        # Generate PO ID
        po_id = f"PO-{vendor_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return PurchaseOrder(
            po_id=po_id,
            vendor_id=vendor_id,
            vendor_name=vendor_info.get('name', 'Unknown Vendor'),
            total_amount=total_amount,
            items=items,
            priority=overall_priority,
            status=OrderStatus.DRAFT,
            created_date=datetime.now().isoformat(),
            requested_delivery_date=delivery_date.isoformat(),
            notes=self._generate_po_notes(items),
            approval_required=total_amount > 1000 or overall_priority == OrderPriority.URGENT
        )
    
    def _generate_po_notes(self, items: List[PurchaseOrderItem]) -> str:
        """Generate notes for the purchase order"""
        notes = []
        
        urgent_items = [item for item in items if item.priority == OrderPriority.URGENT]
        if urgent_items:
            notes.append(f"URGENT: {len(urgent_items)} items require immediate attention")
        
        high_priority_items = [item for item in items if item.priority == OrderPriority.HIGH]
        if high_priority_items:
            notes.append(f"HIGH PRIORITY: {len(high_priority_items)} items need expedited processing")
        
        # Add vendor-specific notes
        if len(items) > 1:
            notes.append(f"Consolidated order for {len(items)} SKUs")
        
        return "; ".join(notes) if notes else "Standard reorder"
    
    def _apply_optimization_rules(self, purchase_orders: List[PurchaseOrder]) -> List[PurchaseOrder]:
        """Apply optimization rules to purchase orders"""
        optimized_pos = []
        
        for po in purchase_orders:
            # Apply cost optimization
            if self._should_consolidate_orders(po):
                po = self._consolidate_order_items(po)
            
            # Apply vendor performance rules
            if self._should_find_alternative_vendor(po):
                po = self._find_alternative_vendor(po)
            
            optimized_pos.append(po)
        
        return optimized_pos
    
    def _should_consolidate_orders(self, po: PurchaseOrder) -> bool:
        """Check if order should be consolidated for cost savings"""
        # Check if vendor offers volume discounts
        vendor_info = self.vendor_data.get(po.vendor_id, {})
        volume_discount_threshold = vendor_info.get('volume_discount_threshold', 5000)
        
        return po.total_amount >= volume_discount_threshold
    
    def _consolidate_order_items(self, po: PurchaseOrder) -> PurchaseOrder:
        """Consolidate order items for better pricing"""
        # This would implement order consolidation logic
        # For now, just return the original PO
        return po
    
    def _should_find_alternative_vendor(self, po: PurchaseOrder) -> bool:
        """Check if alternative vendor should be found"""
        vendor_info = self.vendor_data.get(po.vendor_id, {})
        vendor_score = vendor_info.get('overall_score', 0.5)
        
        return vendor_score < 0.6
    
    def _find_alternative_vendor(self, po: PurchaseOrder) -> PurchaseOrder:
        """Find alternative vendor for low-performing vendor"""
        # This would implement vendor switching logic
        # For now, just return the original PO
        return po
    
    def generate_po_summary(self, purchase_orders: List[PurchaseOrder]) -> Dict:
        """Generate summary of all purchase orders"""
        total_amount = sum(po.total_amount for po in purchase_orders)
        total_items = sum(len(po.items) for po in purchase_orders)
        
        priority_counts = {}
        for po in purchase_orders:
            priority = po.priority.value
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        vendor_counts = {}
        for po in purchase_orders:
            vendor = po.vendor_name
            vendor_counts[vendor] = vendor_counts.get(vendor, 0) + 1
        
        return {
            "total_orders": len(purchase_orders),
            "total_amount": total_amount,
            "total_items": total_items,
            "priority_distribution": priority_counts,
            "vendor_distribution": vendor_counts,
            "approval_required": sum(1 for po in purchase_orders if po.approval_required),
            "generated_at": datetime.now().isoformat()
        }

# Example usage and testing
if __name__ == "__main__":
    # Test with sample data
    sample_inventory = [
        {
            'id': 'SKU001',
            'sku': 'TEST-001',
            'onHand': 5,
            'committed': 2,
            'reorderPoint': 10,
            'vendorId': 'VENDOR001',
            'unitCost': {'amount': 25.50},
            'minimumOrderQuantity': 10,
            'maximumOrderQuantity': 1000,
            'velocity': {'lastWeekUnits': 15}
        },
        {
            'id': 'SKU002',
            'sku': 'TEST-002',
            'onHand': 8,
            'committed': 1,
            'reorderPoint': 15,
            'vendorId': 'VENDOR001',
            'unitCost': {'amount': 30.00},
            'minimumOrderQuantity': 5,
            'maximumOrderQuantity': 500,
            'velocity': {'lastWeekUnits': 20}
        }
    ]
    
    sample_vendor_data = {
        'VENDOR001': {
            'id': 'VENDOR001',
            'name': 'Test Supplier Co.',
            'average_lead_time': 14,
            'overall_score': 0.85,
            'volume_discount_threshold': 1000
        }
    }
    
    sample_forecast_data = [
        {
            'sku_id': 'SKU001',
            'forecasted_demand': [15, 18, 20, 16, 19, 17]
        },
        {
            'sku_id': 'SKU002',
            'forecasted_demand': [20, 22, 25, 21, 23, 24]
        }
    ]
    
    generator = AutomatedPurchaseOrderGenerator()
    purchase_orders = generator.generate_purchase_orders(sample_inventory, sample_vendor_data, sample_forecast_data)
    
    print("=== AUTOMATED PURCHASE ORDER GENERATION ===")
    print(f"Generated {len(purchase_orders)} purchase orders")
    
    for po in purchase_orders:
        print(f"\nPO ID: {po.po_id}")
        print(f"Vendor: {po.vendor_name}")
        print(f"Total Amount: ${po.total_amount:.2f}")
        print(f"Priority: {po.priority.value}")
        print(f"Items: {len(po.items)}")
        print(f"Approval Required: {po.approval_required}")
        
        for item in po.items:
            print(f"  - {item.sku_name}: {item.quantity} units @ ${item.unit_cost:.2f} = ${item.total_cost:.2f}")
            print(f"    Reason: {item.reason}")
    
    summary = generator.generate_po_summary(purchase_orders)
    print(f"\n=== SUMMARY ===")
    print(f"Total Orders: {summary['total_orders']}")
    print(f"Total Amount: ${summary['total_amount']:.2f}")
    print(f"Total Items: {summary['total_items']}")
    print(f"Priority Distribution: {summary['priority_distribution']}")
    print(f"Approval Required: {summary['approval_required']}")

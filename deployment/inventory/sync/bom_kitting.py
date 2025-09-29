"""
BOM (Bill of Materials) and kitting support for availability calculations.

Features:
- BOM structure management
- Component availability checking
- Kitting calculations
- Assembly planning
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class BOMItem:
    component_sku: str
    quantity_required: int
    unit_of_measure: str = "each"
    notes: Optional[str] = None


@dataclass
class BOM:
    assembly_sku: str
    version: str
    items: List[BOMItem]
    created_at: datetime
    is_active: bool = True


@dataclass
class KitAvailability:
    assembly_sku: str
    location_id: str
    max_assemblable: int
    limiting_components: List[str]
    component_shortages: Dict[str, int]
    total_cost: float
    assembly_time_hours: float


class BOMKittingManager:
    def __init__(self):
        self.boms: Dict[str, BOM] = {}
        self.inventory_levels: Dict[str, Dict[str, int]] = {}  # sku -> location -> quantity
    
    def add_bom(self, bom: BOM) -> str:
        """Add a BOM to the system."""
        key = f"{bom.assembly_sku}_{bom.version}"
        self.boms[key] = bom
        return key
    
    def get_bom(self, assembly_sku: str, version: str = "latest") -> Optional[BOM]:
        """Get a BOM by assembly SKU and version."""
        if version == "latest":
            # Find the latest active version
            active_boms = [bom for bom in self.boms.values() 
                          if bom.assembly_sku == assembly_sku and bom.is_active]
            if not active_boms:
                return None
            return max(active_boms, key=lambda b: b.created_at)
        
        key = f"{assembly_sku}_{version}"
        return self.boms.get(key)
    
    def update_inventory_level(self, sku: str, location_id: str, quantity: int):
        """Update inventory level for a component."""
        if sku not in self.inventory_levels:
            self.inventory_levels[sku] = {}
        self.inventory_levels[sku][location_id] = quantity
    
    def check_kit_availability(self, assembly_sku: str, location_id: str, version: str = "latest") -> Optional[KitAvailability]:
        """Check how many kits can be assembled at a location."""
        bom = self.get_bom(assembly_sku, version)
        if not bom:
            return None
        
        max_assemblable = float('inf')
        limiting_components = []
        component_shortages = {}
        total_cost = 0.0
        assembly_time_hours = 0.0
        
        for item in bom.items:
            component_sku = item.component_sku
            required_qty = item.quantity_required
            
            # Get available quantity
            available_qty = self.inventory_levels.get(component_sku, {}).get(location_id, 0)
            
            # Calculate how many assemblies this component can support
            can_assemble = available_qty // required_qty
            
            if can_assemble < max_assemblable:
                max_assemblable = can_assemble
                limiting_components = [component_sku]
            elif can_assemble == max_assemblable and can_assemble < float('inf'):
                limiting_components.append(component_sku)
            
            # Track shortages
            if available_qty < required_qty:
                shortage = required_qty - available_qty
                component_shortages[component_sku] = shortage
            
            # Mock cost and time calculations (in production would use real data)
            total_cost += required_qty * 10.0  # $10 per component
            assembly_time_hours += required_qty * 0.1  # 0.1 hours per component
        
        if max_assemblable == float('inf'):
            max_assemblable = 0
        
        return KitAvailability(
            assembly_sku=assembly_sku,
            location_id=location_id,
            max_assemblable=int(max_assemblable),
            limiting_components=limiting_components,
            component_shortages=component_shortages,
            total_cost=total_cost,
            assembly_time_hours=assembly_time_hours
        )
    
    def plan_assembly(self, assembly_sku: str, location_id: str, target_quantity: int, version: str = "latest") -> Dict[str, Any]:
        """Plan assembly production with component requirements."""
        availability = self.check_kit_availability(assembly_sku, location_id, version)
        if not availability:
            return {"error": "BOM not found"}
        
        if availability.max_assemblable < target_quantity:
            return {
                "can_fulfill": False,
                "max_assemblable": availability.max_assemblable,
                "shortage": target_quantity - availability.max_assemblable,
                "limiting_components": availability.limiting_components,
                "component_shortages": availability.component_shortages,
                "suggested_quantity": availability.max_assemblable
            }
        
        # Calculate component requirements
        bom = self.get_bom(assembly_sku, version)
        component_requirements = {}
        for item in bom.items:
            component_requirements[item.component_sku] = item.quantity_required * target_quantity
        
        return {
            "can_fulfill": True,
            "target_quantity": target_quantity,
            "component_requirements": component_requirements,
            "total_cost": availability.total_cost * target_quantity,
            "total_assembly_time": availability.assembly_time_hours * target_quantity,
            "bom_version": version
        }
    
    def get_all_assemblies_using_component(self, component_sku: str) -> List[str]:
        """Get all assemblies that use a specific component."""
        assemblies = []
        for bom in self.boms.values():
            if any(item.component_sku == component_sku for item in bom.items):
                assemblies.append(bom.assembly_sku)
        return assemblies

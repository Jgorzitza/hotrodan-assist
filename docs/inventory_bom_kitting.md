# BOM/Kitting Support in Availability Calculations

This document describes the Bill of Materials (BOM) and kitting system for assembly planning.

## Features

### BOM Management
- Multi-level BOM structures
- Version control and active/inactive states
- Component quantity requirements
- Unit of measure tracking

### Availability Calculations
- Component availability checking
- Assembly quantity calculations
- Limiting component identification
- Shortage analysis

### Assembly Planning
- Production planning with component requirements
- Cost and time estimation
- Feasibility analysis

## Usage

### 1. Create BOM
```python
from sync.bom_kitting import BOMKittingManager, BOM, BOMItem

manager = BOMKittingManager()
bom = BOM(
    assembly_sku="WIDGET_A",
    version="1.0",
    items=[
        BOMItem(component_sku="PART1", quantity_required=2),
        BOMItem(component_sku="PART2", quantity_required=1),
        BOMItem(component_sku="SCREW", quantity_required=4)
    ],
    created_at=datetime.now()
)
manager.add_bom(bom)
```

### 2. Update Inventory Levels
```python
manager.update_inventory_level("PART1", "LOC1", 100)
manager.update_inventory_level("PART2", "LOC1", 50)
manager.update_inventory_level("SCREW", "LOC1", 200)
```

### 3. Check Kit Availability
```python
availability = manager.check_kit_availability("WIDGET_A", "LOC1")
print(f"Can assemble: {availability.max_assemblable}")
print(f"Limiting components: {availability.limiting_components}")
```

### 4. Plan Assembly
```python
plan = manager.plan_assembly("WIDGET_A", "LOC1", target_quantity=10)
if plan["can_fulfill"]:
    print(f"Component requirements: {plan['component_requirements']}")
    print(f"Total cost: ${plan['total_cost']}")
else:
    print(f"Shortage: {plan['shortage']} units")
```

## BOM Structure

### BOMItem Fields
- `component_sku`: SKU of the component
- `quantity_required`: How many units needed per assembly
- `unit_of_measure`: Unit type (each, kg, m, etc.)
- `notes`: Additional information

### BOM Fields
- `assembly_sku`: SKU of the finished assembly
- `version`: BOM version for change tracking
- `items`: List of required components
- `created_at`: Creation timestamp
- `is_active`: Whether this BOM is currently active

## Availability Analysis

### KitAvailability Fields
- `max_assemblable`: Maximum assemblies possible
- `limiting_components`: Components that limit production
- `component_shortages`: Quantities needed to fulfill demand
- `total_cost`: Estimated cost per assembly
- `assembly_time_hours`: Estimated assembly time

## Testing
```bash
. .venv/bin/activate
python -m pytest -q test_bom_kitting.py
```

from datetime import datetime
from sync.bom_kitting import BOMKittingManager, BOM, BOMItem

def test_add_bom():
    manager = BOMKittingManager()
    bom = BOM(
        assembly_sku="ASSEMBLY1",
        version="1.0",
        items=[
            BOMItem(component_sku="COMP1", quantity_required=2),
            BOMItem(component_sku="COMP2", quantity_required=1)
        ],
        created_at=datetime.now()
    )
    
    key = manager.add_bom(bom)
    assert key == "ASSEMBLY1_1.0"
    assert "ASSEMBLY1_1.0" in manager.boms

def test_get_bom():
    manager = BOMKittingManager()
    bom = BOM(
        assembly_sku="ASSEMBLY1",
        version="1.0",
        items=[BOMItem(component_sku="COMP1", quantity_required=2)],
        created_at=datetime.now()
    )
    manager.add_bom(bom)
    
    retrieved = manager.get_bom("ASSEMBLY1", "1.0")
    assert retrieved is not None
    assert retrieved.assembly_sku == "ASSEMBLY1"

def test_check_kit_availability():
    manager = BOMKittingManager()
    
    # Add BOM
    bom = BOM(
        assembly_sku="ASSEMBLY1",
        version="1.0",
        items=[
            BOMItem(component_sku="COMP1", quantity_required=2),
            BOMItem(component_sku="COMP2", quantity_required=1)
        ],
        created_at=datetime.now()
    )
    manager.add_bom(bom)
    
    # Set inventory levels
    manager.update_inventory_level("COMP1", "LOC1", 10)  # Can make 5 assemblies
    manager.update_inventory_level("COMP2", "LOC1", 3)   # Can make 3 assemblies
    
    # Check availability
    availability = manager.check_kit_availability("ASSEMBLY1", "LOC1")
    assert availability is not None
    assert availability.max_assemblable == 3  # Limited by COMP2
    assert "COMP2" in availability.limiting_components

def test_plan_assembly():
    manager = BOMKittingManager()
    
    # Add BOM
    bom = BOM(
        assembly_sku="ASSEMBLY1",
        version="1.0",
        items=[
            BOMItem(component_sku="COMP1", quantity_required=2),
            BOMItem(component_sku="COMP2", quantity_required=1)
        ],
        created_at=datetime.now()
    )
    manager.add_bom(bom)
    
    # Set inventory levels
    manager.update_inventory_level("COMP1", "LOC1", 20)
    manager.update_inventory_level("COMP2", "LOC1", 5)
    
    # Plan assembly
    plan = manager.plan_assembly("ASSEMBLY1", "LOC1", 3)
    assert plan["can_fulfill"] == True
    assert plan["target_quantity"] == 3
    assert plan["component_requirements"]["COMP1"] == 6  # 2 * 3
    assert plan["component_requirements"]["COMP2"] == 3  # 1 * 3

def test_plan_assembly_insufficient_components():
    manager = BOMKittingManager()
    
    # Add BOM
    bom = BOM(
        assembly_sku="ASSEMBLY1",
        version="1.0",
        items=[
            BOMItem(component_sku="COMP1", quantity_required=2),
            BOMItem(component_sku="COMP2", quantity_required=1)
        ],
        created_at=datetime.now()
    )
    manager.add_bom(bom)
    
    # Set insufficient inventory
    manager.update_inventory_level("COMP1", "LOC1", 2)  # Can make 1 assembly
    manager.update_inventory_level("COMP2", "LOC1", 1)  # Can make 1 assembly
    
    # Plan assembly for 3 units
    plan = manager.plan_assembly("ASSEMBLY1", "LOC1", 3)
    assert plan["can_fulfill"] == False
    assert plan["max_assemblable"] == 1
    assert plan["shortage"] == 2

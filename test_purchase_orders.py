from sync.purchase_orders import calculate_eoq, calculate_reorder_point, generate_purchase_recommendations

def test_calculate_eoq():
    eoq = calculate_eoq(demand_rate=100, ordering_cost=50, holding_cost_rate=0.2, unit_cost=10)
    assert eoq > 0
    
    # Test edge cases
    assert calculate_eoq(0, 50, 0.2, 10) == 0
    assert calculate_eoq(100, 0, 0.2, 10) == 0

def test_calculate_reorder_point():
    rp = calculate_reorder_point(demand_rate=10, lead_time=5, safety_stock=20)
    assert rp == 70  # 10 * 5 + 20
    
    # Test edge cases
    assert calculate_reorder_point(0, 5, 20) == 20
    assert calculate_reorder_point(10, 0, 20) == 20

def test_generate_purchase_recommendations():
    sku_data = [
        {'sku': 'SKU1', 'location_id': 'LOC1', 'demand_rate': 10, 'lead_time': 5},
        {'sku': 'SKU2', 'location_id': 'LOC1', 'demand_rate': 20, 'lead_time': 3}
    ]
    current_stock = {'SKU1_LOC1': 5, 'SKU2_LOC1': 50}
    safety_stock = {'SKU1_LOC1': 10, 'SKU2_LOC1': 15}
    costs = {
        'SKU1_LOC1': {'unit_cost': 10, 'ordering_cost': 50, 'holding_cost_rate': 0.2},
        'SKU2_LOC1': {'unit_cost': 5, 'ordering_cost': 30, 'holding_cost_rate': 0.15}
    }
    
    recommendations = generate_purchase_recommendations(sku_data, current_stock, safety_stock, costs)
    
    assert len(recommendations) == 2
    assert recommendations[0].sku == 'SKU1'
    assert recommendations[0].urgency == 'critical'  # current (5) <= safety (10)
    assert recommendations[1].sku == 'SKU2'

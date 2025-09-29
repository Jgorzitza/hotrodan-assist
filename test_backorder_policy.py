from datetime import datetime, timedelta
from sync.backorder_policy import BackorderConfig, BackorderRequest, BackorderPolicy, evaluate_backorder_request, calculate_eta, generate_customer_communication

def test_calculate_eta():
    config = BackorderConfig(
        sku="SKU1",
        location_id="LOC1",
        policy=BackorderPolicy.ALLOW,
        supplier_lead_time_days=10,
        buffer_days=2
    )
    request = BackorderRequest(
        sku="SKU1",
        location_id="LOC1",
        requested_quantity=5,
        customer_id="CUST1",
        priority="normal"
    )
    
    eta = calculate_eta(config, request)
    assert eta.sku == "SKU1"
    assert eta.location_id == "LOC1"
    assert eta.confidence in ["high", "medium", "low"]

def test_evaluate_backorder_request_allow():
    config = BackorderConfig(
        sku="SKU1",
        location_id="LOC1",
        policy=BackorderPolicy.ALLOW,
        max_backorder_days=30,
        supplier_lead_time_days=10
    )
    request = BackorderRequest(
        sku="SKU1",
        location_id="LOC1",
        requested_quantity=5,
        customer_id="CUST1"
    )
    
    result = evaluate_backorder_request(config, request)
    assert "approved" in result
    assert "reason" in result
    assert "eta" in result

def test_evaluate_backorder_request_deny():
    config = BackorderConfig(
        sku="SKU1",
        location_id="LOC1",
        policy=BackorderPolicy.DENY
    )
    request = BackorderRequest(
        sku="SKU1",
        location_id="LOC1",
        requested_quantity=5,
        customer_id="CUST1"
    )
    
    result = evaluate_backorder_request(config, request)
    assert result["approved"] == False
    assert "not allowed" in result["reason"]

def test_generate_customer_communication():
    approval_result = {
        "approved": True,
        "reason": "Backorder approved",
        "eta": None
    }
    request = BackorderRequest(
        sku="SKU1",
        location_id="LOC1",
        requested_quantity=5,
        customer_id="CUST1"
    )
    
    communication = generate_customer_communication(approval_result, request)
    assert "SKU1" in communication
    assert "approved" in communication

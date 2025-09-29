from datetime import datetime, timedelta
from sync.lead_time_variability import LeadTimeVariabilityModel, LeadTimeRecord

def test_add_lead_time_record():
    model = LeadTimeVariabilityModel()
    record = LeadTimeRecord(
        supplier_id="SUPPLIER1",
        sku="SKU1",
        order_date=datetime.now() - timedelta(days=10),
        delivery_date=datetime.now() - timedelta(days=5),
        lead_time_days=5,
        quantity=100,
        on_time=True
    )
    
    model.add_lead_time_record(record)
    assert len(model.records) == 1
    assert "SUPPLIER1" in model.supplier_performance

def test_get_lead_time_stats():
    model = LeadTimeVariabilityModel()
    
    # Add multiple records
    for i in range(5):
        record = LeadTimeRecord(
            supplier_id="SUPPLIER1",
            sku="SKU1",
            order_date=datetime.now() - timedelta(days=20+i),
            delivery_date=datetime.now() - timedelta(days=15+i),
            lead_time_days=5+i,
            quantity=100,
            on_time=i < 4  # 4 out of 5 on time
        )
        model.add_lead_time_record(record)
    
    stats = model.get_lead_time_stats("SUPPLIER1", "SKU1")
    assert stats is not None
    assert stats.supplier_id == "SUPPLIER1"
    assert stats.sku == "SKU1"
    assert stats.sample_size == 5
    assert stats.on_time_percentage == 80.0  # 4/5 * 100

def test_calculate_safety_stock_adjustment():
    model = LeadTimeVariabilityModel()
    
    # Add records with high variability
    lead_times = [3, 5, 7, 4, 6, 8, 5, 9, 4, 6]
    for i, lt in enumerate(lead_times):
        record = LeadTimeRecord(
            supplier_id="SUPPLIER1",
            sku="SKU1",
            order_date=datetime.now() - timedelta(days=20+i),
            delivery_date=datetime.now() - timedelta(days=20+i-lt),
            lead_time_days=lt,
            quantity=100,
            on_time=lt <= 6  # On time if <= 6 days
        )
        model.add_lead_time_record(record)
    
    adjustment = model.calculate_safety_stock_adjustment("SUPPLIER1", "SKU1", 5)
    assert adjustment["adjusted_lead_time"] > 5  # Should be higher due to variability
    assert adjustment["safety_stock_multiplier"] > 1.0
    assert adjustment["variability_factor"] > 0

def test_get_supplier_rankings():
    model = LeadTimeVariabilityModel()
    
    # Add records for two suppliers
    for supplier_id in ["SUPPLIER1", "SUPPLIER2"]:
        for i in range(5):
            record = LeadTimeRecord(
                supplier_id=supplier_id,
                sku="SKU1",
                order_date=datetime.now() - timedelta(days=20+i),
                delivery_date=datetime.now() - timedelta(days=15+i),
                lead_time_days=5 if supplier_id == "SUPPLIER1" else 7,  # SUPPLIER1 faster
                quantity=100,
                on_time=True
            )
            model.add_lead_time_record(record)
    
    rankings = model.get_supplier_rankings()
    assert len(rankings) == 2
    assert rankings[0]["supplier_id"] == "SUPPLIER1"  # Should rank higher (faster)

def test_predict_lead_time():
    model = LeadTimeVariabilityModel()
    
    # Add records
    for i in range(10):
        record = LeadTimeRecord(
            supplier_id="SUPPLIER1",
            sku="SKU1",
            order_date=datetime.now() - timedelta(days=30+i),
            delivery_date=datetime.now() - timedelta(days=25+i),
            lead_time_days=5,
            quantity=100,
            on_time=True
        )
        model.add_lead_time_record(record)
    
    prediction = model.predict_lead_time("SUPPLIER1", "SKU1")
    assert prediction["predicted_lead_time"] == 5
    assert prediction["prediction_quality"] == "High"  # 10+ samples
    assert prediction["sample_size"] == 10

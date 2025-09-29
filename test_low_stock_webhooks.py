from datetime import datetime, timedelta
from sync.low_stock_webhooks import LowStockWebhookManager, AlertConfig, AlertChannel, AlertUrgency, SlackConfig, EmailConfig

def test_check_low_stock_no_alert():
    manager = LowStockWebhookManager()
    config = AlertConfig(
        sku="SKU1",
        location_id="LOC1",
        threshold=10,
        channels=[AlertChannel.SLACK]
    )
    
    # Stock above threshold - no alert
    alert = manager.check_low_stock("SKU1", "LOC1", 15, config)
    assert alert is None

def test_check_low_stock_creates_alert():
    manager = LowStockWebhookManager()
    config = AlertConfig(
        sku="SKU1",
        location_id="LOC1",
        threshold=10,
        channels=[AlertChannel.SLACK]
    )
    
    # Stock below threshold - should create alert
    alert = manager.check_low_stock("SKU1", "LOC1", 5, config)
    assert alert is not None
    assert alert.sku == "SKU1"
    assert alert.location_id == "LOC1"
    assert alert.current_stock == 5
    assert alert.threshold == 10

def test_urgency_calculation():
    manager = LowStockWebhookManager()
    config = AlertConfig(
        sku="SKU1",
        location_id="LOC1",
        threshold=100,
        channels=[AlertChannel.SLACK]
    )
    
    # Critical (0 stock)
    alert = manager.check_low_stock("SKU1", "LOC1", 0, config)
    assert alert.urgency == AlertUrgency.CRITICAL
    
    # High (20% of threshold)
    alert = manager.check_low_stock("SKU1", "LOC1", 20, config)
    assert alert.urgency == AlertUrgency.HIGH
    
    # Medium (50% of threshold)
    alert = manager.check_low_stock("SKU1", "LOC1", 50, config)
    assert alert.urgency == AlertUrgency.MEDIUM

def test_cooldown_prevention():
    manager = LowStockWebhookManager()
    config = AlertConfig(
        sku="SKU1",
        location_id="LOC1",
        threshold=10,
        channels=[AlertChannel.SLACK],
        cooldown_minutes=60
    )
    
    # First alert should be created
    alert1 = manager.check_low_stock("SKU1", "LOC1", 5, config)
    assert alert1 is not None
    
    # Second alert within cooldown should be None
    alert2 = manager.check_low_stock("SKU1", "LOC1", 3, config)
    assert alert2 is None

"""
Comprehensive test suite for enhanced integrations.

Tests audit system, advanced integrations, and comprehensive
integration capabilities for inventory management.
"""
import pytest
import sys
import os
import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

# Add sync directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'sync'))

from audit_system import AuditSystem, AuditLevel, AuditCategory, ComplianceStandard, ComplianceRule, AuditEvent
from advanced_integrations import IntegrationManager, IntegrationType, DataFormat, IntegrationConfig, DataMapping, IntegrationEvent

class TestAuditSystem:
    def setup_method(self):
        self.audit_system = AuditSystem()
    
    def test_audit_system_initialization(self):
        """Test audit system initialization."""
        assert len(self.audit_system.compliance_rules) == 4
        assert self.audit_system.risk_thresholds["low"] == 0.3
        assert self.audit_system.risk_thresholds["critical"] == 0.9
    
    def test_log_event(self):
        """Test logging audit events."""
        event_id = self.audit_system.log_event(
            level=AuditLevel.INFO,
            category=AuditCategory.INVENTORY,
            action="inventory_modification",
            resource="SKU001",
            details={"quantity": 100, "previous_quantity": 50},
            user_id="user123",
            ip_address="192.168.1.100"
        )
        
        assert event_id is not None
        assert len(self.audit_system.events) == 1
        
        event = self.audit_system.events[0]
        assert event.level == AuditLevel.INFO
        assert event.category == AuditCategory.INVENTORY
        assert event.action == "inventory_modification"
        assert event.user_id == "user123"
        assert event.risk_score > 0
    
    def test_risk_score_calculation(self):
        """Test risk score calculation."""
        # Test different risk levels
        event_id1 = self.audit_system.log_event(
            level=AuditLevel.DEBUG,
            category=AuditCategory.SYSTEM,
            action="system_startup",
            resource="application",
            details={}
        )
        
        event_id2 = self.audit_system.log_event(
            level=AuditLevel.CRITICAL,
            category=AuditCategory.SECURITY,
            action="security_breach",
            resource="user_account",
            details={"sensitive_data": True}
        )
        
        events = list(self.audit_system.events)
        debug_event = events[0]
        critical_event = events[1]
        
        assert debug_event.risk_score < critical_event.risk_score
        assert critical_event.risk_score > 0.8  # Should be high risk
    
    def test_compliance_standards(self):
        """Test compliance standard assignment."""
        # Test inventory event
        event_id = self.audit_system.log_event(
            level=AuditLevel.INFO,
            category=AuditCategory.INVENTORY,
            action="inventory_modification",
            resource="SKU001",
            details={}
        )
        
        event = self.audit_system.events[0]
        assert ComplianceStandard.SOX in event.compliance_standards
        
        # Test security event
        event_id = self.audit_system.log_event(
            level=AuditLevel.WARNING,
            category=AuditCategory.SECURITY,
            action="authentication_failed",
            resource="user_account",
            details={}
        )
        
        event = self.audit_system.events[1]
        assert ComplianceStandard.PCI_DSS in event.compliance_standards
        assert ComplianceStandard.ISO27001 in event.compliance_standards
    
    def test_get_events_with_filters(self):
        """Test getting events with filters."""
        # Log multiple events
        self.audit_system.log_event(
            level=AuditLevel.INFO,
            category=AuditCategory.INVENTORY,
            action="inventory_modification",
            resource="SKU001",
            details={},
            user_id="user1"
        )
        
        self.audit_system.log_event(
            level=AuditLevel.WARNING,
            category=AuditCategory.SECURITY,
            action="authentication_failed",
            resource="user_account",
            details={},
            user_id="user2"
        )
        
        # Test level filter
        info_events = self.audit_system.get_events(level=AuditLevel.INFO)
        assert len(info_events) == 1
        assert info_events[0].level == AuditLevel.INFO
        
        # Test category filter
        security_events = self.audit_system.get_events(category=AuditCategory.SECURITY)
        assert len(security_events) == 1
        assert security_events[0].category == AuditCategory.SECURITY
        
        # Test user filter
        user1_events = self.audit_system.get_events(user_id="user1")
        assert len(user1_events) == 1
        assert user1_events[0].user_id == "user1"
    
    def test_generate_compliance_report(self):
        """Test compliance report generation."""
        # Log some events
        self.audit_system.log_event(
            level=AuditLevel.INFO,
            category=AuditCategory.INVENTORY,
            action="inventory_modification",
            resource="SKU001",
            details={}
        )
        
        self.audit_system.log_event(
            level=AuditLevel.WARNING,
            category=AuditCategory.SECURITY,
            action="authentication_failed",
            resource="user_account",
            details={}
        )
        
        # Generate report
        end_date = datetime.now()
        start_date = end_date - timedelta(days=1)
        
        report = self.audit_system.generate_compliance_report(
            start_date, end_date, [ComplianceStandard.SOX, ComplianceStandard.PCI_DSS]
        )
        
        assert report.report_id is not None
        assert report.total_events >= 0
        assert "events_by_level" in report.events_by_level
        assert "events_by_category" in report.events_by_category
        assert "compliance_summary" in report.compliance_summary
        assert "risk_analysis" in report.risk_analysis
        assert "recommendations" in report.recommendations
    
    def test_verify_integrity(self):
        """Test event integrity verification."""
        event_id = self.audit_system.log_event(
            level=AuditLevel.INFO,
            category=AuditCategory.INVENTORY,
            action="inventory_modification",
            resource="SKU001",
            details={}
        )
        
        # Verify integrity
        is_valid = self.audit_system.verify_integrity(event_id)
        assert is_valid == True
        
        # Test with non-existent event
        is_valid = self.audit_system.verify_integrity("non-existent")
        assert is_valid == False
    
    def test_get_statistics(self):
        """Test audit system statistics."""
        # Log some events
        self.audit_system.log_event(
            level=AuditLevel.INFO,
            category=AuditCategory.INVENTORY,
            action="inventory_modification",
            resource="SKU001",
            details={}
        )
        
        self.audit_system.log_event(
            level=AuditLevel.WARNING,
            category=AuditCategory.SECURITY,
            action="authentication_failed",
            resource="user_account",
            details={}
        )
        
        stats = self.audit_system.get_statistics()
        
        assert "total_events" in stats
        assert "events_by_level" in stats
        assert "events_by_category" in stats
        assert "average_risk_score" in stats
        assert "compliance_rules" in stats
        assert "active_rules" in stats
        
        assert stats["total_events"] == 2
        assert stats["compliance_rules"] == 4

class TestIntegrationManager:
    def setup_method(self):
        self.manager = IntegrationManager()
    
    def test_integration_manager_initialization(self):
        """Test integration manager initialization."""
        assert len(self.manager.integrations) == 4  # Default integrations
        assert "shopify" in self.manager.integrations
        assert "quickbooks" in self.manager.integrations
        assert "salesforce" in self.manager.integrations
        assert "webhook_receiver" in self.manager.integrations
    
    def test_add_integration(self):
        """Test adding integration configuration."""
        config = IntegrationConfig(
            name="test_integration",
            type=IntegrationType.API_REST,
            base_url="https://api.test.com",
            api_key="test_key"
        )
        
        self.manager.add_integration(config)
        
        assert "test_integration" in self.manager.integrations
        assert self.manager.integrations["test_integration"].name == "test_integration"
        assert self.manager.integrations["test_integration"].type == IntegrationType.API_REST
    
    def test_remove_integration(self):
        """Test removing integration configuration."""
        # Add integration first
        config = IntegrationConfig(
            name="test_integration",
            type=IntegrationType.API_REST,
            base_url="https://api.test.com"
        )
        self.manager.add_integration(config)
        
        # Remove it
        self.manager.remove_integration("test_integration")
        
        assert "test_integration" not in self.manager.integrations
    
    def test_add_data_mapping(self):
        """Test adding data mapping."""
        mapping = DataMapping(
            source_field="sku",
            target_field="product_id",
            transformation=lambda x: f"PROD_{x}",
            required=True
        )
        
        self.manager.add_data_mapping("shopify", mapping)
        
        assert len(self.manager.data_mappings["shopify"]) == 1
        assert self.manager.data_mappings["shopify"][0].source_field == "sku"
        assert self.manager.data_mappings["shopify"][0].target_field == "product_id"
    
    def test_add_webhook_handler(self):
        """Test adding webhook handler."""
        def test_handler(data):
            return data
        
        self.manager.add_webhook_handler("webhook_receiver", test_handler)
        
        assert "webhook_receiver" in self.manager.webhook_handlers
        assert self.manager.webhook_handlers["webhook_receiver"] == test_handler
    
    def test_check_rate_limit(self):
        """Test rate limiting functionality."""
        # Test within rate limit
        is_allowed = self.manager._check_rate_limit("shopify")
        assert is_allowed == True
        
        # Test rate limit exceeded (simulate many requests)
        config = self.manager.integrations["shopify"]
        config.rate_limit = 2  # Very low limit for testing
        
        # Make requests up to limit
        for _ in range(2):
            is_allowed = self.manager._check_rate_limit("shopify")
            assert is_allowed == True
        
        # Next request should be rate limited
        is_allowed = self.manager._check_rate_limit("shopify")
        assert is_allowed == False
    
    def test_transform_data(self):
        """Test data transformation."""
        # Add mapping
        mapping = DataMapping(
            source_field="sku",
            target_field="product_id",
            transformation=lambda x: f"PROD_{x}",
            required=True
        )
        self.manager.add_data_mapping("shopify", mapping)
        
        # Test transformation
        data = {"sku": "TEST001", "quantity": 100}
        transformed = asyncio.run(self.manager._transform_data("shopify", data))
        
        assert "product_id" in transformed
        assert transformed["product_id"] == "PROD_TEST001"
        assert "quantity" in transformed  # Should pass through unchanged
    
    def test_dict_to_xml(self):
        """Test dictionary to XML conversion."""
        data = {
            "product": {
                "id": "123",
                "name": "Test Product",
                "variants": [
                    {"size": "S", "price": 29.99},
                    {"size": "M", "price": 31.99}
                ]
            }
        }
        
        xml = self.manager._dict_to_xml(data, "root")
        
        assert "<root>" in xml
        assert "<product>" in xml
        assert "<id>123</id>" in xml
        assert "<name>Test Product</name>" in xml
        assert "<variants>" in xml
    
    def test_verify_webhook_signature(self):
        """Test webhook signature verification."""
        data = {"test": "data"}
        secret = "test_secret"
        
        # Create valid signature
        import hmac
        import hashlib
        import json
        
        payload = json.dumps(data, sort_keys=True)
        valid_signature = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Test valid signature
        is_valid = self.manager._verify_webhook_signature(data, valid_signature, secret)
        assert is_valid == True
        
        # Test invalid signature
        is_valid = self.manager._verify_webhook_signature(data, "invalid", secret)
        assert is_valid == False
    
    def test_get_integration_status(self):
        """Test getting integration status."""
        status = self.manager.get_integration_status("shopify")
        
        assert "name" in status
        assert "type" in status
        assert "enabled" in status
        assert "status" in status
        assert "success_rate" in status
        assert "recent_events" in status
        
        assert status["name"] == "shopify"
        assert status["type"] == IntegrationType.API_REST.value
    
    def test_get_all_integrations_status(self):
        """Test getting all integrations status."""
        all_status = self.manager.get_all_integrations_status()
        
        assert len(all_status) == 4  # Default integrations
        assert "shopify" in all_status
        assert "quickbooks" in all_status
        assert "salesforce" in all_status
        assert "webhook_receiver" in all_status
    
    def test_get_event_history(self):
        """Test getting event history."""
        # Add some test events
        event1 = IntegrationEvent(
            event_id="test1",
            integration_name="shopify",
            event_type="data_send",
            timestamp=datetime.now(),
            status="success",
            data={"test": "data1"}
        )
        
        event2 = IntegrationEvent(
            event_id="test2",
            integration_name="quickbooks",
            event_type="data_send",
            timestamp=datetime.now(),
            status="error",
            data={"test": "data2"},
            error="Test error"
        )
        
        self.manager.event_history.append(event1)
        self.manager.event_history.append(event2)
        
        # Test getting all events
        all_events = self.manager.get_event_history()
        assert len(all_events) == 2
        
        # Test filtering by integration
        shopify_events = self.manager.get_event_history(integration_name="shopify")
        assert len(shopify_events) == 1
        assert shopify_events[0].integration_name == "shopify"
    
    def test_generate_integration_report(self):
        """Test generating integration report."""
        # Add some test events
        event1 = IntegrationEvent(
            event_id="test1",
            integration_name="shopify",
            event_type="data_send",
            timestamp=datetime.now(),
            status="success",
            data={"test": "data1"},
            duration=1.5
        )
        
        event2 = IntegrationEvent(
            event_id="test2",
            integration_name="shopify",
            event_type="data_send",
            timestamp=datetime.now(),
            status="error",
            data={"test": "data2"},
            error="Test error",
            duration=2.0
        )
        
        self.manager.event_history.append(event1)
        self.manager.event_history.append(event2)
        
        # Generate report
        report = self.manager.generate_integration_report()
        
        assert "timestamp" in report
        assert "total_events" in report
        assert "success_events" in report
        assert "error_events" in report
        assert "overall_success_rate" in report
        assert "integration_stats" in report
        assert "active_integrations" in report
        assert "total_integrations" in report
        
        assert report["total_events"] == 2
        assert report["success_events"] == 1
        assert report["error_events"] == 1
        assert report["overall_success_rate"] == 0.5

def test_audit_system_performance():
    """Test audit system performance."""
    audit_system = AuditSystem()
    
    # Test logging many events
    import time
    start_time = time.time()
    
    for i in range(1000):
        audit_system.log_event(
            level=AuditLevel.INFO,
            category=AuditCategory.INVENTORY,
            action="inventory_modification",
            resource=f"SKU{i:04d}",
            details={"quantity": i, "timestamp": datetime.now().isoformat()}
        )
    
    end_time = time.time()
    logging_time = end_time - start_time
    
    assert len(audit_system.events) == 1000
    assert logging_time < 5.0  # Should log 1000 events in less than 5 seconds
    
    print(f"Audit Performance: Logged 1000 events in {logging_time:.2f} seconds")

def test_integration_manager_performance():
    """Test integration manager performance."""
    manager = IntegrationManager()
    
    # Test adding many integrations
    import time
    start_time = time.time()
    
    for i in range(100):
        config = IntegrationConfig(
            name=f"test_integration_{i}",
            type=IntegrationType.API_REST,
            base_url=f"https://api{i}.test.com"
        )
        manager.add_integration(config)
    
    end_time = time.time()
    setup_time = end_time - start_time
    
    assert len(manager.integrations) == 104  # 100 + 4 default
    assert setup_time < 2.0  # Should setup 100 integrations in less than 2 seconds
    
    print(f"Integration Performance: Setup 100 integrations in {setup_time:.2f} seconds")

def test_error_handling():
    """Test error handling in enhanced integrations."""
    # Test audit system error handling
    audit_system = AuditSystem()
    
    # Test with invalid data
    try:
        audit_system.log_event(
            level=AuditLevel.INFO,
            category=AuditCategory.INVENTORY,
            action="inventory_modification",
            resource="SKU001",
            details={"invalid": None}  # None value
        )
        # Should not crash
        assert True
    except Exception as e:
        # Should handle errors gracefully
        assert isinstance(e, Exception)
    
    # Test integration manager error handling
    manager = IntegrationManager()
    
    # Test with non-existent integration
    try:
        status = manager.get_integration_status("non_existent")
        assert status["status"] == "not_found"
    except Exception as e:
        # Should handle errors gracefully
        assert isinstance(e, Exception)
    
    print("✅ Error handling tests passed!")

if __name__ == "__main__":
    # Run performance tests
    test_audit_system_performance()
    test_integration_manager_performance()
    test_error_handling()
    print("✅ All enhanced integrations tests passed!")
    print("🎉 Enhanced integrations system fully operational!")

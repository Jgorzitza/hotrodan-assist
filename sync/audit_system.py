"""
Comprehensive audit system for inventory management.

Provides detailed audit trails, compliance reporting, and
security monitoring for inventory operations.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
import json
import hashlib
import hmac
import uuid
from collections import defaultdict, deque
import threading
import time

class AuditLevel(Enum):
    """Audit level enumeration."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

class AuditCategory(Enum):
    """Audit category enumeration."""
    INVENTORY = "INVENTORY"
    USER_ACTION = "USER_ACTION"
    SYSTEM = "SYSTEM"
    SECURITY = "SECURITY"
    COMPLIANCE = "COMPLIANCE"
    INTEGRATION = "INTEGRATION"
    PERFORMANCE = "PERFORMANCE"

class ComplianceStandard(Enum):
    """Compliance standard enumeration."""
    SOX = "SOX"  # Sarbanes-Oxley
    PCI_DSS = "PCI_DSS"  # Payment Card Industry
    GDPR = "GDPR"  # General Data Protection Regulation
    HIPAA = "HIPAA"  # Health Insurance Portability
    ISO27001 = "ISO27001"  # Information Security Management
    CUSTOM = "CUSTOM"

@dataclass
class AuditEvent:
    """Audit event data structure."""
    event_id: str
    timestamp: datetime
    level: AuditLevel
    category: AuditCategory
    user_id: Optional[str]
    session_id: Optional[str]
    action: str
    resource: str
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    compliance_standards: List[ComplianceStandard] = field(default_factory=list)
    risk_score: float = 0.0
    hash: Optional[str] = None

@dataclass
class ComplianceRule:
    """Compliance rule definition."""
    rule_id: str
    name: str
    description: str
    standard: ComplianceStandard
    severity: AuditLevel
    conditions: Dict[str, Any]
    actions: List[str]
    enabled: bool = True

@dataclass
class AuditReport:
    """Audit report data structure."""
    report_id: str
    title: str
    start_date: datetime
    end_date: datetime
    total_events: int
    events_by_level: Dict[str, int]
    events_by_category: Dict[str, int]
    compliance_summary: Dict[str, Any]
    risk_analysis: Dict[str, Any]
    recommendations: List[str]
    generated_at: datetime

class AuditSystem:
    def __init__(self, secret_key: str = "audit-secret-key"):
        self.secret_key = secret_key
        self.events: deque = deque(maxlen=1000000)  # 1M events max
        self.compliance_rules: Dict[str, ComplianceRule] = {}
        self.audit_lock = threading.Lock()
        self.risk_thresholds = {
            "low": 0.3,
            "medium": 0.6,
            "high": 0.8,
            "critical": 0.9
        }
        
        # Initialize default compliance rules
        self._initialize_compliance_rules()
    
    def _initialize_compliance_rules(self):
        """Initialize default compliance rules."""
        default_rules = [
            ComplianceRule(
                rule_id="inv_001",
                name="Inventory Modification Tracking",
                description="Track all inventory modifications for SOX compliance",
                standard=ComplianceStandard.SOX,
                severity=AuditLevel.INFO,
                conditions={"action": "inventory_modification"},
                actions=["log_event", "notify_compliance"]
            ),
            ComplianceRule(
                rule_id="sec_001",
                name="Failed Authentication Attempts",
                description="Monitor failed authentication attempts for security",
                standard=ComplianceStandard.PCI_DSS,
                severity=AuditLevel.WARNING,
                conditions={"action": "authentication_failed", "count": 3},
                actions=["log_event", "alert_security", "block_user"]
            ),
            ComplianceRule(
                rule_id="data_001",
                name="Data Access Monitoring",
                description="Monitor data access for GDPR compliance",
                standard=ComplianceStandard.GDPR,
                severity=AuditLevel.INFO,
                conditions={"action": "data_access"},
                actions=["log_event", "notify_privacy_officer"]
            ),
            ComplianceRule(
                rule_id="perf_001",
                name="Performance Degradation",
                description="Monitor system performance degradation",
                standard=ComplianceStandard.ISO27001,
                severity=AuditLevel.WARNING,
                conditions={"action": "performance_issue", "threshold": 0.8},
                actions=["log_event", "alert_ops", "escalate"]
            )
        ]
        
        for rule in default_rules:
            self.compliance_rules[rule.rule_id] = rule
    
    def log_event(self, level: AuditLevel, category: AuditCategory, action: str, 
                  resource: str, details: Dict[str, Any], user_id: Optional[str] = None,
                  session_id: Optional[str] = None, ip_address: Optional[str] = None,
                  user_agent: Optional[str] = None) -> str:
        """Log an audit event."""
        event_id = str(uuid.uuid4())
        
        # Calculate risk score
        risk_score = self._calculate_risk_score(level, category, action, details)
        
        # Determine applicable compliance standards
        compliance_standards = self._get_applicable_standards(category, action)
        
        # Create audit event
        event = AuditEvent(
            event_id=event_id,
            timestamp=datetime.now(),
            level=level,
            category=category,
            user_id=user_id,
            session_id=session_id,
            action=action,
            resource=resource,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            compliance_standards=compliance_standards,
            risk_score=risk_score
        )
        
        # Generate hash for integrity
        event.hash = self._generate_event_hash(event)
        
        # Store event
        with self.audit_lock:
            self.events.append(event)
        
        # Check compliance rules
        self._check_compliance_rules(event)
        
        return event_id
    
    def _calculate_risk_score(self, level: AuditLevel, category: AuditCategory, 
                            action: str, details: Dict[str, Any]) -> float:
        """Calculate risk score for an event."""
        base_scores = {
            AuditLevel.DEBUG: 0.1,
            AuditLevel.INFO: 0.2,
            AuditLevel.WARNING: 0.5,
            AuditLevel.ERROR: 0.7,
            AuditLevel.CRITICAL: 0.9
        }
        
        category_multipliers = {
            AuditCategory.SECURITY: 1.5,
            AuditCategory.COMPLIANCE: 1.3,
            AuditCategory.USER_ACTION: 1.0,
            AuditCategory.SYSTEM: 0.8,
            AuditCategory.INVENTORY: 0.9,
            AuditCategory.INTEGRATION: 0.7,
            AuditCategory.PERFORMANCE: 0.6
        }
        
        base_score = base_scores.get(level, 0.5)
        category_multiplier = category_multipliers.get(category, 1.0)
        
        # Additional risk factors
        additional_risk = 0.0
        if "sensitive_data" in details and details["sensitive_data"]:
            additional_risk += 0.2
        if "external_access" in details and details["external_access"]:
            additional_risk += 0.1
        if "bulk_operation" in details and details["bulk_operation"]:
            additional_risk += 0.1
        
        risk_score = min(1.0, base_score * category_multiplier + additional_risk)
        return risk_score
    
    def _get_applicable_standards(self, category: AuditCategory, action: str) -> List[ComplianceStandard]:
        """Get applicable compliance standards for an event."""
        standards = []
        
        if category == AuditCategory.INVENTORY:
            standards.append(ComplianceStandard.SOX)
        if category == AuditCategory.SECURITY:
            standards.extend([ComplianceStandard.PCI_DSS, ComplianceStandard.ISO27001])
        if category == AuditCategory.COMPLIANCE:
            standards.append(ComplianceStandard.GDPR)
        if "payment" in action.lower() or "card" in action.lower():
            standards.append(ComplianceStandard.PCI_DSS)
        if "personal_data" in action.lower() or "customer" in action.lower():
            standards.append(ComplianceStandard.GDPR)
        
        return standards
    
    def _generate_event_hash(self, event: AuditEvent) -> str:
        """Generate integrity hash for an event."""
        # Create hashable string
        hash_data = f"{event.event_id}{event.timestamp.isoformat()}{event.level.value}{event.category.value}{event.action}{event.resource}{json.dumps(event.details, sort_keys=True)}"
        
        # Generate HMAC hash
        hash_obj = hmac.new(
            self.secret_key.encode(),
            hash_data.encode(),
            hashlib.sha256
        )
        
        return hash_obj.hexdigest()
    
    def _check_compliance_rules(self, event: AuditEvent):
        """Check compliance rules for an event."""
        for rule in self.compliance_rules.values():
            if not rule.enabled:
                continue
            
            if self._rule_matches(event, rule):
                self._execute_rule_actions(event, rule)
    
    def _rule_matches(self, event: AuditEvent, rule: ComplianceRule) -> bool:
        """Check if an event matches a compliance rule."""
        conditions = rule.conditions
        
        # Check action match
        if "action" in conditions:
            if not self._match_pattern(event.action, conditions["action"]):
                return False
        
        # Check category match
        if "category" in conditions:
            if event.category.value != conditions["category"]:
                return False
        
        # Check level match
        if "level" in conditions:
            if event.level.value != conditions["level"]:
                return False
        
        # Check risk score threshold
        if "threshold" in conditions:
            if event.risk_score < conditions["threshold"]:
                return False
        
        # Check count-based conditions
        if "count" in conditions:
            count = self._count_recent_events(event, conditions.get("count_window", 3600))
            if count < conditions["count"]:
                return False
        
        return True
    
    def _match_pattern(self, text: str, pattern: str) -> bool:
        """Check if text matches pattern (supports wildcards)."""
        if "*" in pattern:
            import fnmatch
            return fnmatch.fnmatch(text, pattern)
        return text == pattern
    
    def _count_recent_events(self, event: AuditEvent, window_seconds: int) -> int:
        """Count recent events matching criteria."""
        cutoff_time = event.timestamp - timedelta(seconds=window_seconds)
        
        count = 0
        for stored_event in self.events:
            if stored_event.timestamp < cutoff_time:
                break
            if (stored_event.user_id == event.user_id and 
                stored_event.action == event.action):
                count += 1
        
        return count
    
    def _execute_rule_actions(self, event: AuditEvent, rule: ComplianceRule):
        """Execute actions for a matched compliance rule."""
        for action in rule.actions:
            if action == "log_event":
                self._log_compliance_event(event, rule)
            elif action == "alert_security":
                self._alert_security(event, rule)
            elif action == "notify_compliance":
                self._notify_compliance(event, rule)
            elif action == "block_user":
                self._block_user(event, rule)
            elif action == "escalate":
                self._escalate_event(event, rule)
    
    def _log_compliance_event(self, event: AuditEvent, rule: ComplianceRule):
        """Log a compliance-related event."""
        compliance_event = AuditEvent(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            level=rule.severity,
            category=AuditCategory.COMPLIANCE,
            user_id=event.user_id,
            session_id=event.session_id,
            action="compliance_rule_triggered",
            resource=f"rule:{rule.rule_id}",
            details={
                "original_event_id": event.event_id,
                "rule_name": rule.name,
                "rule_description": rule.description,
                "standard": rule.standard.value
            },
            ip_address=event.ip_address,
            user_agent=event.user_agent,
            compliance_standards=[rule.standard],
            risk_score=event.risk_score
        )
        
        with self.audit_lock:
            self.events.append(compliance_event)
    
    def _alert_security(self, event: AuditEvent, rule: ComplianceRule):
        """Send security alert."""
        # In a real implementation, this would send alerts via email, Slack, etc.
        print(f"SECURITY ALERT: {rule.name} - Event: {event.event_id}")
    
    def _notify_compliance(self, event: AuditEvent, rule: ComplianceRule):
        """Notify compliance team."""
        # In a real implementation, this would send notifications
        print(f"COMPLIANCE NOTIFICATION: {rule.name} - Event: {event.event_id}")
    
    def _block_user(self, event: AuditEvent, rule: ComplianceRule):
        """Block user account."""
        # In a real implementation, this would block the user
        print(f"USER BLOCKED: {event.user_id} - Rule: {rule.name}")
    
    def _escalate_event(self, event: AuditEvent, rule: ComplianceRule):
        """Escalate event to management."""
        # In a real implementation, this would escalate the event
        print(f"EVENT ESCALATED: {rule.name} - Event: {event.event_id}")
    
    def get_events(self, start_date: Optional[datetime] = None, 
                   end_date: Optional[datetime] = None,
                   level: Optional[AuditLevel] = None,
                   category: Optional[AuditCategory] = None,
                   user_id: Optional[str] = None,
                   limit: int = 1000) -> List[AuditEvent]:
        """Get filtered audit events."""
        filtered_events = []
        
        for event in self.events:
            # Apply filters
            if start_date and event.timestamp < start_date:
                continue
            if end_date and event.timestamp > end_date:
                continue
            if level and event.level != level:
                continue
            if category and event.category != category:
                continue
            if user_id and event.user_id != user_id:
                continue
            
            filtered_events.append(event)
            
            if len(filtered_events) >= limit:
                break
        
        return filtered_events
    
    def generate_compliance_report(self, start_date: datetime, end_date: datetime,
                                 standards: List[ComplianceStandard]) -> AuditReport:
        """Generate compliance report for specified period and standards."""
        # Get events for the period
        events = self.get_events(start_date, end_date)
        
        # Filter by compliance standards
        compliance_events = []
        for event in events:
            if any(std in event.compliance_standards for std in standards):
                compliance_events.append(event)
        
        # Generate statistics
        events_by_level = defaultdict(int)
        events_by_category = defaultdict(int)
        
        for event in compliance_events:
            events_by_level[event.level.value] += 1
            events_by_category[event.category.value] += 1
        
        # Generate compliance summary
        compliance_summary = {}
        for standard in standards:
            standard_events = [e for e in compliance_events if standard in e.compliance_standards]
            compliance_summary[standard.value] = {
                "total_events": len(standard_events),
                "high_risk_events": len([e for e in standard_events if e.risk_score > 0.7]),
                "compliance_score": self._calculate_compliance_score(standard_events)
            }
        
        # Generate risk analysis
        risk_analysis = self._analyze_risks(compliance_events)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(compliance_events, risk_analysis)
        
        return AuditReport(
            report_id=str(uuid.uuid4()),
            title=f"Compliance Report - {start_date.date()} to {end_date.date()}",
            start_date=start_date,
            end_date=end_date,
            total_events=len(compliance_events),
            events_by_level=dict(events_by_level),
            events_by_category=dict(events_by_category),
            compliance_summary=compliance_summary,
            risk_analysis=risk_analysis,
            recommendations=recommendations,
            generated_at=datetime.now()
        )
    
    def _calculate_compliance_score(self, events: List[AuditEvent]) -> float:
        """Calculate compliance score for events."""
        if not events:
            return 1.0
        
        # Calculate based on risk scores and critical events
        total_risk = sum(event.risk_score for event in events)
        critical_events = len([e for e in events if e.level == AuditLevel.CRITICAL])
        
        # Normalize score (lower is better)
        avg_risk = total_risk / len(events)
        critical_penalty = critical_events * 0.1
        
        compliance_score = max(0.0, 1.0 - avg_risk - critical_penalty)
        return compliance_score
    
    def _analyze_risks(self, events: List[AuditEvent]) -> Dict[str, Any]:
        """Analyze risks in events."""
        if not events:
            return {"overall_risk": "low", "risk_factors": []}
        
        # Calculate risk distribution
        risk_scores = [event.risk_score for event in events]
        avg_risk = sum(risk_scores) / len(risk_scores)
        max_risk = max(risk_scores)
        
        # Determine overall risk level
        if max_risk >= self.risk_thresholds["critical"]:
            overall_risk = "critical"
        elif max_risk >= self.risk_thresholds["high"]:
            overall_risk = "high"
        elif avg_risk >= self.risk_thresholds["medium"]:
            overall_risk = "medium"
        else:
            overall_risk = "low"
        
        # Identify risk factors
        risk_factors = []
        if avg_risk > 0.7:
            risk_factors.append("High average risk score")
        if len([e for e in events if e.level == AuditLevel.CRITICAL]) > 0:
            risk_factors.append("Critical events detected")
        if len([e for e in events if e.category == AuditCategory.SECURITY]) > len(events) * 0.3:
            risk_factors.append("High security event ratio")
        
        return {
            "overall_risk": overall_risk,
            "average_risk": avg_risk,
            "max_risk": max_risk,
            "risk_factors": risk_factors,
            "risk_distribution": {
                "low": len([e for e in events if e.risk_score < 0.3]),
                "medium": len([e for e in events if 0.3 <= e.risk_score < 0.6]),
                "high": len([e for e in events if 0.6 <= e.risk_score < 0.8]),
                "critical": len([e for e in events if e.risk_score >= 0.8])
            }
        }
    
    def _generate_recommendations(self, events: List[AuditEvent], 
                                risk_analysis: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on events and risk analysis."""
        recommendations = []
        
        # Risk-based recommendations
        if risk_analysis["overall_risk"] == "critical":
            recommendations.append("Immediate action required - critical risk level detected")
        elif risk_analysis["overall_risk"] == "high":
            recommendations.append("High priority action required - high risk level detected")
        
        # Event-based recommendations
        security_events = len([e for e in events if e.category == AuditCategory.SECURITY])
        if security_events > len(events) * 0.2:
            recommendations.append("Review security policies - high number of security events")
        
        critical_events = len([e for e in events if e.level == AuditLevel.CRITICAL])
        if critical_events > 0:
            recommendations.append("Investigate critical events immediately")
        
        # Compliance-based recommendations
        if not recommendations:
            recommendations.append("System operating within normal risk parameters")
        
        return recommendations
    
    def verify_integrity(self, event_id: str) -> bool:
        """Verify the integrity of a specific audit event."""
        for event in self.events:
            if event.event_id == event_id:
                # Recalculate hash
                expected_hash = self._generate_event_hash(event)
                return event.hash == expected_hash
        
        return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get audit system statistics."""
        total_events = len(self.events)
        
        if total_events == 0:
            return {"total_events": 0}
        
        # Calculate statistics
        events_by_level = defaultdict(int)
        events_by_category = defaultdict(int)
        risk_scores = []
        
        for event in self.events:
            events_by_level[event.level.value] += 1
            events_by_category[event.category.value] += 1
            risk_scores.append(event.risk_score)
        
        return {
            "total_events": total_events,
            "events_by_level": dict(events_by_level),
            "events_by_category": dict(events_by_category),
            "average_risk_score": sum(risk_scores) / len(risk_scores),
            "max_risk_score": max(risk_scores),
            "compliance_rules": len(self.compliance_rules),
            "active_rules": len([r for r in self.compliance_rules.values() if r.enabled])
        }

def main():
    """Main function for testing audit system."""
    audit_system = AuditSystem()
    
    # Test logging events
    print("Testing audit system...")
    
    # Log some test events
    audit_system.log_event(
        level=AuditLevel.INFO,
        category=AuditCategory.INVENTORY,
        action="inventory_modification",
        resource="SKU001",
        details={"quantity": 100, "previous_quantity": 50},
        user_id="user123",
        ip_address="192.168.1.100"
    )
    
    audit_system.log_event(
        level=AuditLevel.WARNING,
        category=AuditCategory.SECURITY,
        action="authentication_failed",
        resource="user:admin",
        details={"attempts": 3, "ip_address": "192.168.1.200"},
        user_id="admin"
    )
    
    audit_system.log_event(
        level=AuditLevel.CRITICAL,
        category=AuditCategory.SYSTEM,
        action="system_failure",
        resource="database",
        details={"error": "Connection timeout", "duration": 300}
    )
    
    # Generate compliance report
    end_date = datetime.now()
    start_date = end_date - timedelta(days=1)
    
    report = audit_system.generate_compliance_report(
        start_date, end_date, [ComplianceStandard.SOX, ComplianceStandard.PCI_DSS]
    )
    
    print(f"\n=== AUDIT REPORT ===")
    print(f"Report ID: {report.report_id}")
    print(f"Total Events: {report.total_events}")
    print(f"Events by Level: {report.events_by_level}")
    print(f"Compliance Summary: {report.compliance_summary}")
    print(f"Risk Analysis: {report.risk_analysis}")
    print(f"Recommendations: {report.recommendations}")
    
    # Get statistics
    stats = audit_system.get_statistics()
    print(f"\n=== AUDIT STATISTICS ===")
    print(f"Total Events: {stats['total_events']}")
    print(f"Average Risk Score: {stats['average_risk_score']:.3f}")
    print(f"Active Rules: {stats['active_rules']}")

if __name__ == "__main__":
    main()

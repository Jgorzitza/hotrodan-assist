"""
Backorder policy rules and ETA surfacing.

Features:
- Backorder policy configuration per SKU/location
- ETA calculation based on supplier lead times
- Customer communication templates
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum


class BackorderPolicy(Enum):
    ALLOW = "allow"
    DENY = "deny"
    PARTIAL = "partial"


@dataclass
class BackorderConfig:
    sku: str
    location_id: str
    policy: BackorderPolicy
    max_backorder_days: int = 30
    supplier_lead_time_days: int = 14
    buffer_days: int = 3
    auto_approve_threshold: int = 5  # days


@dataclass
class ETAEstimate:
    sku: str
    location_id: str
    estimated_arrival: datetime
    confidence: str  # high, medium, low
    supplier: str
    tracking_info: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class BackorderRequest:
    sku: str
    location_id: str
    requested_quantity: int
    customer_id: str
    priority: str = "normal"  # low, normal, high, urgent
    requested_delivery: Optional[datetime] = None


def calculate_eta(config: BackorderConfig, request: BackorderRequest) -> ETAEstimate:
    """Calculate ETA for backorder request."""
    # Base calculation
    base_lead_time = config.supplier_lead_time_days + config.buffer_days
    
    # Adjust for priority
    priority_multiplier = {
        "low": 1.2,
        "normal": 1.0,
        "high": 0.8,
        "urgent": 0.6
    }.get(request.priority, 1.0)
    
    adjusted_days = int(base_lead_time * priority_multiplier)
    estimated_arrival = datetime.now() + timedelta(days=adjusted_days)
    
    # Determine confidence
    if adjusted_days <= config.auto_approve_threshold:
        confidence = "high"
    elif adjusted_days <= config.max_backorder_days:
        confidence = "medium"
    else:
        confidence = "low"
    
    return ETAEstimate(
        sku=request.sku,
        location_id=request.location_id,
        estimated_arrival=estimated_arrival,
        confidence=confidence,
        supplier=f"supplier_{request.sku}",
        notes=f"Priority: {request.priority}, Lead time: {adjusted_days} days"
    )


def evaluate_backorder_request(config: BackorderConfig, request: BackorderRequest) -> Dict[str, Any]:
    """Evaluate if backorder request should be approved."""
    if config.policy == BackorderPolicy.DENY:
        return {
            "approved": False,
            "reason": "Backorders not allowed for this SKU/location",
            "eta": None
        }
    
    eta = calculate_eta(config, request)
    
    if config.policy == BackorderPolicy.ALLOW:
        if eta.estimated_arrival <= datetime.now() + timedelta(days=config.max_backorder_days):
            return {
                "approved": True,
                "reason": f"Backorder approved, ETA: {eta.estimated_arrival.strftime('%Y-%m-%d')}",
                "eta": eta
            }
        else:
            return {
                "approved": False,
                "reason": f"ETA too far out: {eta.estimated_arrival.strftime('%Y-%m-%d')}",
                "eta": eta
            }
    
    elif config.policy == BackorderPolicy.PARTIAL:
        # Allow partial fulfillment
        if eta.estimated_arrival <= datetime.now() + timedelta(days=config.max_backorder_days):
            return {
                "approved": True,
                "reason": f"Partial backorder approved, ETA: {eta.estimated_arrival.strftime('%Y-%m-%d')}",
                "eta": eta,
                "partial_fulfillment": True
            }
        else:
            return {
                "approved": False,
                "reason": f"ETA too far out for partial fulfillment: {eta.estimated_arrival.strftime('%Y-%m-%d')}",
                "eta": eta
            }
    
    return {
        "approved": False,
        "reason": "Unknown policy",
        "eta": None
    }


def generate_customer_communication(approval_result: Dict[str, Any], request: BackorderRequest) -> str:
    """Generate customer communication about backorder status."""
    if approval_result["approved"]:
        eta = approval_result["eta"]
        if eta:
            return f"""
Dear Customer,

Your backorder request for {request.requested_quantity} units of {request.sku} has been approved.

Estimated delivery: {eta.estimated_arrival.strftime('%Y-%m-%d')}
Confidence level: {eta.confidence}
Supplier: {eta.supplier}

{eta.notes if eta.notes else ""}

We'll keep you updated on any changes to this timeline.

Best regards,
Inventory Team
"""
        else:
            return f"""
Dear Customer,

Your backorder request for {request.requested_quantity} units of {request.sku} has been approved.

We'll provide delivery details shortly.

Best regards,
Inventory Team
"""
    else:
        return f"""
Dear Customer,

Thank you for your interest in {request.sku}.

Unfortunately, we cannot fulfill your backorder request at this time.

Reason: {approval_result["reason"]}

We apologize for any inconvenience and encourage you to check back with us later.

Best regards,
Inventory Team
"""

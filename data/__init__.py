"""Data layer public interface."""
from .db import SessionLocal, engine, get_session
from .cache import Cache
from .blob_store import BlobStore
from .models import (
    Approval,
    AuditLog,
    Base,
    Conversation,
    Correction,
    Customer,
    Draft,
    FaqEntry,
    InventoryItem,
    Message,
    ModelRun,
    Order,
    ProductRequest,
    ShopifyCursor,
    StyleProfile,
)

__all__ = [
    "BlobStore",
    "Cache",
    "Approval",
    "AuditLog",
    "Base",
    "Conversation",
    "Correction",
    "Customer",
    "Draft",
    "FaqEntry",
    "InventoryItem",
    "Message",
    "ModelRun",
    "Order",
    "ProductRequest",
    "ShopifyCursor",
    "StyleProfile",
    "SessionLocal",
    "engine",
    "get_session",
]

from .repositories import ConversationRepository, CustomerRepository, DraftRepository
from .services import DemandMiningService, FaqPipelineService
from .read_models import CustomerSummary, get_customer_summary

__all__ += [
    "ConversationRepository",
    "CustomerRepository",
    "DraftRepository",
    "DemandMiningService",
    "FaqPipelineService",
    "CustomerSummary",
    "get_customer_summary",
]

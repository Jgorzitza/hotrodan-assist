"""
Base connector class for MCP integrations.
"""

import os
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum
import json
import time

logger = logging.getLogger(__name__)

class ConnectorStatus(Enum):
    DISABLED = "disabled"
    MOCK = "mock"
    LIVE = "live"
    ERROR = "error"

class ConnectorError(Exception):
    def __init__(self, message: str, error_code: str = "CONNECTOR_ERROR", status_code: int = 500):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)

@dataclass
class ConnectorConfig:
    name: str
    status: ConnectorStatus
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    timeout: int = 30
    cache_ttl: int = 300
    mock_data_path: Optional[str] = None
    
    def validate(self) -> None:
        if self.status == ConnectorStatus.LIVE:
            if not self.api_key:
                raise ConnectorError(f"API key required for {self.name} connector")

class BaseConnector(ABC):
    def __init__(self, config: ConnectorConfig):
        self.config = config
        self.config.validate()
        self._cache: Dict[str, Any] = {}
        
    @property
    def is_enabled(self) -> bool:
        return self.config.status in [ConnectorStatus.MOCK, ConnectorStatus.LIVE]
    
    @property
    def is_mock_mode(self) -> bool:
        return self.config.status == ConnectorStatus.MOCK
    
    def _load_mock_data(self, endpoint: str) -> Any:
        if not self.config.mock_data_path:
            return None
        try:
            mock_file = os.path.join(self.config.mock_data_path, f"{endpoint}.json")
            if os.path.exists(mock_file):
                with open(mock_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load mock data for {endpoint}: {e}")
        return None
    
    @abstractmethod
    def test_connection(self) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def get_health_status(self) -> Dict[str, Any]:
        pass
    
    def get_status(self) -> Dict[str, Any]:
        return {
            "name": self.config.name,
            "status": self.config.status.value,
            "enabled": self.is_enabled,
            "mock_mode": self.is_mock_mode,
            "cached_items": len(self._cache),
            "last_updated": time.time()
        }

from __future__ import annotations
import random
from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class CanaryConfig:
    canary_percentage: float
    canary_version: str
    stable_version: str
    enabled: bool = True

class CanaryRouter:
    def __init__(self, config: CanaryConfig):
        self.config = config

    def should_route_to_canary(self, user_id: str) -> bool:
        if not self.config.enabled:
            return False
        
        # Simple hash-based routing for consistent user experience
        hash_value = hash(user_id) % 100
        return hash_value < (self.config.canary_percentage * 100)

    def get_version(self, user_id: str) -> str:
        if self.should_route_to_canary(user_id):
            return self.config.canary_version
        return self.config.stable_version

    def update_config(self, new_config: CanaryConfig) -> None:
        self.config = new_config

class TrafficShifter:
    def __init__(self, router: CanaryRouter):
        self.router = router

    def shift_traffic(self, canary_percentage: float) -> None:
        new_config = CanaryConfig(
            canary_percentage=canary_percentage,
            canary_version=self.router.config.canary_version,
            stable_version=self.router.config.stable_version,
            enabled=canary_percentage > 0
        )
        self.router.update_config(new_config)

import pytest
from app.deployment.canary import CanaryRouter, CanaryConfig, TrafficShifter

def test_canary_routing():
    config = CanaryConfig(
        canary_percentage=0.1,  # 10%
        canary_version="v2.0.0",
        stable_version="v1.0.0"
    )
    router = CanaryRouter(config)
    
    # Test with same user ID for consistency
    user_id = "test-user-123"
    version = router.get_version(user_id)
    assert version in ["v1.0.0", "v2.0.0"]
    
    # Should be consistent for same user
    version2 = router.get_version(user_id)
    assert version == version2

def test_traffic_shifting():
    config = CanaryConfig(
        canary_percentage=0.0,
        canary_version="v2.0.0",
        stable_version="v1.0.0"
    )
    router = CanaryRouter(config)
    shifter = TrafficShifter(router)
    
    shifter.shift_traffic(0.5)  # 50% traffic
    assert router.config.canary_percentage == 0.5
    assert router.config.enabled is True

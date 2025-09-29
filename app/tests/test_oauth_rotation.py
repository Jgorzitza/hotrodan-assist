from pathlib import Path
import pytest
from app.security.oauth_rotation import OAuthSecretManager

def test_oauth_secret_rotation(tmp_path: Path):
    manager = OAuthSecretManager(tmp_path / "secrets.json")
    secret = manager.rotate_secret("test-client", "new-secret-123", ttl_days=30)
    assert secret.client_id == "test-client"
    assert secret.client_secret == "new-secret-123"
    assert secret.is_active is True

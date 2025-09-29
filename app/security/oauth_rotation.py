from __future__ import annotations
import json
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Optional

@dataclass
class OAuthSecret:
    client_id: str
    client_secret: str
    created_at: str
    expires_at: str
    is_active: bool = True

class OAuthSecretManager:
    def __init__(self, secrets_path: str | Path) -> None:
        self._path = Path(secrets_path)
        self._path.parent.mkdir(parents=True, exist_ok=True)

    def rotate_secret(self, client_id: str, new_secret: str, ttl_days: int = 90) -> OAuthSecret:
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=ttl_days)
        secret = OAuthSecret(
            client_id=client_id,
            client_secret=new_secret,
            created_at=now.isoformat(),
            expires_at=expires.isoformat(),
        )
        self._save_secret(secret)
        return secret

    def _save_secret(self, secret: OAuthSecret) -> None:
        data = {
            "client_id": secret.client_id,
            "client_secret": secret.client_secret,
            "created_at": secret.created_at,
            "expires_at": secret.expires_at,
            "is_active": secret.is_active,
        }
        self._path.write_text(json.dumps(data, indent=2), encoding="utf-8")

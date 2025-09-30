"""Zoho Mail client with OAuth refresh support."""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx

ZOHO_BASE_URL = "https://mail.zoho.com/api"
ZOHO_AUTH_URL = "https://accounts.zoho.com/oauth/v2/token"


@dataclass
class ZohoCredentials:
    client_id: str
    client_secret: str
    refresh_token: str
    org_id: str


class ZohoClient:
    """Minimal Zoho Mail API wrapper with token refresh."""

    def __init__(self, creds: ZohoCredentials | None = None, *, timeout: float = 15.0) -> None:
        if creds is None:
            creds = ZohoCredentials(
                client_id=_require("ZOHO_CLIENT_ID"),
                client_secret=_require("ZOHO_CLIENT_SECRET"),
                refresh_token=_require("ZOHO_REFRESH_TOKEN"),
                org_id=_require("ZOHO_ORG_ID"),
            )
        self.creds = creds
        self._token: Optional[str] = None
        self._timeout = timeout
        self._client = httpx.AsyncClient(timeout=timeout)

    async def close(self) -> None:
        await self._client.aclose()

    async def _ensure_token(self) -> str:
        if self._token:
            return self._token
        await self._refresh_token()
        assert self._token is not None
        return self._token

    async def _refresh_token(self) -> None:
        payload = {
            "refresh_token": self.creds.refresh_token,
            "client_id": self.creds.client_id,
            "client_secret": self.creds.client_secret,
            "grant_type": "refresh_token",
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(ZOHO_AUTH_URL, data=payload)
        resp.raise_for_status()
        data = resp.json()
        self._token = data["access_token"]

    async def fetch_thread(self, thread_id: str) -> Dict[str, Any]:
        token = await self._ensure_token()
        url = f"{ZOHO_BASE_URL}/accounts/{self.creds.org_id}/messages/thread/{thread_id}"
        resp = await self._client.get(url, headers=self._headers(token))
        resp.raise_for_status()
        return resp.json()

    async def send_message(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        token = await self._ensure_token()
        url = f"{ZOHO_BASE_URL}/accounts/{self.creds.org_id}/messages"
        resp = await self._client.post(url, headers=self._headers(token), json=payload)
        resp.raise_for_status()
        return resp.json()

    def _headers(self, token: str) -> Dict[str, str]:
        return {
            "Authorization": f"Zoho-oauthtoken {token}",
            "X-Zoho-OrgId": self.creds.org_id,
            "Content-Type": "application/json",
        }


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"{key} must be set for Zoho client")
    return value

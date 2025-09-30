"""Shopify REST/GraphQL client utilities."""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx

SHOPIFY_REST_BASE = "https://{shop}.myshopify.com/admin/api/{version}"
SHOPIFY_GRAPHQL_URL = "https://{shop}.myshopify.com/admin/api/{version}/graphql.json"


@dataclass
class ShopifyCredentials:
    shop: str
    access_token: str
    api_version: str


class ShopifyClient:
    """Minimal Shopify client with REST + GraphQL helpers."""

    def __init__(self, creds: ShopifyCredentials | None = None, *, timeout: float = 15.0) -> None:
        if creds is None:
            creds = ShopifyCredentials(
                shop=_require("SHOPIFY_SHOP"),
                access_token=_require("SHOPIFY_ACCESS_TOKEN"),
                api_version=os.getenv("SHOPIFY_API_VERSION", "2024-07"),
            )
        self.creds = creds
        self._client = httpx.AsyncClient(timeout=timeout)
        self._timeout = timeout

    async def close(self) -> None:
        await self._client.aclose()

    async def rest_get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = self._rest_url(path)
        resp = await self._client.get(url, headers=self._headers(), params=params)
        resp.raise_for_status()
        return resp.json()

    async def rest_post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = self._rest_url(path)
        resp = await self._client.post(url, headers=self._headers(), json=payload)
        resp.raise_for_status()
        return resp.json()

    async def graphql(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = SHOPIFY_GRAPHQL_URL.format(shop=self.creds.shop, version=self.creds.api_version)
        resp = await self._client.post(url, headers=self._headers(), json={"query": query, "variables": variables or {}})
        resp.raise_for_status()
        return resp.json()

    def _headers(self) -> Dict[str, str]:
        return {
            "X-Shopify-Access-Token": self.creds.access_token,
            "Content-Type": "application/json",
        }

    def _rest_url(self, path: str) -> str:
        base = SHOPIFY_REST_BASE.format(shop=self.creds.shop, version=self.creds.api_version)
        return f"{base}/{path.lstrip('/')}"


def _require(key: str) -> str:
    value = os.getenv(key)
    if not value:
        raise RuntimeError(f"{key} must be set for Shopify client")
    return value

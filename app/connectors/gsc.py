
from datetime import datetime
from typing import Dict, List, Optional

import httpx

from .base import (
    BaseConnector,
    ConnectorConfig,
    ConnectorError,
    ConnectorResponse,
    ConnectorStatus,
)


class GSCConnector(BaseConnector):
    """Google Search Console connector for search analytics and sitemap status."""

    DEFAULT_BASE_URL = "https://www.googleapis.com/webmasters/v3"

    def __init__(self, config: ConnectorConfig) -> None:
        super().__init__(config)
        self.base_url = config.base_url or self.DEFAULT_BASE_URL
        self.site_url = config.api_key and config.api_key.split(":")[-1]

    async def _auth_headers(self) -> Dict[str, str]:
        if not self.config.api_key:
            return {"X-Mock-Mode": "true"}
        return {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

    async def health_check(self) -> ConnectorResponse:
        if self.config.use_mock:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                {"status": "mock", "timestamp": datetime.utcnow().isoformat()},
                "GSC connector operating in mock mode",
            )

        if not self.site_url:
            raise ConnectorError(
                "GSC site url missing",
                status=ConnectorStatus.ERROR,
                error_code="missing_site_url",
            )

        async def operation() -> ConnectorResponse:
            client = await self._get_client()
            response = await client.get(
                f"{self.base_url}/sites/{self.site_url}",
                headers=await self._auth_headers(),
            )
            if response.status_code != 200:
                raise self._handle_http_error(response)
            payload = response.json()
            return self._create_response(
                ConnectorStatus.SUCCESS,
                {
                    "status": payload.get("siteUrl", "unknown"),
                    "permissionLevel": payload.get("permissionLevel"),
                    "timestamp": datetime.utcnow().isoformat(),
                },
                "GSC site status fetched",
            )

        return await self._execute_with_resilience("gsc.health", operation)

    async def test_connection(self) -> ConnectorResponse:
        return await self.health_check()

    async def get_search_queries(
        self,
        start_date: datetime,
        end_date: datetime,
        dimensions: Optional[List[str]] = None,
        row_limit: int = 250,
    ) -> ConnectorResponse:
        if self.config.use_mock:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                self._load_mock_json("search_queries.json"),
                "GSC search queries (mock)",
            )

        dimensions = dimensions or ["query"]
        request_body = {
            "startDate": start_date.strftime("%Y-%m-%d"),
            "endDate": end_date.strftime("%Y-%m-%d"),
            "dimensions": dimensions,
            "rowLimit": min(row_limit, 5000),
        }

        cache_key = self._cache_key(
            "gsc.search",
            start=start_date.isoformat(),
            end=end_date.isoformat(),
            dims=",".join(dimensions),
            limit=row_limit,
        )
        cached = self._cache_get(cache_key)
        if cached:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                cached,
                "GSC search queries (cached)",
            )

        async def operation() -> ConnectorResponse:
            client = await self._get_client()
            response = await client.post(
                f"{self.base_url}/sites/{self.site_url}/searchAnalytics/query",
                headers=await self._auth_headers(),
                json=request_body,
            )
            if response.status_code != 200:
                raise self._handle_http_error(response)
            payload = response.json()
            self._cache_set(cache_key, payload)
            return self._create_response(
                ConnectorStatus.SUCCESS,
                payload,
                "GSC search queries (live)",
            )

        return await self._execute_with_resilience("gsc.search", operation)

    async def get_sitemaps(self) -> ConnectorResponse:
        if self.config.use_mock:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                self._load_mock_json("sitemaps.json"),
                "GSC sitemaps (mock)",
            )

        cache_key = self._cache_key("gsc.sitemaps")
        cached = self._cache_get(cache_key)
        if cached:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                cached,
                "GSC sitemaps (cached)",
            )

        async def operation() -> ConnectorResponse:
            client = await self._get_client()
            response = await client.get(
                f"{self.base_url}/sites/{self.site_url}/sitemaps",
                headers=await self._auth_headers(),
            )
            if response.status_code != 200:
                raise self._handle_http_error(response)
            payload = response.json()
            self._cache_set(cache_key, payload)
            return self._create_response(
                ConnectorStatus.SUCCESS,
                payload,
                "GSC sitemaps (live)",
            )

        return await self._execute_with_resilience("gsc.sitemaps", operation)

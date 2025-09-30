
from datetime import datetime
from typing import Dict, Optional

import httpx

from .base import (
    BaseConnector,
    ConnectorConfig,
    ConnectorError,
    ConnectorResponse,
    ConnectorStatus,
)


class BingConnector(BaseConnector):
    """Bing Webmaster Tools connector for search analytics and index metrics."""

    DEFAULT_BASE_URL = "https://ssl.bing.com/webmaster/api.svc/json"

    def __init__(self, config: ConnectorConfig) -> None:
        super().__init__(config)
        self.base_url = config.base_url or self.DEFAULT_BASE_URL
        self.site_url = config.api_key and config.api_key.split(":")[-1]

    async def _auth_params(self) -> Dict[str, str]:
        if not self.config.api_key:
            return {}
        return {"ApiKey": self.config.api_key}

    async def health_check(self) -> ConnectorResponse:
        if self.config.use_mock:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                {"status": "mock", "timestamp": datetime.utcnow().isoformat()},
                "Bing connector operating in mock mode",
            )

        if not self.site_url:
            raise ConnectorError(
                "Bing site url missing",
                status=ConnectorStatus.ERROR,
                error_code="missing_site_url",
            )

        async def operation() -> ConnectorResponse:
            client = await self._get_client()
            response = await client.get(
                f"{self.base_url}/GetQuota?siteUrl={self.site_url}",
                params=await self._auth_params(),
            )
            if response.status_code != 200:
                raise self._handle_http_error(response)
            payload = response.json()
            return self._create_response(
                ConnectorStatus.SUCCESS,
                {
                    "status": "ok",
                    "quota": payload.get("d"),
                    "timestamp": datetime.utcnow().isoformat(),
                },
                "Bing quota retrieved",
            )

        return await self._execute_with_resilience("bing.health", operation)

    async def test_connection(self) -> ConnectorResponse:
        return await self.health_check()

    async def get_search_performance(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> ConnectorResponse:
        if self.config.use_mock:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                self._load_mock_json("performance.json"),
                "Bing search performance (mock)",
            )

        request_body = {
            "siteUrl": self.site_url,
            "startDate": start_date.strftime("%Y-%m-%d"),
            "endDate": end_date.strftime("%Y-%m-%d"),
        }

        cache_key = self._cache_key(
            "bing.performance",
            start=start_date.isoformat(),
            end=end_date.isoformat(),
        )
        cached = self._cache_get(cache_key)
        if cached:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                cached,
                "Bing search performance (cached)",
            )

        async def operation() -> ConnectorResponse:
            client = await self._get_client()
            response = await client.post(
                f"{self.base_url}/GetQueryStats",
                params=await self._auth_params(),
                json=request_body,
            )
            if response.status_code != 200:
                raise self._handle_http_error(response)
            payload = response.json()
            self._cache_set(cache_key, payload)
            return self._create_response(
                ConnectorStatus.SUCCESS,
                payload,
                "Bing search performance (live)",
            )

        return await self._execute_with_resilience("bing.performance", operation)

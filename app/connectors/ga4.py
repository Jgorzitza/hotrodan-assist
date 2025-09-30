
import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

from .base import BaseConnector, ConnectorConfig, ConnectorError, ConnectorResponse, ConnectorStatus


class GA4Connector(BaseConnector):
    """Google Analytics 4 connector providing traffic, events, and conversion metrics."""

    DEFAULT_BASE_URL = "https://analyticsdata.googleapis.com/v1beta"

    def __init__(self, config: ConnectorConfig) -> None:
        super().__init__(config)
        self.base_url = config.base_url or self.DEFAULT_BASE_URL
        self.property_id = config.api_key and config.api_key.split(":")[-1]

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
                "GA4 connector operating in mock mode",
            )

        if not self.property_id:
            raise ConnectorError(
                "GA4 property id missing",
                status=ConnectorStatus.ERROR,
                error_code="missing_property_id",
            )

        async def operation() -> ConnectorResponse:
            client = await self._get_client()
            response = await client.get(
                f"{self.base_url}/properties/{self.property_id}/metadata",
                headers=await self._auth_headers(),
            )
            if response.status_code != 200:
                raise self._handle_http_error(response)
            payload = response.json()
            return self._create_response(
                ConnectorStatus.SUCCESS,
                {
                    "status": "ok",
                    "property": payload.get("name"),
                    "timestamp": datetime.utcnow().isoformat(),
                },
                "GA4 metadata lookup successful",
            )

        return await self._execute_with_resilience("ga4.health", operation)

    async def test_connection(self) -> ConnectorResponse:
        return await self.health_check()

    async def get_traffic_summary(
        self,
        start: datetime,
        end: datetime,
        metrics: Optional[List[str]] = None,
    ) -> ConnectorResponse:
        if self.config.use_mock:
            data = self._load_mock_json("traffic_summary.json")
            return self._create_response(
                ConnectorStatus.SUCCESS,
                data,
                "GA4 traffic summary (mock)",
            )

        metrics = metrics or ["activeUsers", "newUsers", "sessions", "engagementRate"]
        request_body = {
            "dateRanges": [
                {
                    "startDate": start.strftime("%Y-%m-%d"),
                    "endDate": end.strftime("%Y-%m-%d"),
                }
            ],
            "metrics": [{"name": name} for name in metrics],
            "dimensions": [{"name": "date"}],
        }

        cache_key = self._cache_key(
            "ga4.traffic",
            start=start.isoformat(),
            end=end.isoformat(),
            metrics=",".join(metrics),
        )
        cached = self._cache_get(cache_key)
        if cached:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                cached,
                "GA4 traffic summary (cached)",
            )

        async def operation() -> ConnectorResponse:
            client = await self._get_client()
            response = await client.post(
                f"{self.base_url}/properties/{self.property_id}:runReport",
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
                "GA4 traffic summary (live)",
            )

        return await self._execute_with_resilience("ga4.traffic", operation)

    async def get_events(
        self,
        start: datetime,
        end: datetime,
        event_names: Optional[List[str]] = None,
    ) -> ConnectorResponse:
        if self.config.use_mock:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                self._load_mock_json("events.json"),
                "GA4 events (mock)",
            )

        request_body = {
            "dateRanges": [
                {
                    "startDate": start.strftime("%Y-%m-%d"),
                    "endDate": end.strftime("%Y-%m-%d"),
                }
            ],
            "dimensions": [{"name": "eventName"}],
            "metrics": [{"name": "eventCount"}],
        }
        if event_names:
            request_body["dimensionFilter"] = {
                "filter": {
                    "fieldName": "eventName",
                    "inListFilter": {"values": event_names},
                }
            }

        cache_key = self._cache_key(
            "ga4.events",
            start=start.isoformat(),
            end=end.isoformat(),
            events=",".join(event_names or []),
        )
        cached = self._cache_get(cache_key)
        if cached:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                cached,
                "GA4 events (cached)",
            )

        async def operation() -> ConnectorResponse:
            client = await self._get_client()
            response = await client.post(
                f"{self.base_url}/properties/{self.property_id}:runReport",
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
                "GA4 events (live)",
            )

        return await self._execute_with_resilience("ga4.events", operation)

    async def get_conversions(
        self,
        start: datetime,
        end: datetime,
        conversions: Optional[List[str]] = None,
    ) -> ConnectorResponse:
        if self.config.use_mock:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                self._load_mock_json("conversions.json"),
                "GA4 conversions (mock)",
            )

        conversions = conversions or ["purchase", "form_submit"]
        request_body = {
            "dateRanges": [
                {
                    "startDate": start.strftime("%Y-%m-%d"),
                    "endDate": end.strftime("%Y-%m-%d"),
                }
            ],
            "dimensions": [{"name": "eventName"}],
            "metrics": [{"name": "conversions"}, {"name": "totalRevenue"}],
            "dimensionFilter": {
                "filter": {
                    "fieldName": "eventName",
                    "inListFilter": {"values": conversions},
                }
            },
        }

        cache_key = self._cache_key(
            "ga4.conversions",
            start=start.isoformat(),
            end=end.isoformat(),
            conversions=",".join(conversions),
        )
        cached = self._cache_get(cache_key)
        if cached:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                cached,
                "GA4 conversions (cached)",
            )

        async def operation() -> ConnectorResponse:
            client = await self._get_client()
            response = await client.post(
                f"{self.base_url}/properties/{self.property_id}:runReport",
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
                "GA4 conversions (live)",
            )

        return await self._execute_with_resilience("ga4.conversions", operation)

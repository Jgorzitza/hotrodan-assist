"""
Production-optimized Zoho Mail API connector for MCP integrations.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from .base import (
    BaseConnector,
    ConnectorConfig,
    ConnectorError,
    ConnectorResponse,
    ConnectorStatus,
)


class ZohoConnector(BaseConnector):
    """Production-optimized Zoho Mail API connector with resilience patterns."""

    def __init__(self, config: ConnectorConfig) -> None:
        super().__init__(config)
        self.base_url = "https://mail.zoho.com/api" if config.endpoint else None
        self.headers = (
            {
                "Authorization": f"Zoho-oauthtoken {config.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "MCP-Connector/1.0",
            }
            if config.api_key
            else {}
        )

    async def health_check(self) -> ConnectorResponse:
        """Check if Zoho Mail API is accessible with production monitoring."""
        if self.config.use_mocks:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                {
                    "status": "healthy",
                    "mode": "mock",
                    "timestamp": datetime.utcnow().isoformat(),
                    "api_version": "v1",
                },
                "Zoho Mail connector in mock mode",
            )

        if not self.base_url:
            return self._create_response(
                ConnectorStatus.ERROR,
                None,
                "Zoho Mail endpoint not configured",
                "MISSING_ENDPOINT",
            )

        async def _health_check_operation() -> ConnectorResponse:
            client = await self._get_http_client()
            response = await client.get(
                f"{self.base_url}/accounts", headers=self.headers
            )

            if response.status_code == 200:
                account_data = response.json()
                return self._create_response(
                    ConnectorStatus.SUCCESS,
                    {
                        "accounts": account_data.get("data", []),
                        "mode": "live",
                        "response_time_ms": response.elapsed.total_seconds() * 1000,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    "Zoho Mail API accessible",
                )
            else:
                raise self._handle_http_error(response.status_code, response.text)

        try:
            return await self._execute_with_resilience(
                "health_check", _health_check_operation
            )
        except ConnectorError:
            raise
        except Exception as e:
            raise ConnectorError(
                f"Unexpected error checking Zoho Mail health: {str(e)}",
                original_error=e,
            )

    async def test_connection(self) -> ConnectorResponse:
        """Test the Zoho Mail connection with production monitoring."""
        if self.config.use_mocks:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                {
                    "test": "passed",
                    "mode": "mock",
                    "timestamp": datetime.utcnow().isoformat(),
                },
                "Zoho Mail connection test passed (mock mode)",
            )

        async def _test_connection_operation() -> ConnectorResponse:
            client = await self._get_http_client()
            response = await client.get(
                f"{self.base_url}/accounts", headers=self.headers
            )

            if response.status_code == 200:
                account_data = response.json().get("data", [])
                return self._create_response(
                    ConnectorStatus.SUCCESS,
                    {
                        "account_count": len(account_data),
                        "accounts": [
                            acc.get("accountName") for acc in account_data[:3]
                        ],
                        "mode": "live",
                        "response_time_ms": response.elapsed.total_seconds() * 1000,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    "Zoho Mail connection successful",
                )
            else:
                raise self._handle_http_error(response.status_code, response.text)

        try:
            return await self._execute_with_resilience(
                "test_connection", _test_connection_operation
            )
        except ConnectorError:
            raise
        except Exception as e:
            raise ConnectorError(
                f"Zoho Mail connection test failed: {str(e)}", original_error=e
            )

    async def get_inbound_emails(
        self,
        account_id: str,
        limit: int = 50,
        folder_id: str = "inbox",
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> ConnectorResponse:
        """Fetch inbound emails from Zoho Mail with caching and production optimizations."""
        if self.config.use_mocks:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                self._get_mock_emails(),
                "Inbound emails fetched (mock mode)",
            )

        # Check cache first
        cache_key = self._get_cache_key(
            "get_inbound_emails",
            account_id=account_id,
            limit=limit,
            folder_id=folder_id,
            from_date=from_date.isoformat() if from_date else None,
            to_date=to_date.isoformat() if to_date else None,
        )

        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            self.logger.info("Returning cached inbound emails data")
            return self._create_response(
                ConnectorStatus.SUCCESS,
                cached_data,
                "Inbound emails fetched from cache",
            )

        async def _get_inbound_emails_operation() -> ConnectorResponse:
            params = {
                "accountId": account_id,
                "folderId": folder_id,
                "limit": min(limit, 100),
            }

            if from_date:
                params["fromDate"] = from_date.isoformat()
            if to_date:
                params["toDate"] = to_date.isoformat()

            client = await self._get_http_client()
            response = await client.get(
                f"{self.base_url}/messages", headers=self.headers, params=params
            )

            if response.status_code == 200:
                emails_data = response.json()
                emails = emails_data.get("data", [])

                # Cache the results
                self._set_cache(cache_key, emails)

                return self._create_response(
                    ConnectorStatus.SUCCESS,
                    {
                        "emails": emails,
                        "count": len(emails),
                        "response_time_ms": response.elapsed.total_seconds() * 1000,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    f"Fetched {len(emails)} inbound emails",
                )
            else:
                raise self._handle_http_error(response.status_code, response.text)

        try:
            return await self._execute_with_resilience(
                "get_inbound_emails", _get_inbound_emails_operation
            )
        except ConnectorError:
            raise
        except Exception as e:
            raise ConnectorError(
                f"Failed to fetch inbound emails: {str(e)}", original_error=e
            )

    async def get_outbound_status(
        self, account_id: str, message_id: Optional[str] = None, limit: int = 50
    ) -> ConnectorResponse:
        """Get outbound email status from Zoho Mail with production optimizations."""
        if self.config.use_mocks:
            return self._create_response(
                ConnectorStatus.SUCCESS,
                self._get_mock_outbound_status(),
                "Outbound status fetched (mock mode)",
            )

        # Check cache first
        cache_key = self._get_cache_key(
            "get_outbound_status",
            account_id=account_id,
            message_id=message_id,
            limit=limit,
        )

        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            self.logger.info("Returning cached outbound status data")
            return self._create_response(
                ConnectorStatus.SUCCESS,
                cached_data,
                "Outbound status fetched from cache",
            )

        async def _get_outbound_status_operation() -> ConnectorResponse:
            params = {"accountId": account_id, "limit": min(limit, 100)}

            if message_id:
                params["messageId"] = message_id

            client = await self._get_http_client()
            response = await client.get(
                f"{self.base_url}/messages/outbound",
                headers=self.headers,
                params=params,
            )

            if response.status_code == 200:
                status_data = response.json()
                statuses = status_data.get("data", [])

                # Cache the results
                self._set_cache(cache_key, statuses)

                return self._create_response(
                    ConnectorStatus.SUCCESS,
                    {
                        "statuses": statuses,
                        "count": len(statuses),
                        "response_time_ms": response.elapsed.total_seconds() * 1000,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    f"Fetched {len(statuses)} outbound statuses",
                )
            else:
                raise self._handle_http_error(response.status_code, response.text)

        try:
            return await self._execute_with_resilience(
                "get_outbound_status", _get_outbound_status_operation
            )
        except ConnectorError:
            raise
        except Exception as e:
            raise ConnectorError(
                f"Failed to fetch outbound status: {str(e)}", original_error=e
            )

    def _get_mock_emails(self) -> List[Dict[str, Any]]:
        """Generate mock inbound emails data for development."""
        return [
            {
                "messageId": "msg_001",
                "subject": "New Order Notification",
                "from": "noreply@shopify.com",
                "to": "orders@company.com",
                "receivedTime": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                "folderId": "inbox",
                "isRead": False,
                "priority": "high",
                "body": "New order #1001 has been placed for $99.99",
            },
            {
                "messageId": "msg_002",
                "subject": "Payment Confirmation",
                "from": "payments@stripe.com",
                "to": "finance@company.com",
                "receivedTime": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
                "folderId": "inbox",
                "isRead": True,
                "priority": "normal",
                "body": "Payment of $149.99 has been processed successfully",
            },
        ]

    def _get_mock_outbound_status(self) -> List[Dict[str, Any]]:
        """Generate mock outbound status data for development."""
        return [
            {
                "messageId": "out_001",
                "subject": "Order Confirmation",
                "to": "customer@example.com",
                "sentTime": (datetime.utcnow() - timedelta(hours=3)).isoformat(),
                "status": "delivered",
                "deliveryTime": (
                    datetime.utcnow() - timedelta(hours=2, minutes=45)
                ).isoformat(),
                "readStatus": "read",
            },
            {
                "messageId": "out_002",
                "subject": "Shipping Update",
                "to": "customer2@example.com",
                "sentTime": (datetime.utcnow() - timedelta(hours=1)).isoformat(),
                "status": "delivered",
                "deliveryTime": (datetime.utcnow() - timedelta(minutes=45)).isoformat(),
                "readStatus": "unread",
            },
        ]

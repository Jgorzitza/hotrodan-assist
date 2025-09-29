from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Dict, List, Optional

import httpx


@dataclass
class ServiceDescriptor:
    name: str
    base_url: str
    health_path: str = "/health"
    version_path: Optional[str] = None  # Some services embed version in /health


@dataclass
class ServiceStatus:
    name: str
    url: str
    status: str
    version: Optional[str]
    checked_at: str
    latency_ms: Optional[float]
    details: Optional[Dict] = None


class ServiceRegistry:
    def __init__(self, services: List[ServiceDescriptor], timeout_seconds: float = 3.0) -> None:
        self._services = services
        self._timeout = timeout_seconds

    async def _fetch_json(self, client: httpx.AsyncClient, url: str) -> Optional[Dict]:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None

    async def check_service(self, client: httpx.AsyncClient, svc: ServiceDescriptor) -> ServiceStatus:
        started = datetime.now(timezone.utc)
        health_url = svc.base_url.rstrip("/") + svc.health_path
        payload = await self._fetch_json(client, health_url)

        latency_ms: Optional[float]
        latency_ms = (datetime.now(timezone.utc) - started).total_seconds() * 1000.0

        status = "unknown"
        version: Optional[str] = None
        details: Optional[Dict] = None

        if payload is not None:
            details = payload
            status = payload.get("status") or payload.get("state") or "unknown"
            version = payload.get("version")

        if version is None and svc.version_path:
            version_payload = await self._fetch_json(client, svc.base_url.rstrip("/") + svc.version_path)
            if version_payload is not None:
                version = version_payload.get("version") or version_payload.get("app_version")

        return ServiceStatus(
            name=svc.name,
            url=svc.base_url,
            status=status,
            version=version,
            checked_at=datetime.now(timezone.utc).isoformat(),
            latency_ms=round(latency_ms, 2) if latency_ms is not None else None,
            details=details,
        )

    async def snapshot(self) -> Dict[str, ServiceStatus]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            results = await asyncio.gather(*(self.check_service(client, s) for s in self._services))
        return {r.name: r for r in results}

    async def snapshot_json(self) -> str:
        snap = await self.snapshot()
        return json.dumps({k: asdict(v) for k, v in snap.items()}, indent=2)


def default_services() -> List[ServiceDescriptor]:
    return [
        ServiceDescriptor(name="rag_api", base_url="http://localhost:8001", health_path="/health"),
        ServiceDescriptor(name="assistants", base_url="http://localhost:8002", health_path="/health"),
        ServiceDescriptor(name="connectors", base_url="http://localhost:8003", health_path="/health"),
        ServiceDescriptor(name="inventory", base_url="http://localhost:8004", health_path="/health"),
    ]


async def main_to_file(output_path: str, services: Optional[List[ServiceDescriptor]] = None) -> str:
    if services is None:
        services = default_services()
    registry = ServiceRegistry(services)
    content = await registry.snapshot_json()
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content + "\n")
    return output_path

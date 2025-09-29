import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
import socket
import json
import pytest

from app.service_registry.registry import ServiceRegistry, ServiceDescriptor


class HealthHandlerFactory:
    def __init__(self, version: str):
        self.version = version

    def handler(self):
        version = self.version

        class _Handler(BaseHTTPRequestHandler):
            def do_GET(self):  # noqa: N802
                if self.path == "/health":
                    body = json.dumps({"status": "healthy", "version": version}).encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                else:
                    self.send_response(404)
                    self.end_headers()

            def log_message(self, format, *args):  # noqa: A003
                return

        return _Handler


def start_test_server(version: str):
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    host, port = sock.getsockname()
    sock.close()

    server = HTTPServer(("127.0.0.1", port), HealthHandlerFactory(version).handler())
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port


@pytest.mark.asyncio
async def test_collects_status_and_version_from_health():
    s1, port1 = start_test_server("1.2.3")
    s2, port2 = start_test_server("2.0.0")
    try:
        services = [
            ServiceDescriptor(name="svc1", base_url=f"http://127.0.0.1:{port1}"),
            ServiceDescriptor(name="svc2", base_url=f"http://127.0.0.1:{port2}"),
        ]
        reg = ServiceRegistry(services, timeout_seconds=1)
        snap = await reg.snapshot()
        assert snap["svc1"].status == "healthy"
        assert snap["svc1"].version == "1.2.3"
        assert snap["svc2"].status == "healthy"
        assert snap["svc2"].version == "2.0.0"
    finally:
        s1.shutdown()
        s2.shutdown()

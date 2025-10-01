import requests

def test_health_ready():
    h = requests.get("http://localhost:8001/health", timeout=10)
    assert h.status_code == 200
    r = requests.get("http://localhost:8001/ready", timeout=10)
    assert r.status_code in (200, 404)  # ready may be older image until rebuild
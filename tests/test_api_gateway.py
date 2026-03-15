from fastapi.testclient import TestClient

from services.api_gateway.main import app


client = TestClient(app)


def test_root_endpoint() -> None:
    response = client.get("/")
    assert response.status_code == 200
    payload = response.json()
    assert payload["platform"] == "CosmicSec"


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_phase5_proxy_route_is_wired() -> None:
    response = client.get("/api/phase5/health")
    # Route exists; service may be unavailable in unit test context.
    assert response.status_code in (200, 503)


def test_runtime_mode_endpoint() -> None:
    response = client.get("/api/runtime/mode")
    assert response.status_code == 200
    payload = response.json()
    assert payload["resolved_mode"] in payload["supported_modes"]


def test_recon_hybrid_fallback_response_shape() -> None:
    response = client.post("/api/recon", json={"target": "example.com"}, headers={"X-Platform-Mode": "hybrid"})
    assert response.status_code == 200
    payload = response.json()
    assert "_runtime" in payload
    assert payload["_runtime"]["route"] in ("dynamic", "static_fallback")

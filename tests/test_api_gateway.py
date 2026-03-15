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


def test_runtime_metrics_endpoint() -> None:
    response = client.get("/api/runtime/metrics")
    assert response.status_code == 200
    payload = response.json()
    assert "dynamic_total" in payload
    assert "dynamic_success_rate" in payload


def test_runtime_contracts_endpoint() -> None:
    response = client.get("/api/runtime/contracts")
    assert response.status_code == 200
    payload = response.json()
    assert payload["schema"] == "cosmicsec.hybrid.v1"
    assert "route_policies" in payload
    assert "auth.login" in payload["route_policies"]


def test_auth_login_static_policy_is_demo_only() -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "Password123"},
        headers={"X-Platform-Mode": "static"},
    )
    assert response.status_code == 403
    payload = response.json()
    assert payload["_runtime"]["route"] == "policy_denied"


def test_auth_login_demo_mode_returns_preview_contract() -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "demo@example.com", "password": "Password123"},
        headers={"X-Platform-Mode": "demo"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"] == "demo-preview-token"
    assert payload["_runtime"]["route"] == "static"
    assert payload["_contract"]["degraded"] is True


def test_scan_emergency_mode_uses_static_profile() -> None:
    response = client.post(
        "/api/scans",
        json={"target": "example.com", "scan_types": ["network"], "depth": 1},
        headers={"X-Platform-Mode": "emergency"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "queued_fallback"
    assert payload["_runtime"]["route"] == "static"
    assert payload["_contract"]["degraded"] is True


def test_runtime_traces_and_tracing_status_endpoints() -> None:
    client.post("/api/recon", json={"target": "example.com"}, headers={"X-Platform-Mode": "hybrid"})
    traces = client.get("/api/runtime/traces?limit=5")
    assert traces.status_code == 200
    data = traces.json()
    assert "traces" in data
    assert isinstance(data["traces"], list)
    assert len(data["traces"]) >= 1
    assert "trace_id" in data["traces"][-1]

    tracing_status = client.get("/api/runtime/tracing")
    assert tracing_status.status_code == 200
    status_payload = tracing_status.json()
    assert "buffer_size" in status_payload
    assert "export_enabled" in status_payload


def test_auth_refresh_static_mode_denied_by_policy() -> None:
    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": "abc"},
        headers={"X-Platform-Mode": "static"},
    )
    assert response.status_code == 503
    payload = response.json()
    assert payload["_runtime"]["route"] == "policy_denied"


def test_get_scan_emergency_mode_uses_partial_fallback() -> None:
    response = client.get("/api/scans/test-scan-id", headers={"X-Platform-Mode": "emergency"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "degraded_unavailable"
    assert payload["_runtime"]["route"] == "static"


def test_report_generate_static_mode_returns_fallback_profile() -> None:
    response = client.post(
        "/api/reports/generate",
        json={"scan_id": "x1", "format": "pdf"},
        headers={"X-Platform-Mode": "static"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "queued_fallback"
    assert payload["_runtime"]["route"] == "static"

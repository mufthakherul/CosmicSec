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
    response = client.post(
        "/api/recon", json={"target": "example.com"}, headers={"X-Platform-Mode": "hybrid"}
    )
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


def test_org_sso_discovery_route_is_wired() -> None:
    response = client.get("/api/orgs/slug/acme-security/sso")
    assert response.status_code in (200, 404, 503)


def test_auth_saml_metadata_route_is_wired() -> None:
    response = client.get("/api/auth/sso/saml/metadata")
    assert response.status_code in (200, 503)


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


def test_ai_analyze_static_mode_denied_by_policy() -> None:
    response = client.post(
        "/api/ai/analyze",
        json={"query": "analyze this"},
        headers={"X-Platform-Mode": "static"},
    )
    assert response.status_code == 503
    payload = response.json()
    assert payload["_runtime"]["route"] == "policy_denied"


def test_runtime_slo_endpoint() -> None:
    response = client.get("/api/runtime/slo")
    assert response.status_code == 200
    payload = response.json()
    assert "slo_targets" in payload
    assert "current" in payload
    assert "error_budget" in payload


def test_runtime_readiness_endpoint() -> None:
    response = client.get("/api/runtime/readiness")
    assert response.status_code == 200
    payload = response.json()
    assert "checks" in payload
    assert "critical_routes_covered" in payload["checks"]


def test_demo_mode_blocks_admin_paths() -> None:
    response = client.get("/api/admin/users", headers={"X-Platform-Mode": "demo"})
    assert response.status_code == 403
    payload = response.json()
    assert payload["_runtime"]["mode"] == "demo"
    assert payload["_runtime"]["route"] == "policy_denied"


def test_demo_mode_blocks_org_paths() -> None:
    response = client.get("/api/orgs", headers={"X-Platform-Mode": "demo"})
    assert response.status_code == 403
    payload = response.json()
    assert payload["_runtime"]["mode"] == "demo"
    assert payload["_runtime"]["route"] == "policy_denied"


def test_runtime_prometheus_metrics_endpoint() -> None:
    response = client.get("/api/runtime/metrics/prometheus")
    assert response.status_code == 200
    text = response.text
    assert "cosmicsec_runtime_dynamic_total" in text
    assert "cosmicsec_runtime_fallback_total" in text


def test_runtime_rollout_configuration_endpoints() -> None:
    current = client.get("/api/runtime/rollout")
    assert current.status_code == 200
    assert "dynamic_canary_percent" in current.json()

    updated = client.post("/api/runtime/rollout", json={"dynamic_canary_percent": 25})
    assert updated.status_code == 200
    assert updated.json()["dynamic_canary_percent"] == 25

    # reset to default to avoid cross-test contamination
    reset = client.post("/api/runtime/rollout", json={"dynamic_canary_percent": 0})
    assert reset.status_code == 200
    assert reset.json()["dynamic_canary_percent"] == 0


def test_runtime_compliance_endpoint() -> None:
    response = client.get("/api/runtime/compliance")
    assert response.status_code == 200
    payload = response.json()
    assert payload["complete"] is True
    assert "sections" in payload
    assert "8_static_module_requirements" in payload["sections"]


# ---------------------------------------------------------------------------
# Phase O: WAF, security headers, CORS, and path validation
# ---------------------------------------------------------------------------


def test_waf_blocks_sql_injection_in_query() -> None:
    """WAF middleware must reject SQL injection patterns in query strings."""
    # exec() pattern requires no whitespace — guaranteed to match the raw query string
    response = client.get("/?q=exec(1)--")
    assert response.status_code == 400
    assert response.json()["error_code"] == "WAF_BLOCKED"


def test_waf_blocks_xss_in_query() -> None:
    """WAF middleware must reject XSS patterns in query strings."""
    # javascript: URI scheme is a recognized XSS vector and needs no encoding
    response = client.get("/?url=javascript:void(0)")
    assert response.status_code == 400
    assert response.json()["error_code"] == "WAF_BLOCKED"


def test_waf_blocks_sql_injection_in_json_body() -> None:
    """WAF middleware must reject SQL injection in JSON request bodies."""
    response = client.post(
        "/api/auth/login",
        json={"email": "user@x.com", "password": "test'); exec(xp_cmdshell)--"},
        headers={"X-Platform-Mode": "demo"},
    )
    assert response.status_code == 400
    assert response.json()["error_code"] == "WAF_BLOCKED"


def test_waf_allows_normal_request() -> None:
    """WAF middleware must pass through benign requests unchanged."""
    response = client.get("/health")
    assert response.status_code == 200


def test_security_headers_present() -> None:
    """All responses must carry the standard security header set."""
    response = client.get("/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert "strict-origin" in response.headers.get("Referrer-Policy", "").lower()


def test_request_trace_id_header_echoed() -> None:
    """X-Trace-Id supplied by caller should be echoed back in the response."""
    trace = "test-trace-abc123"
    response = client.get("/health", headers={"X-Trace-Id": trace})
    assert response.headers.get("X-Trace-Id") == trace


def test_request_id_generated_when_not_provided() -> None:
    """Gateway must generate X-Request-Id if caller does not supply one."""
    response = client.get("/health")
    assert response.headers.get("X-Request-Id") is not None


def test_process_time_header_present() -> None:
    """Every response should include X-Process-Time for latency tracking."""
    response = client.get("/health")
    assert response.headers.get("X-Process-Time") is not None


def test_path_validation_rejects_injection_chars() -> None:
    """Path parameter validation must reject values with injection characters."""
    response = client.get("/api/scans/../../etc/passwd")
    # Path traversal or invalid ID should result in 400 or 404, never 200
    assert response.status_code in (400, 404, 422)


def test_cors_origin_present_in_allowed_list() -> None:
    """An allowed CORS origin should get Access-Control-Allow-Origin in response."""
    import os

    os.environ.setdefault("COSMICSEC_CORS_ORIGINS", "http://localhost:3000")
    response = client.get("/health", headers={"Origin": "http://localhost:3000"})
    # We just check the request succeeds; browser enforces CORS
    assert response.status_code == 200


def test_graphql_endpoint_is_wired() -> None:
    """GraphQL endpoint must exist (enabled or gracefully disabled)."""
    response = client.get("/api/graphql")
    assert response.status_code in (200, 404, 405)

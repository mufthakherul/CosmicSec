from fastapi.testclient import TestClient

from services.recon_service.main import app

client = TestClient(app)


def test_recon_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_recon_endpoint_includes_merged_intel_fields() -> None:
    response = client.post("/recon", json={"target": "https://example.com/path"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["target"] == "example.com"
    assert "dns" in payload
    assert "crtsh" in payload
    assert "rdap" in payload


def test_recon_with_plain_domain() -> None:
    """Recon endpoint should accept a plain hostname (no scheme)."""
    response = client.post("/recon", json={"target": "example.com"})
    assert response.status_code == 200
    body = response.json()
    assert body["target"] == "example.com"


def test_recon_with_ip_target() -> None:
    """Recon endpoint should handle bare IP addresses without crashing."""
    response = client.post("/recon", json={"target": "192.0.2.1"})
    assert response.status_code == 200
    body = response.json()
    assert "dns" in body


def test_recon_response_has_findings() -> None:
    """Recon response must include a findings list."""
    response = client.post("/recon", json={"target": "example.com"})
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body.get("findings"), list)
    assert len(body["findings"]) >= 1


def test_recon_shodan_disabled_when_no_key() -> None:
    """Shodan section should indicate disabled when SHODAN_API_KEY is unset."""
    import os

    os.environ.pop("SHODAN_API_KEY", None)
    response = client.post("/recon", json={"target": "example.com"})
    assert response.status_code == 200
    body = response.json()
    assert body["shodan"]["enabled"] is False


def test_recon_virustotal_disabled_when_no_key() -> None:
    """VirusTotal section should indicate disabled when VIRUSTOTAL_API_KEY is unset."""
    import os

    os.environ.pop("VIRUSTOTAL_API_KEY", None)
    response = client.post("/recon", json={"target": "example.com"})
    assert response.status_code == 200
    body = response.json()
    assert body["virustotal"]["enabled"] is False


def test_recon_response_has_timestamp() -> None:
    """Recon response must include a timestamp."""
    response = client.post("/recon", json={"target": "example.com"})
    assert response.status_code == 200
    assert "timestamp" in response.json()

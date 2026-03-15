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

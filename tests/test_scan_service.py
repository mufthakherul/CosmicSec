from fastapi.testclient import TestClient

from services.scan_service.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_scan() -> None:
    payload = {
        "target": "example.com",
        "scan_types": ["network", "web"],
        "depth": 1,
        "timeout": 120,
        "options": {},
    }
    response = client.post("/scans", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["target"] == "example.com"
    assert "id" in body

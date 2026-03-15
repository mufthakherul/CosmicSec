from fastapi.testclient import TestClient

from services.auth_service.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_verify_endpoint_with_invalid_token() -> None:
    response = client.get("/verify", params={"token": "invalid-token"})
    assert response.status_code == 200
    assert response.json()["valid"] is False

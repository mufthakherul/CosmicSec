from fastapi.testclient import TestClient

from services.api_gateway.main import app

client = TestClient(app)


def test_root_endpoint() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["platform"] == "CosmicSec"


def test_webhook_endpoint() -> None:
    response = client.post("/api/webhooks/events", json={"event_type": "scan.completed"})
    assert response.status_code == 200
    assert response.json()["status"] == "received"

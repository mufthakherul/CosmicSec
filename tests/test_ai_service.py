from fastapi.testclient import TestClient

from services.ai_service.main import app


client = TestClient(app)


def test_ai_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_ai_analyze_endpoint() -> None:
    payload = {
        "target": "example.com",
        "findings": [
            {"title": "SQL Injection", "severity": "critical", "description": "db access"},
            {"title": "Missing Header", "severity": "low", "description": "xfo missing"},
        ],
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_score"] >= 35
    assert "recommendations" in data

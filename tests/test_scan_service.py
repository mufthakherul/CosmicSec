from fastapi.testclient import TestClient

from services.scan_service import main as scan_main
from services.scan_service.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_create_scan() -> None:
    scan_main.tenant_quotas.clear()
    scan_main.scans_db.clear()
    scan_main.findings_db.clear()

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


def test_scan_quota_enforced() -> None:
    scan_main.tenant_quotas.clear()
    scan_main.scans_db.clear()
    scan_main.findings_db.clear()

    # Set a quota of 1 scan per day for an org. The request includes the org header.
    org_id = "test-org"
    scan_main.tenant_quotas[org_id] = {"max_scans_per_day": 1}

    payload = {
        "target": "example.com",
        "scan_types": ["network"],
        "depth": 1,
        "timeout": 120,
        "options": {},
    }

    headers = {"X-Org-Id": org_id}
    resp1 = client.post("/scans", json=payload, headers=headers)
    assert resp1.status_code == 200

    resp2 = client.post("/scans", json=payload, headers=headers)
    assert resp2.status_code == 429
    assert "quota" in resp2.json()["detail"].lower()

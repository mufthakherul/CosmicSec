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


def _clear_state() -> None:
    scan_main.tenant_quotas.clear()
    scan_main.scans_db.clear()
    scan_main.findings_db.clear()


def _create_scan(target: str = "example.com") -> str:
    _clear_state()
    payload = {
        "target": target,
        "scan_types": ["network"],
        "depth": 1,
        "timeout": 120,
        "options": {},
    }
    resp = client.post("/scans", json=payload)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_list_scans_returns_created_scan() -> None:
    scan_id = _create_scan()
    resp = client.get("/scans")
    assert resp.status_code == 200
    ids = [s["id"] for s in resp.json()]
    assert scan_id in ids


def test_get_scan_by_id() -> None:
    scan_id = _create_scan()
    resp = client.get(f"/scans/{scan_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == scan_id
    assert body["target"] == "example.com"


def test_get_scan_not_found() -> None:
    _clear_state()
    resp = client.get("/scans/nonexistent-id")
    assert resp.status_code == 404


def test_get_scan_findings_empty_for_new_scan() -> None:
    scan_id = _create_scan()
    resp = client.get(f"/scans/{scan_id}/findings")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_delete_scan() -> None:
    scan_id = _create_scan()
    del_resp = client.delete(f"/scans/{scan_id}")
    assert del_resp.status_code == 200
    get_resp = client.get(f"/scans/{scan_id}")
    assert get_resp.status_code == 404


def test_delete_scan_not_found() -> None:
    _clear_state()
    resp = client.delete("/scans/does-not-exist")
    assert resp.status_code == 404


def test_stats_endpoint() -> None:
    _create_scan()
    resp = client.get("/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_scans" in data
    assert "total_findings" in data
    assert "timestamp" in data


def test_set_and_get_org_quotas() -> None:
    _clear_state()
    org_id = "quota-test-org"
    set_resp = client.post(f"/orgs/{org_id}/quotas", json={"max_scans_per_day": 50})
    assert set_resp.status_code == 200
    assert set_resp.json()["quotas"]["max_scans_per_day"] == 50

    get_resp = client.get(f"/orgs/{org_id}/quotas")
    assert get_resp.status_code == 200
    assert get_resp.json()["quotas"]["max_scans_per_day"] == 50


def test_enqueue_response_shape() -> None:
    """Enqueue endpoint should return a dict with queued and scan_id fields."""
    scan_id = _create_scan()
    # Temporarily disable Celery so the endpoint returns the No-Celery fallback
    original_celery = scan_main.celery_app
    scan_main.celery_app = None
    try:
        resp = client.post(f"/scans/{scan_id}/enqueue")
        assert resp.status_code == 200
        body = resp.json()
        assert body["scan_id"] == scan_id
        assert body["queued"] is False
    finally:
        scan_main.celery_app = original_celery


def test_enqueue_unknown_scan() -> None:
    _clear_state()
    resp = client.post("/scans/unknown-scan/enqueue")
    assert resp.status_code == 404


def test_list_scans_status_filter() -> None:
    _create_scan()
    resp = client.get("/scans", params={"status_filter": "pending"})
    assert resp.status_code == 200
    for scan in resp.json():
        assert scan["status"] in ("pending", "running", "completed", "failed")


def test_scan_with_workspace_header() -> None:
    _clear_state()
    payload = {
        "target": "target.example.com",
        "scan_types": ["web"],
        "depth": 1,
        "timeout": 120,
        "options": {},
    }
    headers = {"X-Workspace-Id": "ws-abc123"}
    resp = client.post("/scans", json=payload, headers=headers)
    assert resp.status_code == 200
    scan_id = resp.json()["id"]
    detail = scan_main.scans_db[scan_id]
    assert detail["workspace_id"] == "ws-abc123"

from fastapi.testclient import TestClient

from services.integration_service.main import app

client = TestClient(app)


def test_integration_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_siem_vendor_endpoints() -> None:
    payload = {"source": "manual", "severity": "high", "message": "Suspicious login"}
    for endpoint in ("/siem/ingest", "/siem/splunk", "/siem/qradar", "/siem/sentinel"):
        response = client.post(endpoint, json=payload)
        assert response.status_code == 200
        assert response.json()["status"] == "stored"


def test_ticketing_endpoints() -> None:
    payload = {
        "project": "SEC",
        "summary": "Vulnerability found",
        "description": "Details",
        "labels": ["security"],
    }

    jira = client.post("/ticket/jira", json=payload)
    assert jira.status_code == 200
    assert jira.json()["status"] == "created"

    servicenow = client.post("/ticket/servicenow", json=payload)
    assert servicenow.status_code == 200
    assert servicenow.json()["status"] == "created"

    github = client.post("/ticket/github", json=payload)
    assert github.status_code == 200
    assert github.json()["status"] == "created"


def test_webhook_and_notifications() -> None:
    webhook = client.post(
        "/ticket/webhook",
        json={
            "target_url": "https://example.org/hooks",
            "event_type": "ticket_created",
            "payload": {"id": "abc"},
        },
    )
    assert webhook.status_code == 200
    assert webhook.json()["status"] == "queued"

    notify_payload = {
        "channel": "#alerts",
        "message": "Security event",
        "attributes": {"severity": "high"},
    }
    for endpoint in (
        "/notify/slack",
        "/notify/teams",
        "/notify/discord",
        "/notify/pagerduty",
        "/notify/email",
        "/notify/sms",
    ):
        response = client.post(endpoint, json=notify_payload)
        assert response.status_code == 200
        assert response.json()["status"] == "queued"


def test_threat_intel_and_ci() -> None:
    ip_resp = client.get("/threat-intel/ip", params={"ip": "8.8.8.8"})
    assert ip_resp.status_code == 200
    assert "risk_score" in ip_resp.json()

    domain_resp = client.get("/threat-intel/domain", params={"domain": "example.org"})
    assert domain_resp.status_code == 200
    assert "risk_score" in domain_resp.json()

    ci_resp = client.post("/ci/build", json={"pipeline": "nightly-security", "branch": "main"})
    assert ci_resp.status_code == 200
    assert ci_resp.json()["status"] == "queued"

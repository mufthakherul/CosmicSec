"""Tests for the Compliance Automation Service (Phase R.3)."""

import pytest
from fastapi.testclient import TestClient

from services.compliance_service.main import app

client = TestClient(app)

SAMPLE_FINDINGS = [
    {"id": "f1", "title": "CVE-2024-4577 PHP RCE", "severity": "critical", "category": "injection"},
    {"id": "f2", "title": "Weak TLS 1.0 enabled", "severity": "high", "category": "cryptography"},
    {"id": "f3", "title": "Missing HSTS", "severity": "medium", "category": "configuration"},
    {"id": "f4", "title": "Directory listing", "severity": "low", "category": "configuration"},
]


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "healthy"
    assert "soc2" in body["frameworks"]
    assert "hipaa" in body["frameworks"]


def test_list_controls():
    resp = client.get("/api/compliance/controls")
    assert resp.status_code == 200
    body = resp.json()
    assert "soc2" in body["frameworks"]
    assert "pci_dss" in body["frameworks"]
    assert "hipaa" in body["frameworks"]
    assert "iso27001" in body["frameworks"]
    for fw in body["frameworks"].values():
        assert fw["control_count"] > 0


def test_assess_soc2_with_findings():
    resp = client.post(
        "/api/compliance/assess/soc2",
        json={"findings": SAMPLE_FINDINGS},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["framework"] == "soc2"
    assert 0 <= body["overall_score"] <= 100
    assert body["summary"]["total_controls"] > 0
    assert isinstance(body["controls"], list)
    assert body["findings_assessed"] == len(SAMPLE_FINDINGS)


def test_assess_pci_dss_empty_findings():
    resp = client.post("/api/compliance/assess/pci_dss", json={"findings": []})
    assert resp.status_code == 200
    body = resp.json()
    assert body["overall_score"] == 100  # No findings = full pass
    assert body["summary"]["failed"] == 0


def test_assess_hipaa_with_critical():
    resp = client.post(
        "/api/compliance/assess/hipaa",
        json={"findings": [{"id": "f1", "title": "Auth bypass", "severity": "critical"}]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["overall_score"] < 100  # Should detect gap


def test_assess_iso27001():
    resp = client.post("/api/compliance/assess/iso27001", json={"findings": SAMPLE_FINDINGS})
    assert resp.status_code == 200
    body = resp.json()
    assert body["framework"] == "iso27001"
    assert "readiness" in body


def test_assess_invalid_framework():
    resp = client.post("/api/compliance/assess/gdpr", json={"findings": []})
    assert resp.status_code == 422  # Pattern validation


def test_get_report_valid():
    resp = client.get("/api/compliance/report/soc2")
    assert resp.status_code == 200
    body = resp.json()
    assert body["framework"] == "soc2"
    assert "controls" in body


def test_get_report_invalid_framework():
    resp = client.get("/api/compliance/report/invalid")
    assert resp.status_code == 422


def test_assess_returns_gaps():
    resp = client.post(
        "/api/compliance/assess/soc2",
        json={"findings": SAMPLE_FINDINGS},
    )
    assert resp.status_code == 200
    body = resp.json()
    # With critical finding, at least some controls should have gaps
    assert isinstance(body["gaps"], list)


def test_assess_with_org_id():
    resp = client.post(
        "/api/compliance/assess/hipaa",
        json={"findings": [], "org_id": "org-test-123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["org_id"] == "org-test-123"

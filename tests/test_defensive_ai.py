"""
Tests for Phase 4 Defensive AI features
"""
import pytest
from fastapi.testclient import TestClient
from services.ai_service.main import app

client = TestClient(app)


def test_defensive_remediation_endpoint():
    """Test defensive AI remediation suggestion endpoint"""
    response = client.post(
        "/defensive/remediation",
        params={"vulnerability_type": "SQL_INJECTION"},
        json={
            "id": "vuln-001",
            "severity": "critical",
            "affected_components": ["login_form"],
            "internet_facing": True
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "remediation" in data
    assert data["remediation"]["severity"] == "critical"
    assert len(data["remediation"]["remediation_steps"]) > 0
    assert "code_snippets" in data["remediation"]


def test_defensive_hardening_endpoint():
    """Test security hardening recommendations endpoint"""
    response = client.post(
        "/defensive/hardening",
        params={"system_type": "web_application"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "hardening" in data
    assert data["hardening"]["system_type"] == "web_application"
    assert "hardening_recommendations" in data["hardening"]


def test_defensive_incident_response_endpoint():
    """Test incident response plan generation"""
    response = client.post(
        "/defensive/incident-response",
        json={
            "id": "vuln-002",
            "severity": "critical",
            "vulnerability_type": "XSS"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "incident_response_plan" in data
    assert data["incident_response_plan"]["severity"] == "critical"
    assert data["incident_response_plan"]["response_plan"]["escalation_required"] is True


def test_defensive_batch_remediation_endpoint():
    """Test batch remediation analysis"""
    findings = [
        {"vulnerability_type": "SQL_INJECTION", "severity": "critical"},
        {"vulnerability_type": "XSS", "severity": "high"},
        {"vulnerability_type": "CSRF", "severity": "medium"}
    ]

    response = client.post(
        "/defensive/batch-remediation",
        json=findings
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_findings"] == 3
    assert "remediations" in data
    assert len(data["remediations"]) == 3
    assert "summary" in data
    # Verify sorting by priority (critical first)
    assert data["remediations"][0]["severity"] == "critical"


def test_remediation_unknown_vulnerability():
    """Test remediation for unknown vulnerability type"""
    response = client.post(
        "/defensive/remediation",
        params={"vulnerability_type": "UNKNOWN_VULN"},
        json={"id": "vuln-003", "severity": "medium"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "remediation" in data
    # Should return generic remediation steps
    assert len(data["remediation"]["remediation_steps"]) > 0


def test_hardening_api_system():
    """Test hardening recommendations for API systems"""
    response = client.post(
        "/defensive/hardening",
        params={"system_type": "api"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "hardening" in data
    assert "authentication" in data["hardening"]["hardening_recommendations"]
    assert "authorization" in data["hardening"]["hardening_recommendations"]


def test_incident_response_high_severity():
    """Test incident response for high severity vulnerability"""
    response = client.post(
        "/defensive/incident-response",
        json={"id": "vuln-004", "severity": "high"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    plan = data["incident_response_plan"]
    assert plan["response_plan"]["escalation_required"] is True
    assert "immediate_actions" in plan["response_plan"]

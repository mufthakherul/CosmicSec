from fastapi.testclient import TestClient

from services.report_service.main import app

client = TestClient(app)


def test_report_generate_json_and_compliance() -> None:
    report_resp = client.post(
        "/reports/generate",
        json={
            "scan_id": "scan-123",
            "format": "json",
            "findings": [{"title": "SQL Injection", "severity": "critical", "category": "web"}],
        },
    )
    assert report_resp.status_code == 200
    assert report_resp.json()["status"] == "generated"
    assert report_resp.json()["format"] == "json"

    compliance_resp = client.post(
        "/reports/compliance",
        json={"scan_id": "scan-123", "standard": "nist", "findings": [{"title": "MFA missing"}]},
    )
    assert compliance_resp.status_code == 200
    assert compliance_resp.json()["compliance_report"]["standard"] == "nist"


def test_report_schedule() -> None:
    response = client.post(
        "/reports/schedule", json={"scan_id": "scan-123", "format": "pdf", "cron": "0 0 * * *"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "scheduled"


def test_visualization_topology_attack_path_and_heatmap() -> None:
    topology_resp = client.post(
        "/visualization/topology",
        json={
            "nodes": [{"id": "a", "type": "server"}, {"id": "b", "type": "database"}],
            "edges": [{"source": "a", "target": "b"}],
            "node_filter": "all",
        },
    )
    assert topology_resp.status_code == 200
    assert topology_resp.json()["node_count"] == 2

    attack_path_resp = client.post(
        "/visualization/attack-path",
        json={
            "attack_steps": [
                {"name": "phishing", "risk": 50},
                {"name": "credential_abuse", "risk": 85},
            ],
            "highlight_threshold": 70,
        },
    )
    assert attack_path_resp.status_code == 200
    assert attack_path_resp.json()["highlighted_steps"] == 1

    heatmap_resp = client.post(
        "/visualization/heatmap",
        json={
            "group_by": "region",
            "observations": [
                {"region": "us-east", "severity": "critical"},
                {"region": "us-east", "severity": "high"},
                {"region": "eu-west", "severity": "low"},
            ],
        },
    )
    assert heatmap_resp.status_code == 200
    assert heatmap_resp.json()["group_by"] == "region"
    assert len(heatmap_resp.json()["heatmap"]) == 2

    immersive_resp = client.post(
        "/visualization/immersive", json={"mode": "vr", "scene_name": "blue-team"}
    )
    assert immersive_resp.status_code == 200
    assert immersive_resp.json()["status"] == "configured"

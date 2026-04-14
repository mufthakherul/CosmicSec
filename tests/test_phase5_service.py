from fastapi.testclient import TestClient

from services.phase5_service.main import app

client = TestClient(app)


def test_phase5_health_and_soc_flow() -> None:
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"

    ingest = client.post(
        "/soc/alerts/ingest",
        json={
            "source": "siem",
            "severity": "high",
            "title": "Suspicious authentication burst",
            "payload": {"host": "srv01"},
        },
    )
    assert ingest.status_code == 200

    dashboard = client.get("/soc/alerts/dashboard")
    assert dashboard.status_code == 200
    assert dashboard.json()["total_alerts"] >= 1


def test_phase5_devsecops_and_grc() -> None:
    sast = client.post(
        "/devsecops/sast/analyze",
        json={
            "repository": "org/repo",
            "pull_request": 12,
            "changed_files": ["app.py", "config.py"],
        },
    )
    assert sast.status_code == 200
    assert len(sast.json()["findings"]) >= 1

    risk = client.post(
        "/grc/risk/assess",
        json={"asset": "payments-api", "likelihood": 0.8, "impact": 0.9, "controls_score": 0.4},
    )
    assert risk.status_code == 200
    assert "risk_score" in risk.json()


def test_phase5_threat_intel_cloud_web3_iot_reverse_training_executive() -> None:
    ioc = client.post(
        "/threat-intel/ioc/create", json={"ioc_type": "ip", "value": "1.2.3.4", "confidence": 90}
    )
    assert ioc.status_code == 200

    cloud = client.post("/cspm/multicloud/assess", json={"providers": ["aws", "azure"]})
    assert cloud.status_code == 200
    assert len(cloud.json()["results"]) == 2

    web3 = client.post(
        "/web3/contracts/analyze",
        json={"language": "solidity", "code": "contract X { function f(){} }"},
    )
    assert web3.status_code == 200

    iot = client.post("/iot/firmware/analyze", json={"target": "camera-fw.bin", "metadata": {}})
    assert iot.status_code == 200

    reverse = client.post("/reverse/binary/analyze", json={"target": "sample.bin", "metadata": {}})
    assert reverse.status_code == 200

    labs = client.get("/training/labs")
    assert labs.status_code == 200
    assert labs.json()["ctf_enabled"] is True

    exec_dash = client.get("/executive/risk-posture")
    assert exec_dash.status_code == 200
    assert "overall_security_score" in exec_dash.json()

from fastapi.testclient import TestClient

from services.ai_service.main import app


client = TestClient(app)


def test_red_team_safety_and_plan() -> None:
    blocked = client.post(
        "/red-team/plan",
        json={"target": "corp.example", "authorized": False, "environment": "lab", "objectives": ["api validation"]},
    )
    assert blocked.status_code == 200
    assert blocked.json()["result"]["status"] == "blocked"

    planned = client.post(
        "/red-team/plan",
        json={
            "target": "corp.example",
            "authorized": True,
            "environment": "production-approved",
            "objectives": ["api validation", "credential controls"],
        },
    )
    assert planned.status_code == 200
    assert planned.json()["result"]["status"] == "planned"
    assert len(planned.json()["result"]["plan"]) > 0


def test_zero_day_training_and_forecast() -> None:
    train_resp = client.post(
        "/zero-day/train",
        json={
            "historical_records": [
                {"cvss": 8.1, "exploit_probability": 0.7},
                {"cvss": 6.5, "exploit_probability": 0.4},
            ]
        },
    )
    assert train_resp.status_code == 200
    assert train_resp.json()["result"]["status"] == "trained"

    forecast_resp = client.post(
        "/zero-day/forecast",
        json={
            "technology": "kubernetes",
            "telemetry": {
                "internet_exposure": 0.8,
                "patch_latency_days": 22,
                "vuln_density": 0.6,
                "threat_intel_signal": 0.7,
            },
        },
    )
    assert forecast_resp.status_code == 200
    assert "risk_score" in forecast_resp.json()["forecast"]

    trends_resp = client.post(
        "/zero-day/risk-trends",
        json={
            "portfolio": [
                {"technology": "api-gateway", "telemetry": {"internet_exposure": 0.9, "patch_latency_days": 18}},
                {"technology": "worker", "telemetry": {"internet_exposure": 0.2, "patch_latency_days": 4}},
            ]
        },
    )
    assert trends_resp.status_code == 200
    assert trends_resp.json()["trends"]["portfolio_size"] == 2


def test_quantum_ready_security_endpoints() -> None:
    algorithms = client.get("/quantum/algorithms")
    assert algorithms.status_code == 200
    assert len(algorithms.json()["catalog"]["algorithms"]) >= 3

    exchange = client.post(
        "/quantum/key-exchange",
        json={"client_nonce": "abc123", "server_nonce": "xyz987"},
    )
    assert exchange.status_code == 200
    shared_secret = exchange.json()["exchange"]["shared_secret"]

    encrypt = client.post(
        "/quantum/encrypt",
        json={"plaintext": {"asset": "db01", "risk": "high"}, "shared_secret": shared_secret},
    )
    assert encrypt.status_code == 200
    ciphertext = encrypt.json()["encryption"]["ciphertext"]
    mac = encrypt.json()["encryption"]["mac"]

    decrypt = client.post(
        "/quantum/decrypt",
        json={"ciphertext": ciphertext, "mac": mac, "shared_secret": shared_secret},
    )
    assert decrypt.status_code == 200
    assert decrypt.json()["plaintext"]["asset"] == "db01"

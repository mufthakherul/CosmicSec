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


def test_ai_nl_query_endpoint() -> None:
    """Phase 2 — natural language query blends ChromaDB + TF-IDF."""
    response = client.post("/query", json={"query": "How do I fix SQL injection?"})
    assert response.status_code == 200
    data = response.json()
    assert "guidance" in data
    assert "source" in data
    assert data["source"] in ("chromadb", "tfidf")
    assert isinstance(data["guidance"], list)


def test_ai_mitre_endpoint() -> None:
    """Phase 2 — MITRE ATT&CK correlation."""
    response = client.post(
        "/analyze/mitre",
        json={"findings": ["SQL Injection in login form", "Brute Force on /admin", "SSRF via webhook"]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    for mapping in data["mappings"]:
        assert "technique_id" in mapping
        assert mapping["technique_id"].startswith("T")


def test_ai_kb_stats_endpoint() -> None:
    """Phase 2 — ChromaDB KB stats endpoint."""
    response = client.get("/kb/stats")
    assert response.status_code == 200
    assert "chromadb_documents" in response.json()


def test_ai_kb_ingest_endpoint() -> None:
    """Phase 2 — ingest a new document into the knowledge base."""
    response = client.post(
        "/kb/ingest",
        json={"doc_id": "test-cve-9999", "text": "Test CVE: critical RCE in test framework. Apply mitigation X."},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["doc_id"] == "test-cve-9999"
    assert data["status"] in ("indexed", "fallback_unavailable")


def test_ai_agent_endpoint() -> None:
    """Phase 2 — LangChain agent endpoint (graceful fallback when no API key)."""
    payload = {
        "target": "api.example.com",
        "findings": [{"title": "SSRF", "severity": "high", "description": "webhook ssrf"}],
    }
    response = client.post("/analyze/agent", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "strategy" in data
    assert "actions" in data

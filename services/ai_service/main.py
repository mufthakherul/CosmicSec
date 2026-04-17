"""
CosmicSec AI Service — Helix AI engine.

Phase 1: LangChain + TF-IDF RAG, OpenAI chain, security analysis endpoints.
Phase 2: ChromaDB vector store, MITRE ATT&CK, NL interface, autonomous agents.
Phase S.1: Redis caching for analysis results (1 hour TTL) and MITRE mappings (24 hour TTL).
"""

import asyncio
import contextlib
import hashlib
import json as _json_module
import logging
import os as _os_module
import uuid
from datetime import UTC, datetime

import httpx
from fastapi import FastAPI
from pydantic import BaseModel, Field

from services.common.observability import setup_observability

from .agent import run_security_agent
from .agents import run_assessment_workflow
from .ai_agents import get_exploit_guidance, run_autonomous_agent
from .anomaly_detector import batch_detect, detect_anomaly, fit_global_baseline
from .defensive_ai import DefensiveAI
from .kb_loader import load_all as kb_load_all
from .mitre_attack import map_multiple
from .prompt_templates import SUMMARY_TEMPLATE
from .quantum_security import decrypt_payload, encrypt_payload, hybrid_key_exchange, list_algorithms
from .rag_store import retrieve_guidance
from .red_team import RedTeamScope, plan_attack_chain, select_exploit_logic, validate_safety
from .vector_store import chroma_search, collection_count, ingest_document
from .zero_day_predictor import ZeroDayPredictor

app = FastAPI(
    title="CosmicSec AI Service",
    description="Helix AI — LangChain-powered security analysis, RAG guidance, and autonomous agents",
    version="2.0.0",
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)
_observability_state = setup_observability(app, service_name="ai-service", logger=logger)

# Initialize Defensive AI
defensive_ai = DefensiveAI()
zero_day_predictor = ZeroDayPredictor()


class Finding(BaseModel):
    title: str
    severity: str = Field(default="medium")
    description: str = Field(default="")


class AnalyzeRequest(BaseModel):
    target: str
    findings: list[Finding] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    summary: str
    risk_score: int
    recommendations: list[str]


class AgentResponse(BaseModel):
    target: str
    strategy: str
    actions: list[str]
    rag_context: list[str] | None = None


class NLQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language security query")
    context: str | None = Field(default=None, description="Optional additional context")


class MitreRequest(BaseModel):
    findings: list[str] = Field(..., description="List of finding titles or descriptions")


class MitreEntry(BaseModel):
    finding: str
    tactic: str
    technique_id: str
    technique_name: str
    mitigation: str


class MitreResponse(BaseModel):
    mappings: list[MitreEntry]
    total: int


class IngestRequest(BaseModel):
    doc_id: str = Field(..., description="Unique document identifier")
    text: str = Field(..., description="Document text to embed and index")


# Phase 2 — Anomaly detection models
class AnomalyDetectRequest(BaseModel):
    scan_record: dict = Field(..., description="Single scan result record to score")


class BatchAnomalyRequest(BaseModel):
    scan_records: list[dict] = Field(
        ..., description="List of scan records; first N-1 used as baseline if not pre-fitted"
    )


class FitBaselineRequest(BaseModel):
    historical_scans: list[dict] = Field(
        ..., description="Historical scan records used to fit the anomaly baseline"
    )


# Phase 2 — Autonomous agent model
class AutonomousAgentRequest(BaseModel):
    target: str = Field(..., description="Target system, URL, or domain")
    findings: list[str] = Field(
        default_factory=list, description="Finding title strings for analysis"
    )
    query: str | None = Field(
        default=None, description="Optional focused question for the agent"
    )


# Phase 2 — Exploit guidance model
class ExploitGuidanceRequest(BaseModel):
    identifier: str = Field(..., description="CVE ID (e.g. CVE-2021-44228) or vulnerability name")


class RedTeamRequest(BaseModel):
    target: str
    authorized: bool = False
    environment: str = Field(default="lab")
    objectives: list[str] = Field(default_factory=list)


class ZeroDayTrainRequest(BaseModel):
    historical_records: list[dict] = Field(default_factory=list)


class ZeroDayForecastRequest(BaseModel):
    technology: str
    telemetry: dict = Field(default_factory=dict)


class ZeroDayPortfolioRequest(BaseModel):
    portfolio: list[dict] = Field(default_factory=list)


class QuantumKeyExchangeRequest(BaseModel):
    client_nonce: str
    server_nonce: str


class QuantumEncryptRequest(BaseModel):
    plaintext: dict
    shared_secret: str


class QuantumDecryptRequest(BaseModel):
    ciphertext: str
    mac: str
    shared_secret: str


@app.get("/health")
async def health_check() -> dict:
    return {
        "status": "healthy",
        "service": "ai",
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }



# ---------------------------------------------------------------------------
# Phase S.1 — AI result caching (Redis, graceful fallback)
# ---------------------------------------------------------------------------
try:
    import redis as _ai_redis_module
    _ai_redis = _ai_redis_module.from_url(
        f"redis://{_os_module.getenv('REDIS_HOST', 'localhost')}:{_os_module.getenv('REDIS_PORT', '6379')}/0",
        decode_responses=True,
        socket_connect_timeout=2,
    )
    _ai_redis.ping()
    _AI_CACHE_ENABLED = True
except Exception:
    _ai_redis = None
    _AI_CACHE_ENABLED = False


def _ai_cache_key(namespace: str, data: str) -> str:
    return f"ai:{namespace}:{hashlib.sha256(data.encode()).hexdigest()}"


def _ai_cache_get(key: str) -> dict | None:
    if not _AI_CACHE_ENABLED or _ai_redis is None:
        return None
    try:
        raw = _ai_redis.get(key)
        return _json_module.loads(raw) if raw else None
    except Exception:
        return None


def _ai_cache_set(key: str, value: dict, ttl: int) -> None:
    if not _AI_CACHE_ENABLED or _ai_redis is None:
        return
    with contextlib.suppress(Exception):
        _ai_redis.setex(key, ttl, _json_module.dumps(value, default=str))


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_findings(payload: AnalyzeRequest) -> AnalyzeResponse:
    # Cache key: hash of target + sorted finding titles
    cache_input = payload.target + "|" + "|".join(sorted(f.title for f in payload.findings))
    cache_key = _ai_cache_key("analyze", cache_input)
    cached = _ai_cache_get(cache_key)
    if cached:
        return AnalyzeResponse(**cached)

    critical_count = sum(
        1 for finding in payload.findings if finding.severity.lower() == "critical"
    )
    high_count = sum(1 for finding in payload.findings if finding.severity.lower() == "high")
    risk_score = min(100, critical_count * 35 + high_count * 20 + len(payload.findings) * 5)

    retrieved = retrieve_guidance(" ".join(f.title for f in payload.findings))
    recommendations = [
        "Prioritize remediation of critical/high severity findings first.",
        "Apply patching and validation tests before redeployment.",
        "Enable continuous scanning for this target in future runs.",
    ] + retrieved

    summary = SUMMARY_TEMPLATE.format(
        target=payload.target,
        count=len(payload.findings),
        critical=critical_count,
        high=high_count,
    )

    result = AnalyzeResponse(summary=summary, risk_score=risk_score, recommendations=recommendations)
    _ai_cache_set(cache_key, result.model_dump(), ttl=3600)  # 1 hour
    return result


@app.post("/analyze/agent", response_model=AgentResponse)
async def analyze_with_agent(payload: AnalyzeRequest) -> AgentResponse:
    result = run_security_agent(
        target=payload.target,
        finding_titles=[f.title for f in payload.findings],
    )
    return AgentResponse(**result)


@app.post("/query")
async def natural_language_query(payload: NLQueryRequest) -> dict:
    """Natural language security query — blends ChromaDB semantic search with TF-IDF RAG."""
    combined = f"{payload.query} {payload.context or ''}".strip()
    # Phase 2: ChromaDB first, fall back to TF-IDF
    chroma_hits = chroma_search(combined, n_results=5)
    tfidf_hits = retrieve_guidance(combined, top_k=5)
    # Deduplicate: prefer ChromaDB results when available
    guidance = chroma_hits if chroma_hits else tfidf_hits
    agent_result = run_security_agent(
        target=payload.query,
        finding_titles=[],
        query=combined,
    )
    return {
        "query": payload.query,
        "response_mode": agent_result["strategy"],
        "guidance": guidance,
        "source": "chromadb" if chroma_hits else "tfidf",
        "actions": agent_result["actions"],
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


@app.post("/analyze/mitre", response_model=MitreResponse)
async def analyze_mitre(payload: MitreRequest) -> MitreResponse:
    """Map a list of findings to MITRE ATT&CK tactics and techniques."""
    cache_key = _ai_cache_key("mitre", "|".join(sorted(payload.findings)))
    cached = _ai_cache_get(cache_key)
    if cached:
        entries = [MitreEntry(**m) for m in cached.get("mappings", [])]
        return MitreResponse(mappings=entries, total=len(entries))

    raw_mappings = map_multiple(payload.findings)
    entries = [MitreEntry(**m) for m in raw_mappings]
    response = MitreResponse(mappings=entries, total=len(entries))
    _ai_cache_set(cache_key, response.model_dump(), ttl=86400)  # 24 hours
    return response


@app.post("/kb/ingest")
async def kb_ingest(payload: IngestRequest) -> dict:
    """Ingest a new document into the ChromaDB knowledge base."""
    success = ingest_document(payload.doc_id, payload.text)
    return {
        "doc_id": payload.doc_id,
        "status": "indexed" if success else "fallback_unavailable",
        "collection_size": collection_count(),
    }


@app.get("/kb/stats")
async def kb_stats() -> dict:
    """Return current knowledge base statistics."""
    return {
        "chromadb_documents": collection_count(),
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


@app.post("/kb/refresh")
async def kb_refresh() -> dict:
    """
    Trigger a fresh download and re-ingestion of the RAG knowledge base.

    Re-downloads NVD CVE feeds and MITRE ATT&CK STIX data, then ingests
    all documents into ChromaDB.  Returns counts for each data source.

    Fallback: If ChromaDB or the network is unavailable the counts will be 0
    and the response will include a ``message`` explaining the situation.
    """
    try:
        counts = await kb_load_all()
        total = sum(counts.values())
        return {
            "status": "refreshed",
            "nvd_cves": counts.get("nvd_cves", 0),
            "mitre_techniques": counts.get("mitre_techniques", 0),
            "total_ingested": total,
            "timestamp": datetime.now(tz=UTC).isoformat(),
        }
    except Exception as exc:
        logger.warning("KB refresh failed: %s", exc)
        return {
            "status": "fallback",
            "nvd_cves": 0,
            "mitre_techniques": 0,
            "total_ingested": 0,
            "message": "KB refresh unavailable — check service logs for details.",
            "timestamp": datetime.now(tz=UTC).isoformat(),
        }


# ==========================================================================
# Phase 2 endpoints
# ==========================================================================


@app.post("/agent/autonomous")
async def autonomous_agent(payload: AutonomousAgentRequest) -> dict:
    """
    Autonomous multi-step security analysis agent.

    Uses LangChain ReAct agent with 4 tools when OPENAI_API_KEY is set.
    Falls back to deterministic 5-step pipeline (KB → MITRE → risk → recommendations).
    """
    result = run_autonomous_agent(
        target=payload.target,
        findings=payload.findings,
        query=payload.query,
    )
    result["timestamp"] = datetime.now(tz=UTC).isoformat()
    return result


@app.post("/exploit/suggest")
async def exploit_suggest(payload: ExploitGuidanceRequest) -> dict:
    """
    Educational CVE exploit guidance for defensive security research.

    Returns attack technique overview, affected versions, and remediation.
    For authorised penetration testing and security research only.
    """
    guidance = get_exploit_guidance(payload.identifier)
    guidance["timestamp"] = datetime.now(tz=UTC).isoformat()
    return guidance


@app.post("/anomaly/fit")
async def anomaly_fit(payload: FitBaselineRequest) -> dict:
    """Fit the global anomaly detector on historical scan baseline data."""
    fit_global_baseline(payload.historical_scans)
    return {
        "status": "fitted",
        "sample_count": len(payload.historical_scans),
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


@app.post("/anomaly/detect")
async def anomaly_detect(payload: AnomalyDetectRequest) -> dict:
    """
    Score a single scan record for anomalousness.

    Returns anomaly_score, is_anomaly, confidence, and explanation.
    """
    result = detect_anomaly(payload.scan_record)
    result["timestamp"] = datetime.now(tz=UTC).isoformat()
    return result


@app.post("/anomaly/batch")
async def anomaly_batch(payload: BatchAnomalyRequest) -> dict:
    """
    Score a batch of scan records.

    Automatically uses first N-1 records as baseline if no prior fit.
    """
    results = batch_detect(payload.scan_records)
    return {
        "results": results,
        "total": len(results),
        "anomalies_detected": sum(1 for r in results if r.get("is_anomaly")),
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


# ========================
# Phase 4: Defensive AI Endpoints
# ========================


@app.post("/defensive/remediation")
def get_remediation_guidance(vulnerability_type: str, finding: dict):
    """
    Generate AI-powered remediation guidance for a vulnerability

    Phase 4: Defensive AI - Auto-remediation suggestions
    """
    remediation = defensive_ai.suggest_remediation(vulnerability_type, finding)
    return {"success": True, "remediation": remediation, "timestamp": datetime.now(tz=UTC).isoformat()}


@app.post("/defensive/hardening")
def get_hardening_recommendations(system_type: str):
    """
    Generate security hardening recommendations for a system type

    Phase 4: Defensive AI - System hardening guidance
    """
    hardening = defensive_ai.generate_security_hardening(system_type)
    return {"success": True, "hardening": hardening, "timestamp": datetime.now(tz=UTC).isoformat()}


@app.post("/defensive/incident-response")
def generate_incident_response(vulnerability: dict):
    """
    Generate incident response plan for a vulnerability

    Phase 4: Defensive AI - Incident response automation
    """
    response_plan = defensive_ai.generate_incident_response_plan(vulnerability)
    return {
        "success": True,
        "incident_response_plan": response_plan,
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


@app.post("/defensive/batch-remediation")
def batch_remediation(findings: list[dict]):
    """
    Generate remediation guidance for multiple findings

    Phase 4: Defensive AI - Batch remediation analysis
    """
    remediations = []
    for finding in findings:
        vuln_type = finding.get("vulnerability_type", "unknown")
        remediation = defensive_ai.suggest_remediation(vuln_type, finding)
        remediations.append(remediation)

    # Sort by priority
    remediations.sort(
        key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(
            x.get("priority", "low"), 3
        )
    )

    return {
        "success": True,
        "total_findings": len(findings),
        "remediations": remediations,
        "summary": {
            "critical": sum(1 for r in remediations if r.get("priority") == "critical"),
            "high": sum(1 for r in remediations if r.get("priority") == "high"),
            "medium": sum(1 for r in remediations if r.get("priority") == "medium"),
            "low": sum(1 for r in remediations if r.get("priority") == "low"),
            "auto_remediable": sum(1 for r in remediations if r.get("auto_remediable", False)),
        },
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


# ========================
# Phase 4: AI Red Team Endpoints
# ========================


@app.post("/red-team/safety-check")
def red_team_safety_check(payload: RedTeamRequest) -> dict:
    scope = RedTeamScope(
        target=payload.target,
        authorized=payload.authorized,
        environment=payload.environment,
        objectives=payload.objectives,
    )
    return {
        "success": True,
        "safety": validate_safety(scope),
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


@app.post("/red-team/plan")
def red_team_plan(payload: RedTeamRequest) -> dict:
    scope = RedTeamScope(
        target=payload.target,
        authorized=payload.authorized,
        environment=payload.environment,
        objectives=payload.objectives,
    )
    return {
        "success": True,
        "result": plan_attack_chain(scope),
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


@app.post("/red-team/attack-sequence")
def red_team_attack_sequence(payload: RedTeamRequest) -> dict:
    techniques = select_exploit_logic(payload.objectives)
    return {
        "success": True,
        "target": payload.target,
        "techniques": techniques,
        "mode": "defensive-simulation",
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


# ========================
# Phase 4: Zero-Day Prediction Endpoints
# ========================


@app.post("/zero-day/train")
def zero_day_train(payload: ZeroDayTrainRequest) -> dict:
    result = zero_day_predictor.train(payload.historical_records)
    return {"success": True, "result": result, "timestamp": datetime.now(tz=UTC).isoformat()}


@app.post("/zero-day/forecast")
def zero_day_forecast(payload: ZeroDayForecastRequest) -> dict:
    forecast = zero_day_predictor.forecast(payload.technology, payload.telemetry)
    return {"success": True, "forecast": forecast, "timestamp": datetime.now(tz=UTC).isoformat()}


@app.post("/zero-day/risk-trends")
def zero_day_risk_trends(payload: ZeroDayPortfolioRequest) -> dict:
    trends = zero_day_predictor.risk_trends(payload.portfolio)
    return {"success": True, "trends": trends, "timestamp": datetime.now(tz=UTC).isoformat()}


# ========================
# Phase 4: Quantum-ready Security Endpoints
# ========================


@app.get("/quantum/algorithms")
def quantum_algorithms() -> dict:
    return {
        "success": True,
        "catalog": list_algorithms(),
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


@app.post("/quantum/key-exchange")
def quantum_key_exchange(payload: QuantumKeyExchangeRequest) -> dict:
    return {
        "success": True,
        "exchange": hybrid_key_exchange(payload.client_nonce, payload.server_nonce),
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


@app.post("/quantum/encrypt")
def quantum_encrypt(payload: QuantumEncryptRequest) -> dict:
    result = encrypt_payload(payload.plaintext, payload.shared_secret)
    return {"success": True, "encryption": result, "timestamp": datetime.now(tz=UTC).isoformat()}


@app.post("/quantum/decrypt")
def quantum_decrypt(payload: QuantumDecryptRequest) -> dict:
    plaintext = decrypt_payload(payload.ciphertext, payload.mac, payload.shared_secret)
    return {"success": True, "plaintext": plaintext, "timestamp": datetime.now(tz=UTC).isoformat()}


# ---------------------------------------------------------------------------
# Phase E — Cross-Layer Intelligence Correlation
# ---------------------------------------------------------------------------


class CorrelationFinding(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    severity: str = Field(default="medium")
    description: str = Field(default="")
    target: str | None = None
    cve_id: str | None = None
    mitre_technique: str | None = None
    source: str = Field(default="web_scan")
    tool: str | None = None


class CorrelationRequest(BaseModel):
    findings: list[CorrelationFinding]


class CorrelationReport(BaseModel):
    risk_score: int
    total_findings: int
    grouped_by_target: dict
    grouped_by_cve: dict
    grouped_by_technique: dict
    recommendations: list[str]


class GraphNode(BaseModel):
    id: str
    node_type: str  # "target" | "cve" | "technique"
    label: str
    weight: int = 1


class GraphEdge(BaseModel):
    source: str
    target: str
    edge_type: str
    weight: int = 1


class CorrelationGraph(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    total_findings: int


@app.post("/correlate", response_model=CorrelationReport, tags=["correlation"])
async def correlate_findings(req: CorrelationRequest):
    """Cross-source AI correlation — groups findings by target, CVE, and MITRE technique."""
    findings = req.findings
    if not findings:
        return CorrelationReport(
            risk_score=0,
            total_findings=0,
            grouped_by_target={},
            grouped_by_cve={},
            grouped_by_technique={},
            recommendations=["No findings to correlate."],
        )

    # Group findings
    grouped_by_target: dict = {}
    grouped_by_cve: dict = {}
    grouped_by_technique: dict = {}
    severity_weights = {"critical": 10, "high": 7, "medium": 4, "low": 2, "info": 1}

    for f in findings:
        if f.target:
            grouped_by_target.setdefault(f.target, []).append(f.model_dump())
        if f.cve_id:
            grouped_by_cve.setdefault(f.cve_id, []).append(f.model_dump())
        if f.mitre_technique:
            grouped_by_technique.setdefault(f.mitre_technique, []).append(f.model_dump())

    # Compute weighted risk score (0-100)
    raw_score = sum(severity_weights.get(f.severity.lower(), 1) for f in findings)
    # Amplify score if multiple sources confirm same finding
    for group in list(grouped_by_cve.values()) + list(grouped_by_technique.values()):
        if len(group) > 1:
            raw_score += len(group) * 2  # multi-source amplifier
    risk_score = min(100, int(raw_score * 100 / max(len(findings) * 10, 1)))

    # Get recommendations from RAG
    recommendations: list[str] = []
    try:
        for target in list(grouped_by_target.keys())[:3]:
            guidance = retrieve_guidance(f"security findings for {target}")
            if guidance:
                recommendations.append(guidance[0] if isinstance(guidance, list) else str(guidance))
    except Exception:
        logger.debug("RAG recommendation retrieval failed", exc_info=True)
    if not recommendations:
        severities = [f.severity.lower() for f in findings]
        if "critical" in severities or "high" in severities:
            recommendations.append("Immediately patch critical and high severity vulnerabilities.")
        if grouped_by_cve:
            recommendations.append(
                f"Address {len(grouped_by_cve)} unique CVEs found across sources."
            )
        if grouped_by_technique:
            recommendations.append(
                f"Review {len(grouped_by_technique)} MITRE ATT&CK techniques identified."
            )
        recommendations.append(
            "Correlate findings across all sources before prioritising remediation."
        )

    return CorrelationReport(
        risk_score=risk_score,
        total_findings=len(findings),
        grouped_by_target=grouped_by_target,
        grouped_by_cve=grouped_by_cve,
        grouped_by_technique=grouped_by_technique,
        recommendations=recommendations[:5],
    )


@app.post("/correlate/graph", response_model=CorrelationGraph, tags=["correlation"])
async def correlate_graph(req: CorrelationRequest):
    """Returns a typed correlation graph — nodes (targets + CVEs) and weighted edges."""
    findings = req.findings
    nodes: dict[str, GraphNode] = {}
    edges: list[GraphEdge] = []

    for f in findings:
        if f.target and f.target not in nodes:
            nodes[f.target] = GraphNode(id=f.target, node_type="target", label=f.target)
        if f.target:
            nodes[f.target].weight += 1
        if f.cve_id:
            if f.cve_id not in nodes:
                nodes[f.cve_id] = GraphNode(id=f.cve_id, node_type="cve", label=f.cve_id)
            if f.target:
                edges.append(GraphEdge(source=f.target, target=f.cve_id, edge_type="has_cve"))
        if f.mitre_technique:
            if f.mitre_technique not in nodes:
                nodes[f.mitre_technique] = GraphNode(
                    id=f.mitre_technique, node_type="technique", label=f.mitre_technique
                )
            if f.target:
                edges.append(
                    GraphEdge(source=f.target, target=f.mitre_technique, edge_type="uses_technique")
                )

    return CorrelationGraph(
        nodes=list(nodes.values()),
        edges=edges,
        total_findings=len(findings),
    )


# ---------------------------------------------------------------------------
# Phase F — AI Workflow
# ---------------------------------------------------------------------------


class WorkflowStartRequest(BaseModel):
    target: str
    async_mode: bool = Field(
        default=False, description="Run workflow in background (not yet implemented)"
    )


@app.post("/ai/workflow/start", tags=["workflow"])
async def start_workflow(req: WorkflowStartRequest):
    """Kick off a full automated multi-step security assessment workflow."""
    from .langgraph_flow import run_workflow

    result = await run_workflow(req.target)
    return {
        "target": result["target"],
        "recon_results": result["recon_results"],
        "scan_count": len(result["scan_results"]),
        "ai_findings": result["ai_findings"],
        "report_url": result["report_url"],
        "errors": result["errors"],
        "status": "completed",
    }


class DispatchTaskRequest(BaseModel):
    agent_id: str
    findings: list[dict] = Field(default_factory=list)
    target: str


@app.post("/ai/dispatch-task", tags=["workflow"])
async def dispatch_task(req: DispatchTaskRequest):
    """AI selects the best tool to run based on findings, dispatches task to agent relay."""
    import uuid as _uuid2

    # Heuristic tool selection
    severities = [f.get("severity", "info").lower() for f in req.findings]
    if "critical" in severities or "high" in severities:
        tool, args = "nuclei", ["-u", req.target, "-severity", "critical,high"]
        reason = "Critical/high findings detected — running nuclei for CVE checks"
    elif "medium" in severities:
        tool, args = "nikto", ["-h", req.target]
        reason = "Medium findings detected — running nikto for web vulnerability scan"
    else:
        tool, args = "nmap", ["-sV", "-T4", req.target]
        reason = "Running nmap service discovery scan"

    task_id = str(_uuid2.uuid4())
    task_payload = {
        "task_id": task_id,
        "agent_id": req.agent_id,
        "tool": tool,
        "args": args,
        "target": req.target,
        "reason": reason,
    }

    # Try to dispatch to agent relay
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post("http://agent-relay:8011/relay/dispatch-task", json=task_payload)
    except httpx.HTTPError:
        pass  # Agent relay may not be running; task still returned

    return task_payload


# ---------------------------------------------------------------------------
# Phase Q.4 — Multi-Agent Assessment Workflow endpoint
# ---------------------------------------------------------------------------


class WorkflowRequest(BaseModel):
    scan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    findings: list[dict] = Field(default_factory=list)
    provider: str = Field(default="")


class WorkflowResponse(BaseModel):
    scan_id: str
    triaged_count: int
    groups_count: int
    plan_steps: int
    remediation_plan: list[dict]
    errors: list[str]
    timing: dict


@app.post("/workflow/assess", response_model=WorkflowResponse)
async def run_workflow(req: WorkflowRequest):
    """
    Run the full multi-agent triage → analysis → correlation → remediation pipeline.

    Uses LangGraph StateGraph when installed; falls back to a sequential
    async pipeline with identical semantics.
    """
    result = await run_assessment_workflow(
        findings=req.findings,
        scan_id=req.scan_id,
        provider=req.provider,
    )
    return WorkflowResponse(
        scan_id=result["scan_id"],
        triaged_count=len(result["triaged_findings"]),
        groups_count=len(result["correlation_groups"]),
        plan_steps=len(result["remediation_plan"]),
        remediation_plan=result["remediation_plan"],
        errors=result["errors"],
        timing=result["timing"],
    )


# ---------------------------------------------------------------------------
# Phase Q.5 — Workflow graph visualization + AI model listing
# ---------------------------------------------------------------------------


@app.get("/workflow/{run_id}/graph")
async def workflow_graph(run_id: str) -> dict:
    """Return a Mermaid diagram of the multi-agent workflow graph for a given run.

    If the run is not tracked (or LangGraph is not installed), returns the
    static workflow topology diagram instead.
    """
    # Static topology — always available even without LangGraph state tracking
    static_diagram = (
        "graph TD\n"
        "  A([Start]) --> T[TriageAgent]\n"
        "  T -->|triaged findings| N[AnalysisAgent]\n"
        "  N -->|enriched findings| C[CorrelationAgent]\n"
        "  C -->|correlation groups| R[RemediationAgent]\n"
        "  R --> E([End])\n"
        "  T -.->|fallback: rule-based triage| C\n"
        "  N -.->|LLM unavailable: skip| C\n"
        "  R -.->|error: return partial plan| E\n"
        "  style T fill:#1e40af,color:#fff\n"
        "  style N fill:#7c3aed,color:#fff\n"
        "  style C fill:#0f766e,color:#fff\n"
        "  style R fill:#b45309,color:#fff\n"
    )
    return {
        "run_id": run_id,
        "format": "mermaid",
        "diagram": static_diagram,
        "nodes": [
            {"id": "triage", "label": "TriageAgent", "description": "Classify findings by severity & confidence"},
            {"id": "analysis", "label": "AnalysisAgent", "description": "Deep analysis with RAG context"},
            {"id": "correlation", "label": "CorrelationAgent", "description": "Group related findings & detect attack chains"},
            {"id": "remediation", "label": "RemediationAgent", "description": "Prioritized remediation playbook"},
        ],
        "edges": [
            {"from": "triage", "to": "analysis", "label": "triaged findings"},
            {"from": "analysis", "to": "correlation", "label": "enriched findings"},
            {"from": "correlation", "to": "remediation", "label": "correlation groups"},
        ],
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


@app.get("/ai/models")
async def list_models() -> dict:
    """List all available AI models (local Ollama + configured cloud providers)."""
    from .llm_providers import list_available_models

    models = await asyncio.to_thread(list_available_models)
    return {
        "models": models,
        "default_provider": _os_module.getenv("COSMICSEC_DEFAULT_LLM_PROVIDER", "auto"),
        "timestamp": datetime.now(tz=UTC).isoformat(),
    }


@app.post("/ai/models/pull")
async def pull_model(payload: dict) -> dict:
    """Trigger Ollama model download. Returns immediately; download runs in background."""
    model_name = payload.get("model", "")
    if not model_name:
        return {"error": "model name required"}
    ollama_url = _os_module.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{ollama_url}/api/pull", json={"name": model_name})
            return {"model": model_name, "status": "pulling" if resp.status_code == 200 else "error", "ollama_response": resp.status_code}
    except Exception as exc:
        logger.warning("Ollama pull failed for %s: %s", model_name, exc)
        return {"model": model_name, "status": "error", "detail": "Ollama unavailable"}




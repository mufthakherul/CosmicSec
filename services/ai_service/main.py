"""
CosmicSec AI Service — Helix AI engine.

Phase 1: LangChain + TF-IDF RAG, OpenAI chain, security analysis endpoints.
Phase 2: ChromaDB vector store, MITRE ATT&CK, NL interface, autonomous agents.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .agent import run_security_agent
from .mitre_attack import map_multiple, map_to_attack
from .prompt_templates import SUMMARY_TEMPLATE
from .rag_store import retrieve_guidance
from .vector_store import chroma_search, collection_count, ingest_document

app = FastAPI(
    title="CosmicSec AI Service",
    description="Helix AI — LangChain-powered security analysis, RAG guidance, and autonomous agents",
    version="2.0.0",
)


class Finding(BaseModel):
    title: str
    severity: str = Field(default="medium")
    description: str = Field(default="")


class AnalyzeRequest(BaseModel):
    target: str
    findings: List[Finding] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    summary: str
    risk_score: int
    recommendations: List[str]


class AgentResponse(BaseModel):
    target: str
    strategy: str
    actions: List[str]
    rag_context: Optional[List[str]] = None


class NLQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language security query")
    context: Optional[str] = Field(default=None, description="Optional additional context")


class MitreRequest(BaseModel):
    findings: List[str] = Field(..., description="List of finding titles or descriptions")


class MitreEntry(BaseModel):
    finding: str
    tactic: str
    technique_id: str
    technique_name: str
    mitigation: str


class MitreResponse(BaseModel):
    mappings: List[MitreEntry]
    total: int


class IngestRequest(BaseModel):
    doc_id: str = Field(..., description="Unique document identifier")
    text: str = Field(..., description="Document text to embed and index")


@app.get("/health")
async def health_check() -> dict:
    return {
        "status": "healthy",
        "service": "ai",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_findings(payload: AnalyzeRequest) -> AnalyzeResponse:
    critical_count = sum(1 for finding in payload.findings if finding.severity.lower() == "critical")
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

    return AnalyzeResponse(summary=summary, risk_score=risk_score, recommendations=recommendations)


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
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/analyze/mitre", response_model=MitreResponse)
async def analyze_mitre(payload: MitreRequest) -> MitreResponse:
    """Map a list of findings to MITRE ATT&CK tactics and techniques."""
    raw_mappings = map_multiple(payload.findings)
    entries = [MitreEntry(**m) for m in raw_mappings]
    return MitreResponse(mappings=entries, total=len(entries))


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
        "timestamp": datetime.utcnow().isoformat(),
    }

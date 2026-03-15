"""CosmicSec AI Service (Phase 2 kickoff)."""

from datetime import datetime
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .agent import run_security_agent
from .prompt_templates import SUMMARY_TEMPLATE
from .rag_store import retrieve_guidance

app = FastAPI(
    title="CosmicSec AI Service",
    description="Initial Phase 2 AI service scaffold for Helix AI workflows",
    version="0.1.0",
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
    return AgentResponse(
        **run_security_agent(payload.target, [f.title for f in payload.findings])
    )

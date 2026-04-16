"""
Tests for services/ai_service/agents.py — multi-agent assessment workflow.
"""
import asyncio
from typing import Any

import pytest


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def sample_findings() -> list[dict[str, Any]]:
    return [
        {
            "id": "f-1",
            "title": "SQL Injection in /login",
            "severity": "critical",
            "target": "example.com",
            "tool": "sqlmap",
            "description": "POST /login vulnerable to SQLi",
        },
        {
            "id": "f-2",
            "title": "Open Port 22 (SSH)",
            "severity": "low",
            "target": "example.com",
            "tool": "nmap",
            "description": "SSH service detected",
        },
        {
            "id": "f-3",
            "title": "XSS in search parameter",
            "severity": "high",
            "target": "example.com",
            "tool": "nuclei",
            "description": "Reflected XSS in ?q= parameter",
        },
        {
            "id": "f-4",
            "title": "SSL Certificate Expiry Warning",
            "severity": "medium",
            "target": "api.example.com",
            "tool": "nikto",
            "description": "Certificate expires in 30 days",
        },
    ]


# ---------------------------------------------------------------------------
# Unit tests for individual agent nodes
# ---------------------------------------------------------------------------


class TestTriageAgent:
    @pytest.mark.asyncio
    async def test_triage_adds_priority_score(self, sample_findings):
        from services.ai_service.agents import triage_agent, AgentState

        state: AgentState = {
            "scan_id": "scan-1",
            "raw_findings": sample_findings,
            "triaged_findings": [],
            "analysis_results": [],
            "correlation_groups": [],
            "remediation_plan": [],
            "provider": "",
            "errors": [],
            "timing": {},
        }
        result = await triage_agent(state)
        assert len(result["triaged_findings"]) == len(sample_findings)
        for f in result["triaged_findings"]:
            assert "priority_score" in f
            assert 1 <= f["priority_score"] <= 10

    @pytest.mark.asyncio
    async def test_triage_sorts_by_priority_descending(self, sample_findings):
        from services.ai_service.agents import triage_agent, AgentState

        state: AgentState = {
            "scan_id": "scan-1",
            "raw_findings": sample_findings,
            "triaged_findings": [],
            "analysis_results": [],
            "correlation_groups": [],
            "remediation_plan": [],
            "provider": "",
            "errors": [],
            "timing": {},
        }
        result = await triage_agent(state)
        scores = [f["priority_score"] for f in result["triaged_findings"]]
        assert scores == sorted(scores, reverse=True)

    @pytest.mark.asyncio
    async def test_triage_adds_category(self, sample_findings):
        from services.ai_service.agents import triage_agent, AgentState

        state: AgentState = {
            "scan_id": "scan-1",
            "raw_findings": sample_findings,
            "triaged_findings": [],
            "analysis_results": [],
            "correlation_groups": [],
            "remediation_plan": [],
            "provider": "",
            "errors": [],
            "timing": {},
        }
        result = await triage_agent(state)
        for f in result["triaged_findings"]:
            assert "category" in f

    @pytest.mark.asyncio
    async def test_triage_records_timing(self, sample_findings):
        from services.ai_service.agents import triage_agent, AgentState

        state: AgentState = {
            "scan_id": "scan-1",
            "raw_findings": sample_findings,
            "triaged_findings": [],
            "analysis_results": [],
            "correlation_groups": [],
            "remediation_plan": [],
            "provider": "",
            "errors": [],
            "timing": {},
        }
        result = await triage_agent(state)
        assert "triage" in result["timing"]
        assert result["timing"]["triage"] >= 0


class TestCorrelationAgent:
    @pytest.mark.asyncio
    async def test_correlation_groups_by_target_and_category(self, sample_findings):
        from services.ai_service.agents import (
            AgentState,
            correlation_agent,
            triage_agent,
            analysis_agent,
        )

        state: AgentState = {
            "scan_id": "scan-2",
            "raw_findings": sample_findings,
            "triaged_findings": [],
            "analysis_results": [],
            "correlation_groups": [],
            "remediation_plan": [],
            "provider": "",
            "errors": [],
            "timing": {},
        }
        state = await triage_agent(state)
        state = await analysis_agent(state)
        result = await correlation_agent(state)
        assert len(result["correlation_groups"]) > 0
        for group in result["correlation_groups"]:
            assert "group_key" in group
            assert "aggregate_risk" in group

    @pytest.mark.asyncio
    async def test_correlation_handles_empty_findings(self):
        from services.ai_service.agents import AgentState, correlation_agent

        state: AgentState = {
            "scan_id": "scan-empty",
            "raw_findings": [],
            "triaged_findings": [],
            "analysis_results": [],
            "correlation_groups": [],
            "remediation_plan": [],
            "provider": "",
            "errors": [],
            "timing": {},
        }
        result = await correlation_agent(state)
        assert result["correlation_groups"] == []
        assert "correlation" in result["timing"]


class TestRemediationAgent:
    @pytest.mark.asyncio
    async def test_remediation_produces_plan(self, sample_findings):
        from services.ai_service.agents import (
            AgentState,
            analysis_agent,
            correlation_agent,
            remediation_agent,
            triage_agent,
        )

        state: AgentState = {
            "scan_id": "scan-3",
            "raw_findings": sample_findings,
            "triaged_findings": [],
            "analysis_results": [],
            "correlation_groups": [],
            "remediation_plan": [],
            "provider": "",
            "errors": [],
            "timing": {},
        }
        state = await triage_agent(state)
        state = await analysis_agent(state)
        state = await correlation_agent(state)
        result = await remediation_agent(state)

        assert len(result["remediation_plan"]) > 0
        for step in result["remediation_plan"]:
            assert "rank" in step
            assert "urgency" in step
            assert step["urgency"] in ("immediate", "soon", "scheduled")


class TestFullWorkflow:
    @pytest.mark.asyncio
    async def test_run_assessment_workflow_end_to_end(self, sample_findings):
        from services.ai_service.agents import run_assessment_workflow

        result = await run_assessment_workflow(
            findings=sample_findings,
            scan_id="scan-full-1",
        )
        assert result["scan_id"] == "scan-full-1"
        assert len(result["triaged_findings"]) == len(sample_findings)
        assert len(result["correlation_groups"]) > 0
        assert len(result["remediation_plan"]) > 0
        assert isinstance(result["errors"], list)
        assert isinstance(result["timing"], dict)

    @pytest.mark.asyncio
    async def test_run_assessment_workflow_empty_findings(self):
        from services.ai_service.agents import run_assessment_workflow

        result = await run_assessment_workflow(findings=[], scan_id="scan-empty")
        assert result["triaged_findings"] == []
        assert result["remediation_plan"] == []
        # Errors are allowed (e.g. import warnings) but should be a list
        assert isinstance(result["errors"], list)

    @pytest.mark.asyncio
    async def test_workflow_critical_findings_flagged_as_immediate(self, sample_findings):
        from services.ai_service.agents import run_assessment_workflow

        result = await run_assessment_workflow(findings=sample_findings, scan_id="scan-crit")
        urgencies = [step["urgency"] for step in result["remediation_plan"]]
        # Critical SQLi finding should result in at least one "immediate" action
        assert "immediate" in urgencies

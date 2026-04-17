"""
LangGraph multi-agent security assessment workflow.
Gracefully falls back to sequential execution if langgraph is not installed.
"""

from __future__ import annotations

import importlib
import logging
import os
from typing import Any, TypedDict

import httpx

from cosmicsec_platform.service_discovery import get_service_url

logger = logging.getLogger(__name__)

# Service URLs - auto-detects OS and deployment environment
# Can be overridden via environment variables for special cases
def _get_service_url(service_key: str, env_var: str) -> str:
    """Get service URL from env var or service discovery."""
    if explicit_url := os.getenv(env_var):
        return explicit_url
    return get_service_url(service_key)

RECON_URL = _get_service_url("recon", "RECON_URL")
SCAN_URL = _get_service_url("scan", "SCAN_URL")
AI_URL = _get_service_url("ai", "AI_URL")
REPORT_URL = _get_service_url("report", "REPORT_URL")


class WorkflowState(TypedDict):
    target: str
    recon_results: dict[str, Any]
    scan_results: list[dict[str, Any]]
    ai_findings: dict[str, Any]
    report_url: str
    errors: list[str]


async def recon_node(state: WorkflowState) -> WorkflowState:
    """Run DNS recon against the target."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{RECON_URL}/dns", json={"domain": state["target"]})
            state["recon_results"] = resp.json() if resp.status_code == 200 else {}
    except Exception as exc:
        logger.warning("recon_node failed: %s", exc)
        state["errors"].append(f"recon: {exc}")
        state["recon_results"] = {}
    return state


def _has_open_ports(recon_results: dict[str, Any]) -> bool:
    """Check if recon results suggest open ports worth scanning."""
    # If we got recon data back, proceed with scan
    return bool(recon_results)


async def scan_node(state: WorkflowState) -> WorkflowState:
    """Run a network scan against the target."""
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{SCAN_URL}/api/scans",
                json={"target": state["target"], "scan_types": ["network"], "depth": 1},
            )
            data = resp.json() if resp.status_code in (200, 201) else {}
            state["scan_results"] = data.get("findings", [data] if data else [])
    except Exception as exc:
        logger.warning("scan_node failed: %s", exc)
        state["errors"].append(f"scan: {exc}")
        state["scan_results"] = []
    return state


async def analyze_node(state: WorkflowState) -> WorkflowState:
    """Run AI analysis over scan results."""
    try:
        findings_payload = [
            {
                "title": f.get("title", "Unknown"),
                "severity": f.get("severity", "info"),
                "description": f.get("description", ""),
            }
            for f in state["scan_results"][:20]
        ]
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{AI_URL}/analyze",
                json={"target": state["target"], "findings": findings_payload},
            )
            state["ai_findings"] = resp.json() if resp.status_code == 200 else {}
    except Exception as exc:
        logger.warning("analyze_node failed: %s", exc)
        state["errors"].append(f"analyze: {exc}")
        state["ai_findings"] = {}
    return state


async def report_node(state: WorkflowState) -> WorkflowState:
    """Generate a report from the findings."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{REPORT_URL}/reports",
                json={
                    "target": state["target"],
                    "scan_results": state["scan_results"],
                    "ai_analysis": state["ai_findings"],
                },
            )
            data = resp.json() if resp.status_code in (200, 201) else {}
            state["report_url"] = data.get("download_url", data.get("report_url", ""))
    except Exception as exc:
        logger.warning("report_node failed: %s", exc)
        state["errors"].append(f"report: {exc}")
        state["report_url"] = ""
    return state


async def run_workflow(target: str) -> WorkflowState:
    """
    Run the full security assessment workflow.
    Uses LangGraph if available, otherwise falls back to sequential execution.
    """
    initial_state: WorkflowState = {
        "target": target,
        "recon_results": {},
        "scan_results": [],
        "ai_findings": {},
        "report_url": "",
        "errors": [],
    }

    _has_langgraph = importlib.util.find_spec("langgraph") is not None

    if _has_langgraph:
        try:
            from langgraph.graph import END, StateGraph  # type: ignore[import]

            workflow = StateGraph(WorkflowState)
            workflow.add_node("recon", recon_node)
            workflow.add_node("scan", scan_node)
            workflow.add_node("analyze", analyze_node)
            workflow.add_node("report", report_node)

            workflow.set_entry_point("recon")
            workflow.add_conditional_edges(
                "recon",
                lambda s: "scan" if _has_open_ports(s["recon_results"]) else "analyze",
            )
            workflow.add_edge("scan", "analyze")
            workflow.add_edge("analyze", "report")
            workflow.add_edge("report", END)

            app_graph = workflow.compile()
            result = await app_graph.ainvoke(initial_state)
            return result  # type: ignore[return-value]
        except Exception as exc:
            logger.warning("LangGraph workflow failed, falling back to sequential: %s", exc)

    # Sequential fallback
    state = await recon_node(initial_state)
    if _has_open_ports(state["recon_results"]):
        state = await scan_node(state)
    state = await analyze_node(state)
    state = await report_node(state)
    return state

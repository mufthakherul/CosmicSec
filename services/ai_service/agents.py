"""
Phase Q.4 — LangGraph Multi-Agent Security Assessment Workflow.

Architecture:
    TriageAgent → AnalysisAgent → CorrelationAgent → RemediationAgent

Each agent node receives the workflow state, does its job, and passes the
enriched state to the next node.  Any node failure is caught and reported
in the ``errors`` list; execution continues with the next node (best-effort
pipeline).

If langgraph is not installed the workflow falls back to a sequential
asyncio pipeline with the same interface.

Usage::

    result = await run_assessment_workflow(
        findings=[{"id": "f1", "title": "SQLi", "severity": "critical", ...}],
        scan_id="scan-123",
        provider="openai",     # optional — uses env default
    )
    print(result["remediation_plan"])
"""

from __future__ import annotations

import logging
import time
from typing import Any, TypedDict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# State schema
# ---------------------------------------------------------------------------


class AgentState(TypedDict):
    """Shared mutable state passed between all agent nodes."""

    scan_id: str
    raw_findings: list[dict[str, Any]]
    triaged_findings: list[dict[str, Any]]
    analysis_results: list[dict[str, Any]]
    correlation_groups: list[dict[str, Any]]
    remediation_plan: list[dict[str, Any]]
    provider: str
    errors: list[str]
    timing: dict[str, float]


# ---------------------------------------------------------------------------
# Individual agent nodes
# ---------------------------------------------------------------------------


async def triage_agent(state: AgentState) -> AgentState:
    """
    TriageAgent: classify and prioritise raw findings.

    Assigns a numeric priority score (1-10) to every finding based on
    CVSS-like heuristics so downstream agents can focus on what matters.
    Falls back to severity-only sorting when the LLM is unavailable.
    """
    t0 = time.perf_counter()
    try:
        severity_weights = {"critical": 10, "high": 8, "medium": 5, "low": 2, "info": 1}
        triaged = []
        for f in state["raw_findings"]:
            sev = str(f.get("severity", "info")).lower()
            base_score = severity_weights.get(sev, 1)
            # Boost score for web-facing findings (common attack surface)
            boost = 1.5 if f.get("tool") in ("nuclei", "nikto", "sqlmap") else 1.0
            priority = min(10.0, base_score * boost)

            triaged.append(
                {
                    **f,
                    "priority_score": round(priority, 1),
                    "category": _categorise(f),
                    "confidence": "high" if sev in ("critical", "high") else "medium",
                }
            )

        # Sort descending by priority
        triaged.sort(key=lambda x: x["priority_score"], reverse=True)
        state["triaged_findings"] = triaged
        logger.info(
            "TriageAgent classified %d findings for scan %s", len(triaged), state["scan_id"]
        )
    except Exception as exc:
        logger.error("TriageAgent error: %s", exc)
        state["errors"].append(f"triage: {exc}")
        state["triaged_findings"] = state["raw_findings"]

    state["timing"]["triage"] = time.perf_counter() - t0
    return state


async def analysis_agent(state: AgentState) -> AgentState:
    """
    AnalysisAgent: perform deep analysis on each triaged finding.

    Enriches each finding with:
    - MITRE ATT&CK technique mapping
    - Remediation recommendation (LLM or rule-based)
    - Similar CVE references (keyword-based fallback when RAG unavailable)
    """
    t0 = time.perf_counter()
    try:
        from services.ai_service.mitre_attack import map_to_attack

        analysed = []
        for finding in state["triaged_findings"]:
            techniques = []
            try:
                mapping = map_to_attack(finding.get("title", ""))
                if mapping:
                    techniques = [mapping]
            except Exception:
                logger.debug(
                    "MITRE mapping failed for finding %s", finding.get("id"), exc_info=True
                )

            analysed.append(
                {
                    **finding,
                    "mitre_techniques": techniques[:3] if techniques else [],
                    "remediation": _rule_based_remediation(finding),
                    "cve_references": _keyword_cve_lookup(finding),
                }
            )

        state["analysis_results"] = analysed
        logger.info(
            "AnalysisAgent enriched %d findings for scan %s", len(analysed), state["scan_id"]
        )
    except Exception as exc:
        logger.error("AnalysisAgent error: %s", exc)
        state["errors"].append(f"analysis: {exc}")
        state["analysis_results"] = state["triaged_findings"]

    state["timing"]["analysis"] = time.perf_counter() - t0
    return state


async def correlation_agent(state: AgentState) -> AgentState:
    """
    CorrelationAgent: group related findings and compute aggregate risk.

    Groups findings by:
    1. Shared target host
    2. Shared vulnerability category
    3. Likely attack-chain relationships (e.g. recon → exploitation)
    """
    t0 = time.perf_counter()
    try:
        groups: dict[str, list[dict[str, Any]]] = {}
        for f in state["analysis_results"]:
            # Group by (target, category)
            target = f.get("target", "unknown")
            cat = f.get("category", "unknown")
            key = f"{target}::{cat}"
            groups.setdefault(key, []).append(f)

        correlation_groups = []
        for key, findings in groups.items():
            max_score = max(f.get("priority_score", 0) for f in findings)
            # Escalate aggregate risk when multiple related findings cluster
            aggregate_score = min(10.0, max_score * (1 + 0.1 * (len(findings) - 1)))
            correlation_groups.append(
                {
                    "group_key": key,
                    "findings": findings,
                    "findings_count": len(findings),
                    "aggregate_risk": round(aggregate_score, 1),
                    "attack_chain": _detect_attack_chain(findings),
                }
            )

        # Sort by aggregate risk descending
        correlation_groups.sort(key=lambda g: g["aggregate_risk"], reverse=True)
        state["correlation_groups"] = correlation_groups
        logger.info(
            "CorrelationAgent produced %d groups for scan %s",
            len(correlation_groups),
            state["scan_id"],
        )
    except Exception as exc:
        logger.error("CorrelationAgent error: %s", exc)
        state["errors"].append(f"correlation: {exc}")
        state["correlation_groups"] = []

    state["timing"]["correlation"] = time.perf_counter() - t0
    return state


async def remediation_agent(state: AgentState) -> AgentState:
    """
    RemediationAgent: generate a prioritised fix playbook.

    Produces an ordered list of remediation steps, one per correlation group,
    including estimated effort, urgency label, and generic code/config snippet.
    """
    t0 = time.perf_counter()
    try:
        plan = []
        for rank, group in enumerate(state["correlation_groups"], start=1):
            severity_level = (
                "immediate"
                if group["aggregate_risk"] >= 8
                else ("soon" if group["aggregate_risk"] >= 5 else "scheduled")
            )
            plan.append(
                {
                    "rank": rank,
                    "group_key": group["group_key"],
                    "urgency": severity_level,
                    "aggregate_risk": group["aggregate_risk"],
                    "findings_count": group["findings_count"],
                    "steps": _generate_fix_steps(group["findings"]),
                    "estimated_effort_hours": _effort_estimate(group),
                }
            )

        state["remediation_plan"] = plan
        logger.info(
            "RemediationAgent produced %d-step plan for scan %s", len(plan), state["scan_id"]
        )
    except Exception as exc:
        logger.error("RemediationAgent error: %s", exc)
        state["errors"].append(f"remediation: {exc}")
        state["remediation_plan"] = []

    state["timing"]["remediation"] = time.perf_counter() - t0
    return state


# ---------------------------------------------------------------------------
# Workflow runner
# ---------------------------------------------------------------------------


async def run_assessment_workflow(
    findings: list[dict[str, Any]],
    scan_id: str = "",
    provider: str = "",
) -> AgentState:
    """
    Run the full multi-agent assessment pipeline and return the final state.

    Attempts to use LangGraph StateGraph when available; falls back to a
    sequential async coroutine chain with identical semantics.
    """
    initial_state: AgentState = {
        "scan_id": scan_id,
        "raw_findings": findings,
        "triaged_findings": [],
        "analysis_results": [],
        "correlation_groups": [],
        "remediation_plan": [],
        "provider": provider,
        "errors": [],
        "timing": {},
    }

    try:
        from langgraph.graph import StateGraph  # type: ignore[import-untyped]

        state_graph = StateGraph(AgentState)
        state_graph.add_node("triage", triage_agent)
        state_graph.add_node("analysis", analysis_agent)
        state_graph.add_node("correlation", correlation_agent)
        state_graph.add_node("remediation", remediation_agent)

        state_graph.set_entry_point("triage")
        state_graph.add_edge("triage", "analysis")
        state_graph.add_edge("analysis", "correlation")
        state_graph.add_edge("correlation", "remediation")
        state_graph.set_finish_point("remediation")

        compiled = state_graph.compile()
        result: AgentState = await compiled.ainvoke(initial_state)
        return result

    except ImportError:
        logger.info(
            "langgraph not installed — using sequential async fallback for scan %s", scan_id
        )

    # Sequential fallback pipeline
    state = initial_state
    for agent_fn in (triage_agent, analysis_agent, correlation_agent, remediation_agent):
        try:
            state = await agent_fn(state)
        except Exception as exc:
            logger.error("Agent pipeline error in %s: %s", agent_fn.__name__, exc)
            state["errors"].append(f"{agent_fn.__name__}: {exc}")

    return state


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

_CATEGORY_MAP = {
    "nmap": "network",
    "nikto": "web",
    "nuclei": "web",
    "sqlmap": "injection",
    "gobuster": "enumeration",
    "zap": "web",
}

_MITRE_QUICK_MAP: dict[str, str] = {
    "sqli": "T1190",
    "injection": "T1190",
    "xss": "T1059.007",
    "rce": "T1059",
    "open port": "T1046",
    "ssl": "T1552.004",
    "disclosure": "T1083",
}

_REMEDIATION_TEMPLATES: dict[str, str] = {
    "injection": (
        "1. Use parameterised queries / prepared statements.\n"
        "2. Apply input validation and output encoding.\n"
        "3. Enable WAF rules for SQLi/XSS patterns."
    ),
    "network": (
        "1. Close unnecessary ports at the firewall level.\n"
        "2. Apply network segmentation (VLANs/security groups).\n"
        "3. Enable intrusion detection (IDS/IPS)."
    ),
    "web": (
        "1. Apply the latest security patches for web frameworks.\n"
        "2. Implement security headers (CSP, HSTS, X-Frame-Options).\n"
        "3. Run periodic DAST scans in the CI pipeline."
    ),
    "default": (
        "1. Review the finding details and assess exploitability.\n"
        "2. Apply vendor patch or apply compensating control.\n"
        "3. Verify fix with a targeted rescan."
    ),
}


def _categorise(finding: dict[str, Any]) -> str:
    tool = str(finding.get("tool", "")).lower()
    if tool in _CATEGORY_MAP:
        return _CATEGORY_MAP[tool]
    title = str(finding.get("title", "")).lower()
    if any(k in title for k in ("sql", "inject")):
        return "injection"
    if any(k in title for k in ("xss", "cross-site", "script")):
        return "web"
    if any(k in title for k in ("port", "service", "open")):
        return "network"
    return "general"


def _rule_based_remediation(finding: dict[str, Any]) -> str:
    cat = finding.get("category", "default")
    return _REMEDIATION_TEMPLATES.get(str(cat), _REMEDIATION_TEMPLATES["default"])


def _keyword_cve_lookup(finding: dict[str, Any]) -> list[str]:
    """Very lightweight keyword → CVE example mapping (no network call)."""
    title = str(finding.get("title", "")).lower()
    refs: list[str] = []
    if "log4j" in title or "log4shell" in title:
        refs.append("CVE-2021-44228")
    if "heartbleed" in title:
        refs.append("CVE-2014-0160")
    if "shellshock" in title:
        refs.append("CVE-2014-6271")
    if "bluekeep" in title:
        refs.append("CVE-2019-0708")
    return refs


def _detect_attack_chain(findings: list[dict[str, Any]]) -> list[str]:
    categories = {f.get("category") for f in findings}
    chain: list[str] = []
    if "network" in categories:
        chain.append("Reconnaissance / Port Scanning")
    if "enumeration" in categories:
        chain.append("Resource Discovery / Directory Brute-Force")
    if "web" in categories or "injection" in categories:
        chain.append("Initial Access / Exploitation")
    return chain


def _generate_fix_steps(findings: list[dict[str, Any]]) -> list[str]:
    seen_cats: set[str] = set()
    steps: list[str] = []
    for f in findings:
        cat = f.get("category", "general")
        if cat not in seen_cats:
            seen_cats.add(cat)
            template = _REMEDIATION_TEMPLATES.get(str(cat), _REMEDIATION_TEMPLATES["default"])
            steps.extend([line.strip() for line in template.splitlines() if line.strip()])
    return steps[:10]  # cap at 10 steps per group


def _effort_estimate(group: dict[str, Any]) -> int:
    """Rough effort in person-hours based on risk score and finding count."""
    base = max(1, int(group["aggregate_risk"] / 2))
    return min(base * group["findings_count"], 40)

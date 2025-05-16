import os
import json
import random
from llm.offline_chat import query_local_llm
from utils.logger import log
from tools import nmap_runner, sqlmap_runner, dirsearch_tool
from scanners.cve_scanner import suggest_cves
from scanners.live_exploit_generator import generate_live_exploit

AUTO_MODE = True  # If True, run AI-suggested tools automatically

def summarize_scan_results(tool_name, results):
    if tool_name == "nmap":
        summary = f"Nmap found open ports: {', '.join(str(port['port']) for port in results.get('open_ports', []))}.\n"
        summary += f"Services: {', '.join(set(p['service'] for p in results.get('open_ports', [])))}\n"
        return summary
    elif tool_name == "sqlmap":
        return "SQLMap discovered injectable points." if results.get("vulnerable") else "No SQLi points found."
    return f"Scan from {tool_name}: {json.dumps(results)[:500]}..."

def ask_ai_for_next_steps(scan_summary, tech_stack=None):
    prompt = f"""You're a cybersecurity assistant. Based on the following scan summary, suggest what tool or test to run next and why.

Scan Summary:
{scan_summary}
{"Detected Tech Stack: " + ', '.join(tech_stack) if tech_stack else ""}
Output only actionable instructions, tools, and reasoning."""

    log("AI_BRIDGE", "Querying LLM for next step...")
    return query_local_llm(prompt)

def run_recommended_tool(ai_suggestion, target):
    if "sqlmap" in ai_suggestion.lower():
        log("AI_BRIDGE", f"Auto-running SQLMap on {target}")
        return sqlmap_runner.run_sqlmap(target)
    elif "dirsearch" in ai_suggestion.lower():
        log("AI_BRIDGE", f"Auto-running Dirsearch on {target}")
        return dirsearch_tool.run_dirsearch(target)
    return "No auto-action triggered."

def ai_scan_bridge(target, scan_results, tech_stack=None):
    summary_parts = []
    for tool_name, result in scan_results.items():
        summary_parts.append(summarize_scan_results(tool_name, result))
    summary = "\n".join(summary_parts)

    ai_response = ask_ai_for_next_steps(summary, tech_stack)
    log("AI_BRIDGE", f"AI Suggestion: {ai_response}")

    if AUTO_MODE:
        result = run_recommended_tool(ai_response, target)
        log("AI_BRIDGE", f"Auto-run result: {result}")

    # AI-based CVE suggestions
    if tech_stack:
        cve_data = suggest_cves(tech_stack)
        log("AI_BRIDGE", f"CVEs suggested for {tech_stack}: {cve_data}")

    # Attempt live PoC generation
    if "exploit" in ai_response.lower():
        poc = generate_live_exploit(ai_response)
        log("AI_BRIDGE", f"Generated Live Exploit PoC:\n{poc}")

    return {
        "ai_suggestion": ai_response,
        "summary": summary,
        "auto_result": result if AUTO_MODE else "Manual mode",
    }

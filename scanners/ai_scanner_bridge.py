import os
import json
import random
from datetime import datetime
from llm.offline_chat import query_local_llm
from llm.model_loader import query_cloud_llm  # OpenAI/Grok wrapper
from utils.logger import logger as log
from tools import nmap_runner, sqlmap_runner, dirsearch_tool
from scanners.cve_scanner import suggest_cves
from scanners.live_exploit_generator import generate_live_exploit
from reporting.report_generator import generate_pdf_report
from automation.prompt_memory import save_scan_context, search_memory
from reporting.ai_writer import generate_remediation_advice
from utils.vector_memory import store_vector, search_similar_vectors
from integrations.attack_frameworks import mitre_lookup, ai4sec_check, defectdojo_push

AUTO_MODE = True
USE_CLOUD = True  # Fallback to OpenAI/Grok if local model is off
ENABLE_CHAT_MODE = True  # Enable terminal-based manual chat
VECTOR_MEMORY_ENABLED = True


def summarize_scan_results(tool_name, results):
    if tool_name == "nmap":
        summary = f"Nmap found open ports: {', '.join(str(port['port']) for port in results.get('open_ports', []))}.\n"
        summary += f"Services: {', '.join(set(p['service'] for p in results.get('open_ports', [])))}"
        return summary
    elif tool_name == "sqlmap":
        return "SQLMap discovered injectable points." if results.get("vulnerable") else "No SQLi points found."
    return f"Scan from {tool_name}: {json.dumps(results)[:500]}..."

def ask_ai(prompt):
    try:
        return query_cloud_llm(prompt) if USE_CLOUD else query_local_llm(prompt)
    except Exception as e:
        log("AI_BRIDGE", f"Cloud LLM failed, using local: {e}")
        return query_local_llm(prompt)

def run_recommended_tool(ai_suggestion, target):
    if "sqlmap" in ai_suggestion.lower():
        log("AI_BRIDGE", f"Auto-running SQLMap on {target}")
        return sqlmap_runner.run_sqlmap(target)
    elif "dirsearch" in ai_suggestion.lower():
        log("AI_BRIDGE", f"Auto-running Dirsearch on {target}")
        return dirsearch_tool.run_dirsearch(target)
    return "No auto-action triggered."

def chat_with_ai():
    print("🔧 Entering manual AI Chat Mode (type 'exit' to quit):")
    while True:
        q = input("👤 You: ")
        if q.lower() in ["exit", "quit"]: break
        res = ask_ai(q)
        print(f"🤖 AI: {res}")

def ai_scan_bridge(target, scan_results, tech_stack=None):
    summary_parts = []
    for tool_name, result in scan_results.items():
        summary_parts.append(summarize_scan_results(tool_name, result))
    summary = "\n".join(summary_parts)

    # Memory: save + recall
    if VECTOR_MEMORY_ENABLED:
        store_vector(summary, meta={"target": target})
        similar = search_similar_vectors(summary)
        if similar:
            log("AI_BRIDGE", f"🔁 Similar past scans found: {similar[:2]}")

    prompt = f"""You're a cybersecurity assistant. Based on this scan result, recommend next actions.

Scan Summary:
{summary}
{"Detected Tech Stack: " + ', '.join(tech_stack) if tech_stack else ""}

Be concise and actionable. Suggest tools, techniques, and reasoning. Return in plain text."""
    ai_response = ask_ai(prompt)

    log("AI_BRIDGE", f"🧠 AI Suggestion: {ai_response}")
    if AUTO_MODE:
        result = run_recommended_tool(ai_response, target)
        log("AI_BRIDGE", f"Auto-run result: {result}")

    # CVE suggestion
    if tech_stack:
        cve_data = suggest_cves(tech_stack)
        log("AI_BRIDGE", f"🔥 Suggested CVEs: {cve_data}")

    # Live exploit
    if "exploit" in ai_response.lower():
        poc = generate_live_exploit(ai_response)
        log("AI_BRIDGE", f"💥 Generated Exploit PoC:\n{poc}")

    # Remediation in Markdown/PDF
    remediation = generate_remediation_advice(scan_summary=summary, ai_context=ai_response)
    filename = f"outputs/remediation_{target}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    generate_pdf_report(remediation, filename)
    log("AI_BRIDGE", f"🩹 Remediation advice saved to {filename}")

    # External tool integrations
    attack_info = mitre_lookup(tech_stack)
    ai4_findings = ai4sec_check(summary)
    defectdojo_push(target, summary, ai_response)

    if ENABLE_CHAT_MODE:
        chat_with_ai()

    # Save memory and log
    save_scan_context(target, summary, ai_response)

    return {
        "ai_suggestion": ai_response,
        "summary": summary,
        "auto_result": result if AUTO_MODE else "Manual mode",
        "remediation_pdf": filename,
        "cve_info": cve_data,
        "attack_matrix": attack_info,
        "ai4sec_results": ai4_findings,
    }

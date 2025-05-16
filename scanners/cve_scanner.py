# scanners/cve_scanner.py

import requests
import json
import time
from utils.logger import log
from llm.offline_chat import get_ai_summary
from scanners.live_exploit_generator import generate_exploit_from_cve

CVE_API = "https://services.nvd.nist.gov/rest/json/cves/2.0"
GITHUB_SEARCH_URL = "https://api.github.com/search/code"
EXPLOIT_DB_SEARCH_URL = "https://www.exploit-db.com/search"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (AI-Hacker-Scanner)"
}

def fetch_cve_details(keyword, max_results=10):
    """Fetch CVE info using NVD API"""
    log(f"Fetching CVEs for: {keyword}")
    params = {
        "keywordSearch": keyword,
        "resultsPerPage": max_results
    }

    try:
        res = requests.get(CVE_API, params=params, headers=HEADERS)
        res.raise_for_status()
        data = res.json()
        return data.get("vulnerabilities", [])
    except Exception as e:
        log(f"[ERROR] CVE fetch failed: {e}")
        return []

def extract_info(cve_entry):
    """Normalize CVE info"""
    cve_id = cve_entry["cve"]["id"]
    description = cve_entry["cve"]["descriptions"][0]["value"]
    cvss_score = cve_entry.get("cve", {}).get("metrics", {}).get("cvssMetricV31", [{}])[0].get("cvssData", {}).get("baseScore", 0)
    severity = cve_entry.get("cve", {}).get("metrics", {}).get("cvssMetricV31", [{}])[0].get("cvssData", {}).get("baseSeverity", "UNKNOWN")

    return {
        "id": cve_id,
        "desc": description,
        "score": cvss_score,
        "severity": severity
    }

def search_exploit_github(cve_id):
    """Search GitHub for PoC"""
    try:
        res = requests.get(GITHUB_SEARCH_URL, params={"q": cve_id}, headers=HEADERS)
        res.raise_for_status()
        return [item["html_url"] for item in res.json().get("items", [])]
    except Exception as e:
        log(f"[WARN] GitHub PoC search failed: {e}")
        return []

def classify_exploit_ai(cve_info):
    """Use AI to classify type of exploit"""
    prompt = f"Classify this CVE: {cve_info['id']} with description: {cve_info['desc']} into types like RCE, LFI, SQLi, etc."
    return get_ai_summary(prompt)

def scan_target_for_cves(keyword):
    results = []
    cve_list = fetch_cve_details(keyword)

    for entry in cve_list:
        info = extract_info(entry)
        log(f"Analyzing {info['id']} ({info['severity']})")

        ai_classification = classify_exploit_ai(info)
        exploit_links = search_exploit_github(info["id"])
        auto_generated = generate_exploit_from_cve(info["id"], info["desc"])

        info.update({
            "ai_type": ai_classification,
            "exploits": exploit_links,
            "ai_poc": auto_generated
        })

        results.append(info)
        time.sleep(1.2)  # Respect rate limit

    return results

def save_cve_report(data, path="outputs/cve_report.json"):
    with open(path, "w") as f:
        json.dump(data, f, indent=4)
    log(f"[+] CVE report saved to: {path}")

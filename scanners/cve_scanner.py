# scanners/cve_scanner.py

import requests
import json
import time
import os
import sqlite3
import csv
from utils.logger import logger as log
from llm.offline_chat import get_ai_summary
from scanners.live_exploit_generator import generate_exploit_from_cve
from datetime import datetime
from markdownify import markdownify as md

CVE_API = "https://services.nvd.nist.gov/rest/json/cves/2.0"
GITHUB_SEARCH_URL = "https://api.github.com/search/code"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (AI-Hacker-Scanner)"
}

DB_PATH = "outputs/cve_cache.db"

# === Local SQLite Caching ===
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS cves (
                        id TEXT PRIMARY KEY,
                        description TEXT,
                        score REAL,
                        severity TEXT,
                        ai_type TEXT,
                        github_links TEXT,
                        ai_poc TEXT,
                        timestamp TEXT
                    )''')
    conn.commit()
    conn.close()

def save_to_db(entry):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO cves (id, description, score, severity, ai_type, github_links, ai_poc, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (entry["id"], entry["desc"], entry["score"], entry["severity"], entry["ai_type"],
          json.dumps(entry["exploits"]), entry["ai_poc"], datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

def fetch_cached_cve(cve_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cves WHERE id=?", (cve_id,))
    row = cursor.fetchone()
    conn.close()
    return row

# === CVE Scanner Core ===
def fetch_cve_details(keyword, max_results=10):
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
    cve_id = cve_entry["cve"]["id"]
    description = cve_entry["cve"]["descriptions"][0]["value"]
    metrics = cve_entry.get("cve", {}).get("metrics", {})
    score = 0
    severity = "UNKNOWN"

    if "cvssMetricV31" in metrics:
        score = metrics["cvssMetricV31"][0]["cvssData"]["baseScore"]
        severity = metrics["cvssMetricV31"][0]["cvssData"]["baseSeverity"]

    return {
        "id": cve_id,
        "desc": description,
        "score": score,
        "severity": severity
    }

def search_exploit_github(cve_id):
    try:
        res = requests.get(GITHUB_SEARCH_URL, params={"q": cve_id}, headers=HEADERS)
        res.raise_for_status()
        return [item["html_url"] for item in res.json().get("items", [])]
    except Exception as e:
        log(f"[WARN] GitHub PoC search failed: {e}")
        return []

def classify_exploit_ai(cve_info):
    prompt = f"Classify this CVE: {cve_info['id']} with description: {cve_info['desc']} into types like RCE, LFI, SQLi, etc."
    return get_ai_summary(prompt)

def scan_target_for_cves(keyword):
    init_db()
    results = []
    cve_list = fetch_cve_details(keyword)

    for entry in cve_list:
        info = extract_info(entry)
        cached = fetch_cached_cve(info["id"])
        if cached:
            log(f"[CACHED] Loaded {info['id']} from local DB")
            continue

        log(f"Analyzing {info['id']} ({info['severity']})")
        ai_classification = classify_exploit_ai(info)
        exploit_links = search_exploit_github(info["id"])
        auto_generated = generate_exploit_from_cve(info["id"], info["desc"])

        info.update({
            "ai_type": ai_classification,
            "exploits": exploit_links,
            "ai_poc": auto_generated
        })

        save_to_db(info)
        results.append(info)
        time.sleep(1.5)

    return results

# === Exporters ===
def save_json(data, path="outputs/cve_report.json"):
    with open(path, "w") as f:
        json.dump(data, f, indent=4)
    log(f"[+] JSON report saved to: {path}")

def save_csv(data, path="outputs/cve_report.csv"):
    with open(path, "w", newline='') as f:
        writer = csv.DictWriter(f, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
    log(f"[+] CSV report saved to: {path}")

def save_markdown(data, path="outputs/cve_report.md"):
    with open(path, "w") as f:
        for entry in data:
            f.write(f"## {entry['id']} ({entry['severity']})\n")
            f.write(f"- Score: {entry['score']}\n")
            f.write(f"- Description: {entry['desc']}\n")
            f.write(f"- AI Type: {entry['ai_type']}\n")
            f.write(f"- PoCs: {[link for link in entry['exploits']]}\n")
            f.write("\n")
    log(f"[+] Markdown report saved to: {path}")

def save_html(data, path="outputs/cve_report.html"):
    html = "<html><body><h1>CVE Report</h1>"
    for entry in data:
        html += f"<h2>{entry['id']} ({entry['severity']})</h2>"
        html += f"<p><strong>Score:</strong> {entry['score']}<br>"
        html += f"<strong>Description:</strong> {entry['desc']}<br>"
        html += f"<strong>AI Type:</strong> {entry['ai_type']}<br>"
        html += f"<strong>PoCs:</strong> <ul>"
        for link in entry['exploits']:
            html += f"<li><a href='{link}'>{link}</a></li>"
        html += "</ul></p>"
    html += "</body></html>"

    with open(path, "w") as f:
        f.write(html)
    log(f"[+] HTML report saved to: {path}")

import os
import re
import json
import subprocess
import requests
from datetime import datetime
from utils.logger import logger
from utils.output import save_output
from config import GITHUB_API_TOKEN

GITHUB_SEARCH_API = "https://api.github.com/search/code"
SECRET_PATTERNS = {
    "AWS": r"AKIA[0-9A-Z]{16}",
    "Slack Token": r"xox[baprs]-[0-9a-zA-Z]{10,48}",
    "Google API": r"AIza[0-9A-Za-z\\-_]{35}",
    "Private Key": r"-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----",
    "Basic Auth": r"Authorization:\s*Basic\s+[A-Za-z0-9+/=]+",
    "JWT": r"eyJ[A-Za-z0-9-_]+?\.[A-Za-z0-9-_]+?\.[A-Za-z0-9-_]+"
}

HEADERS = {
    "Authorization": f"token {GITHUB_API_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

def search_github_code(query, per_page=10):
    logger.info(f"Searching GitHub for: {query}")
    params = {"q": query, "per_page": per_page}
    response = requests.get(GITHUB_SEARCH_API, headers=HEADERS, params=params)

    if response.status_code == 200:
        return response.json().get("items", [])
    else:
        logger.error(f"GitHub search failed: {response.status_code} {response.text}")
        return []

def analyze_code_snippet(code):
    matches = {}
    for key, pattern in SECRET_PATTERNS.items():
        found = re.findall(pattern, code)
        if found:
            matches[key] = found
    return matches

def fetch_and_analyze_result(item):
    raw_url = item.get("html_url", "").replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
    logger.debug(f"Fetching: {raw_url}")
    try:
        content = requests.get(raw_url).text
        findings = analyze_code_snippet(content)
        return {
            "url": raw_url,
            "repository": item.get("repository", {}).get("full_name"),
            "path": item.get("path"),
            "findings": findings
        } if findings else None
    except Exception as e:
        logger.error(f"Error fetching raw file: {e}")
        return None

def github_leak_detector(target, output_formats=["json", "txt"]):
    logger.info(f"Running GitHub Leak Detector for: {target}")
    queries = [
        f"{target} AWS",
        f"{target} password",
        f"{target} token",
        f"{target} secret"
    ]
    results = []

    for query in queries:
        items = search_github_code(query)
        for item in items:
            result = fetch_and_analyze_result(item)
            if result:
                results.append(result)

    logger.info(f"Found {len(results)} potential leaks")
    for fmt in output_formats:
        save_output("github_leaks", target, results, fmt)

    return results

# Optional CLI fallback using git-hound
def use_git_hound(domain):
    logger.info(f"Using git-hound CLI fallback for {domain}")
    try:
        cmd = ["git-hound", "search", "--subdomain", domain]
        result = subprocess.run(cmd, capture_output=True, text=True)
        leaks = result.stdout.splitlines()
        for leak in leaks:
            logger.warning(f"GIT-HOUND Leak: {leak}")
        return leaks
    except FileNotFoundError:
        logger.error("git-hound CLI not found.")
        return []


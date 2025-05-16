import os
import re
import json
import subprocess
import requests
from datetime import datetime
from utils.logger import logger
from utils.output import save_output
from config import settings

# Optional 3rd-party APIs (add your API keys)
GITHUB_API_TOKEN = settings.get("GITHUB_API_TOKEN", "your_github_token")
TELEGRAM_BOT_TOKEN = settings.get("TELEGRAM_BOT_TOKEN", "your_bot_token")
TELEGRAM_CHAT_ID = settings.get("TELEGRAM_CHAT_ID", "your_chat_id")
DISCORD_WEBHOOK_URL = settings.get("DISCORD_WEBHOOK_URL", "https://discord.com/api/webhooks/....")
USE_TOR_PROXY = settings.get("USE_TOR_PROXY", True)

GITHUB_SEARCH_API = "https://api.github.com/search/code"
NVD_API = "https://services.nvd.nist.gov/rest/json/cve/1.0/"
SECRET_PATTERNS = {
    "AWS": r"AKIA[0-9A-Z]{16}",
    "Slack Token": r"xox[baprs]-[0-9a-zA-Z]{10,48}",
    "Google API": r"AIza[0-9A-Za-z\\-_]{35}",
    "Private Key": r"-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----",
    "Basic Auth": r"Authorization:\s*Basic\s+[A-Za-z0-9+/=]+",
    "JWT": r"eyJ[A-Za-z0-9-_]+?\.[A-Za-z0-9-_]+?\.[A-Za-z0-9-_]+",
    "CVE PoC": r"CVE-\d{4}-\d{4,7}",
    "Heroku API Key": r"(?i)heroku[a-z0-9]{32}",
    "DB Connection String": r"(mongodb|mysql|postgresql):\/\/[^\s]+",
    "GitHub Token": r"ghp_[0-9a-zA-Z]{36}",
    "GitLab Token": r"glpat-[0-9a-zA-Z]{20,40}",
    "Bitbucket Token": r"BB[0-9a-zA-Z]{16}",
    "Stripe Secret": r"sk_live_[0-9a-zA-Z]{24}",
    "Twilio Auth Token": r"(?i)AC[a-z0-9]{32}",
    "Facebook Token": r"EAACEdEose0cBA[0-9A-Za-z]+",
    "Twitter API Key": r"(?i)twitter[a-z0-9]{32}",
    "LinkedIn Token": r"(?i)linkedin[a-z0-9]{32}",
    "Dropbox Token": r"(?i)dropbox[a-z0-9]{32}",
    "Mailgun API Key": r"key-[0-9a-zA-Z]{32}",
    "SendGrid API Key": r"SG\.[0-9a-zA-Z]{22}\.[0-9a-zA-Z_-]{43}",
    "CVE ID": r"CVE-\d{4}-\d{4,7}",
    "API Key": r"(?i)api[-_]?key\s*=\s*[0-9a-zA-Z]{32,}",
    "OAuth Token": r"(?i)oauth[-_]?token\s*=\s*[0-9a-zA-Z]{32,}",
}

HEADERS = {
    "Authorization": f"token {GITHUB_API_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

PROXIES = {
    "http": "socks5h://127.0.0.1:9050",
    "https": "socks5h://127.0.0.1:9050"
} if USE_TOR_PROXY else None

def search_github_code(query, per_page=10):
    logger.info(f"Searching GitHub for: {query}")
    params = {"q": query, "per_page": per_page}
    response = requests.get(GITHUB_SEARCH_API, headers=HEADERS, params=params, proxies=PROXIES)

    if response.status_code == 200:
        return response.json().get("items", [])
    else:
        logger.error(f"GitHub search failed: {response.status_code} {response.text}")
        return []

def fetch_cvss_score(cve_id):
    try:
        response = requests.get(NVD_API + cve_id)
        data = response.json()
        return data["result"]["CVE_Items"][0]["impact"]["baseMetricV3"]["cvssV3"]["baseScore"]
    except Exception as e:
        logger.warning(f"Could not fetch CVSS score for {cve_id}: {e}")
        return None

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
        content = requests.get(raw_url, proxies=PROXIES).text
        findings = analyze_code_snippet(content)
        result = {
            "url": raw_url,
            "repository": item.get("repository", {}).get("full_name"),
            "path": item.get("path"),
            "findings": findings,
            "cvss_scores": {}
        }

        # Optional: attach CVSS if CVE found
        if "CVE PoC" in findings:
            for cve_id in findings["CVE PoC"]:
                score = fetch_cvss_score(cve_id)
                if score:
                    result["cvss_scores"][cve_id] = score

        return result if findings else None
    except Exception as e:
        logger.error(f"Error fetching raw file: {e}")
        return None

def send_telegram_alert(message):
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        requests.post(url, data={"chat_id": TELEGRAM_CHAT_ID, "text": message})
    except Exception as e:
        logger.error(f"Telegram alert failed: {e}")

def send_discord_alert(message):
    try:
        requests.post(DISCORD_WEBHOOK_URL, json={"content": message})
    except Exception as e:
        logger.error(f"Discord alert failed: {e}")

def github_leak_detector(target, output_formats=["json", "txt"], notify=True):
    logger.info(f"🔎 GitHub Leak Detection for: {target}")
    queries = [
        f"{target} AWS",
        f"{target} password",
        f"{target} token",
        f"{target} secret",
        f"{target} CVE",
        f"{target} api_key"
    ]
    results = []

    for query in queries:
        items = search_github_code(query)
        for item in items:
            result = fetch_and_analyze_result(item)
            if result:
                results.append(result)
                if notify:
                    msg = f"🔐 Leak found in `{result['repository']}` at `{result['url']}`:\n{json.dumps(result['findings'], indent=2)}"
                    send_telegram_alert(msg)
                    send_discord_alert(msg)

    logger.info(f"✅ Found {len(results)} leaks.")
    for fmt in output_formats:
        save_output("github_leaks", target, results, fmt)

    return results

def use_git_hound(domain):
    logger.info(f"Using git-hound fallback for {domain}")
    try:
        cmd = ["git-hound", "search", "--subdomain", domain]
        result = subprocess.run(cmd, capture_output=True, text=True)
        leaks = result.stdout.splitlines()
        for leak in leaks:
            logger.warning(f"GIT-HOUND: {leak}")
        return leaks
    except FileNotFoundError:
        logger.error("git-hound CLI not installed")
        return []

def scan_repo(self, repo_url, save_formats=["json", "txt"]):
        leaks = []
        repo_parts = repo_url.replace("https://github.com/", "").split('/')
        if len(repo_parts) < 2:
            log("Invalid GitHub repository URL", level="error")
            return

        user, repo = repo_parts[:2]
        search_url = f"https://api.github.com/search/code?q=repo:{user}/{repo}"
        response = requests.get(search_url, headers=self.headers)

        if response.status_code != 200:
            log(f"GitHub API error: {response.status_code} {response.text}", level="error")
            return

        results = response.json().get("items", [])
        for item in results:
            file_url = item.get("url")
            raw_response = requests.get(file_url, headers=self.headers).json()
            content = raw_response.get("content", "")
            for name, pattern in self.leak_patterns.items():
                matches = re.findall(pattern, content, re.MULTILINE)
                for match in matches:
                    leak = {
                        "type": name,
                        "match": match,
                        "file": item.get("html_url"),
                        "repo": repo_url,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    leaks.append(leak)
                    log(f"Leak found in {item.get('html_url')}: {name}")

        if leaks:
            for fmt in save_formats:
                save_output("github_leaks", repo_url, leaks, format=fmt)
        else:
            log("No leaks found.")

def scan_user_repos(self, username):
        repos_url = f"https://api.github.com/users/{username}/repos"
        response = requests.get(repos_url, headers=self.headers)
        if response.status_code != 200:
            logger.error(f"Error fetching repos: {response.status_code}")
            return

        for repo in response.json():
            repo_url = repo.get("html_url")
            logger.info(f"Scanning repo: {repo_url}")
            self.scan_repo(repo_url)


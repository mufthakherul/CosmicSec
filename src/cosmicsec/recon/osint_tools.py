import requests
import subprocess
import json
import time
from datetime import datetime
from utils.logger import logger as log
from utils.output import save_output
from config import settings

class OSINTToolkit:
    def __init__(self, target):
        self.target = target
        self.output = {}
        self.timestamp = datetime.utcnow().isoformat()

    def check_breach_data(self):
        """Check for breached emails using haveibeenpwned API"""
        try:
            url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{self.target}"
            headers = {
                "User-Agent": "HackerAI",
                "hibp-api-key": settings.get("HIBP_API_KEY")
            }
            res = requests.get(url, headers=headers)
            if res.status_code == 200:
                self.output['breaches'] = res.json()
                log(f"[+] Breach data found for {self.target}")
            elif res.status_code == 404:
                self.output['breaches'] = []
                log(f"[-] No breach data for {self.target}")
        except Exception as e:
            log(f"[!] Breach lookup failed: {e}")

    def google_dorks(self):
        """Generate Google dork links for target"""
        dorks = [
            f"site:{self.target} intitle:index.of",
            f"site:{self.target} filetype:sql | filetype:env",
            f"site:{self.target} inurl:admin",
            f"site:{self.target} ext:log | ext:bak"
        ]
        self.output['dork_links'] = [f"https://www.google.com/search?q={dork}" for dork in dorks]
        log("[+] Google dork links generated.")

    def username_tracking(self, username):
        """Track username across platforms using Sherlock"""
        try:
            cmd = ["sherlock", username, "--print-found"]
            result = subprocess.check_output(cmd, text=True)
            self.output['sherlock'] = result
            log(f"[+] Sherlock results for {username}")
        except Exception as e:
            log(f"[!] Sherlock failed: {e}")

    def search_pastebin(self):
        """Scrape Pastebin for leaks related to the target"""
        try:
            url = f"https://psbdmp.ws/api/search/{self.target}"
            res = requests.get(url)
            if res.status_code == 200:
                self.output['pastebin'] = res.json()
                log(f"[+] Pastebin leaks found for {self.target}")
        except Exception as e:
            log(f"[!] Pastebin search failed: {e}")

    def github_footprint(self):
        """Search GitHub for leaks or repo footprints"""
        try:
            url = f"https://api.github.com/search/code?q={self.target}+in:file"
            headers = {"Authorization": f"token {settings.get('GITHUB_TOKEN')}"}
            res = requests.get(url, headers=headers)
            if res.status_code == 200:
                self.output['github'] = res.json().get("items", [])
                log("[+] GitHub code mentions found.")
        except Exception as e:
            log(f"[!] GitHub OSINT failed: {e}")

    def passive_dns_lookup(self):
        """Use SecurityTrails or similar for passive DNS history"""
        try:
            api_key = settings.get("SECURITYTRAILS_API_KEY")
            url = f"https://api.securitytrails.com/v1/domain/{self.target}/dns/history"
            headers = {"APIKEY": api_key}
            res = requests.get(url, headers=headers)
            if res.status_code == 200:
                self.output['dns_history'] = res.json()
                log(f"[+] Passive DNS history fetched for {self.target}")
        except Exception as e:
            log(f"[!] Passive DNS lookup failed: {e}")

    def whois_timeline(self):
        """Track historical WHOIS records"""
        try:
            url = f"https://rdap.org/domain/{self.target}"
            res = requests.get(url)
            if res.status_code == 200:
                self.output['whois'] = res.json()
                log("[+] WHOIS timeline data retrieved.")
        except Exception as e:
            log(f"[!] WHOIS lookup failed: {e}")

    def spiderfoot_integration(self):
        """Trigger Spiderfoot scan (API/CLI version required)"""
        try:
            # Replace this with real Spiderfoot CLI/API integration
            cmd = ["python3", "spiderfoot.py", "-s", self.target]
            result = subprocess.check_output(cmd, text=True)
            self.output['spiderfoot'] = result
            log("[+] Spiderfoot scan triggered.")
        except Exception as e:
            log(f"[!] Spiderfoot failed: {e}")

    def maltego_placeholder(self):
        """Placeholder for Maltego integration"""
        self.output['maltego_note'] = "Manual or plugin-based Maltego integration required."
        log("[~] Maltego integration is a placeholder for now.")

    def generate_graph_links(self):
        """Save data to graph.json for later Neo4j/D3.js graph building"""
        graph_data = {
            "target": self.target,
            "timestamp": self.timestamp,
            "relations": {
                "breaches": self.output.get("breaches", []),
                "dns": self.output.get("dns_history", {}),
                "whois": self.output.get("whois", {}),
                "github": [x.get("html_url") for x in self.output.get("github", [])],
                "pastebin": self.output.get("pastebin", []),
                "dork_links": self.output.get("dork_links", []),
            }
        }
        save_output("graphs", self.target, graph_data, format="json")
        log("[+] Graph data prepared for Neo4j/D3.js")

    def run_all(self, username=None):
        self.check_breach_data()
        self.google_dorks()
        self.search_pastebin()
        self.github_footprint()
        self.passive_dns_lookup()
        self.whois_timeline()
        self.spiderfoot_integration()
        self.maltego_placeholder()
        if username:
            self.username_tracking(username)

        self.generate_graph_links()
        save_output("osint", self.target, self.output, format="json")

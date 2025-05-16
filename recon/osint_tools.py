import requests
import subprocess
from utils.logger import log
from utils.output import save_output
from config import settings

class OSINTToolkit:
    def __init__(self, target):
        self.target = target
        self.output = {}

    def check_breach_data(self):
        """Check for breached emails using haveibeenpwned API"""
        try:
            url = f"https://haveibeenpwned.com/api/v3/breachedaccount/{self.target}"
            headers = {"User-Agent": "HackerAI", "hibp-api-key": settings.get("HIBP_API_KEY")}
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

    def run_all(self, username=None):
        self.check_breach_data()
        self.google_dorks()
        self.search_pastebin()
        self.github_footprint()
        if username:
            self.username_tracking(username)
        save_output("osint", self.target, self.output, format="json")


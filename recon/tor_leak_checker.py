import requests
import subprocess
import json
import os
from utils.logger import log
from utils.output import save_output
from config import settings

class TorLeakScanner:
    def __init__(self, target):
        self.target = target
        self.output = {}
        self.session = requests.session()
        self.session.proxies = {
            "http": "socks5h://127.0.0.1:9050",
            "https": "socks5h://127.0.0.1:9050"
        }

    def check_onion_sites(self):
        """Search .onion search engines for mentions of the target"""
        try:
            query = self.target.replace(" ", "+")
            ahmia_url = f"https://ahmia.fi/search/?q={query}"
            resp = requests.get(ahmia_url, timeout=15)
            if resp.status_code == 200:
                self.output["ahmia"] = resp.text
                log("[+] Ahmia search completed.")
        except Exception as e:
            log(f"[!] Ahmia search failed: {e}")

    def recon_darknet(self):
        """Query Recon Onion service for leaked data (manual .onion URL required)"""
        try:
            url = settings.get("RECON_ONION_URL")  # Set this in config
            if not url.endswith("/"):
                url += "/"
            full_url = f"{url}api/search/{self.target}"
            resp = self.session.get(full_url, timeout=30)
            if resp.status_code == 200:
                self.output["recon"] = resp.json()
                log("[+] Recon Onion leak data found.")
        except Exception as e:
            log(f"[!] Recon search failed: {e}")

    def phobos_market_search(self):
        """Check Phobos or darknet market mirrors for target leaks"""
        try:
            mirror_list = settings.get("PHOBOS_MIRRORS", [])
            for mirror in mirror_list:
                url = f"{mirror}/search?q={self.target}"
                resp = self.session.get(url, timeout=30)
                if resp.status_code == 200:
                    self.output.setdefault("phobos_results", []).append(resp.text[:1000])  # limit dump
                    log(f"[+] Market search result from: {mirror}")
        except Exception as e:
            log(f"[!] Phobos market check failed: {e}")

    def darknet_paste_dump(self):
        """Scrape hidden paste sites (.onion) for mentions of the target"""
        onion_pastes = [
            "http://pastebincnqlrj.onion",
            "http://zerobin5xltnrr.onion",
            "http://note4privacy.onion"
        ]
        for url in onion_pastes:
            try:
                resp = self.session.get(f"{url}/search?q={self.target}", timeout=20)
                if resp.status_code == 200:
                    self.output.setdefault("onion_pastes", []).append({url: resp.text[:1000]})
                    log(f"[+] Found potential paste match on: {url}")
            except Exception as e:
                log(f"[!] Error checking paste site {url}: {e}")

    def risk_score_analysis(self):
        """Estimate severity based on findings"""
        score = 0
        indicators = []

        if "recon" in self.output:
            score += 50
            indicators.append("Leaked data on Recon")

        if "onion_pastes" in self.output:
            score += 25
            indicators.append("Pastes found on .onion sites")

        if "phobos_results" in self.output:
            score += 20
            indicators.append("Mentions in black markets")

        if score == 0:
            risk = "Low"
        elif score < 60:
            risk = "Medium"
        else:
            risk = "High"

        self.output["risk_score"] = {
            "score": score,
            "level": risk,
            "indicators": indicators
        }
        log(f"[+] Risk Score Calculated: {risk} ({score})")

    def anonymize_output(self):
        """Sanitize dangerous data from raw dumps for safety"""
        safe_data = {}
        for key, val in self.output.items():
            if isinstance(val, str):
                safe_data[key] = val[:1000].replace("<", "").replace(">", "")  # strip tags
            elif isinstance(val, list):
                safe_data[key] = [str(v)[:500] for v in val]
            elif isinstance(val, dict):
                safe_data[key] = {k: str(v)[:500] for k, v in val.items()}
            else:
                safe_data[key] = str(val)[:1000]
        self.output["safe_dump"] = safe_data
        log("[+] Output sanitized for safe viewing.")

    def run_all(self):
        log(f"[*] Starting dark web recon for: {self.target}")
        self.check_onion_sites()
        self.recon_darknet()
        self.phobos_market_search()
        self.darknet_paste_dump()
        self.risk_score_analysis()
        self.anonymize_output()

        save_output("tor_leaks", self.target, self.output, format="json")

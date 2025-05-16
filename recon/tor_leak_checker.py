import requests
import subprocess
import json
import os
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from utils.logger import logger
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

    def check_tor_connection(self):
        try:
            test_url = "http://check.torproject.org"
            resp = self.session.get(test_url, timeout=10)
            if "Congratulations" in resp.text:
                logger.info("[+] TOR routing verified.")
                self.output["tor_status"] = "Connected"
            else:
                logger.warning("[!] TOR routing check failed.")
                self.output["tor_status"] = "Not using TOR"
        except Exception as e:
            logger.error(f"[!] TOR connection check failed: {e}")
            self.output["tor_status"] = "Error"

    def check_onion_sites(self):
        try:
            query = self.target.replace(" ", "+")
            ahmia_url = f"https://ahmia.fi/search/?q={query}"
            resp = requests.get(ahmia_url, timeout=15)
            if resp.status_code == 200:
                self.output["ahmia"] = resp.text
                logger.info("[+] Ahmia search completed.")
        except Exception as e:
            logger.warning(f"[!] Ahmia search failed: {e}")

    def recon_darknet(self):
        try:
            url = settings.get("RECON_ONION_URL", "")
            if not url.endswith("/"):
                url += "/"
            full_url = f"{url}api/search/{self.target}"
            resp = self.session.get(full_url, timeout=30)
            if resp.status_code == 200:
                self.output["recon"] = resp.json()
                logger.info("[+] Recon Onion leak data found.")
        except Exception as e:
            logger.warning(f"[!] Recon search failed: {e}")

    def phobos_market_search(self):
        try:
            mirror_list = settings.get("PHOBOS_MIRRORS", [])
            for mirror in mirror_list:
                url = f"{mirror}/search?q={self.target}"
                resp = self.session.get(url, timeout=30)
                if resp.status_code == 200:
                    self.output.setdefault("phobos_results", []).append(resp.text[:1000])
                    logger.info(f"[+] Market search result from: {mirror}")
        except Exception as e:
            logger.warning(f"[!] Phobos market check failed: {e}")

    def darknet_paste_dump(self):
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
                    logger.info(f"[+] Found potential paste match on: {url}")
            except Exception as e:
                logger.warning(f"[!] Error checking paste site {url}: {e}")

    def crawl_hidden_services(self, seed_urls):
        discovered = set()
        for seed in seed_urls:
            try:
                resp = self.session.get(seed, timeout=20)
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    for link in soup.find_all("a", href=True):
                        href = link['href']
                        if ".onion" in href:
                            abs_url = urljoin(seed, href)
                            discovered.add(abs_url)
            except Exception as e:
                logger.warning(f"[!] Failed to crawl {seed}: {e}")
        self.output["discovered_onions"] = list(discovered)
        logger.info(f"[+] Discovered {len(discovered)} hidden services.")

    def risk_score_analysis(self):
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
        logger.info(f"[+] Risk Score Calculated: {risk} ({score})")

    def anonymize_output(self):
        safe_data = {}
        for key, val in self.output.items():
            if isinstance(val, str):
                safe_data[key] = val[:1000].replace("<", "").replace(">", "")
            elif isinstance(val, list):
                safe_data[key] = [str(v)[:500] for v in val]
            elif isinstance(val, dict):
                safe_data[key] = {k: str(v)[:500] for k, v in val.items()}
            else:
                safe_data[key] = str(val)[:1000]
        self.output["safe_dump"] = safe_data
        logger.info("[+] Output sanitized for safe viewing.")

    def run_all(self):
        logger.info(f"[*] Starting dark web recon for: {self.target}")
        self.check_tor_connection()
        self.check_onion_sites()
        self.recon_darknet()
        self.phobos_market_search()
        self.darknet_paste_dump()
        self.crawl_hidden_services(["http://ahmia.fi/onions/"])
        self.risk_score_analysis()
        self.anonymize_output()
        save_output("tor_leaks", self.target, self.output, format="json")

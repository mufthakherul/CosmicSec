# recon/subdomain_finder.py
import requests
from utils.logger import logger

CRT_SH_URL = "https://crt.sh/?q=%25.{domain}&output=json"

def find_subdomains(domain):
    try:
        response = requests.get(CRT_SH_URL.format(domain=domain), timeout=10)
        subdomains = list(set(entry['name_value'] for entry in response.json()))
        logger.info(f"[SubdomainFinder] Found {len(subdomains)} subdomains.")
        return subdomains
    except Exception as e:
        logger.error(f"[SubdomainFinder] Failed to fetch: {e}")
        return []



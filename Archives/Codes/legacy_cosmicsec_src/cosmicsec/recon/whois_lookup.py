# recon/whois_lookup.py
import whois
from utils.logger import logger

def get_whois(domain):
    try:
        w = whois.whois(domain)
        return w
    except Exception as e:
        logger.error(f"[WHOIS] Error fetching WHOIS for {domain}: {e}")
        return {}



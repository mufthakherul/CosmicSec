# recon/ip_locator.py
import requests
from utils.logger import logger

def geoip_lookup(ip):
    try:
        res = requests.get(f"https://ipinfo.io/{ip}/json")
        return res.json()
    except Exception as e:
        logger.error(f"[IP Locator] Error: {e}")
        return {}



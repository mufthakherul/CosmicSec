# recon/info_gathering.py

import socket
import whois
import dns.resolver
import argparse
import os
from utils.logger import logger
from utils.output import save_output

def get_whois_info(domain):
    try:
        data = whois.whois(domain)
        return dict(data)
    except Exception as e:
        logger.warning(f"[WHOIS] Failed for {domain}: {e}")
        return {"error": str(e)}

def get_dns_info(domain):
    result = {}
    try:
        result["A"] = [r.to_text() for r in dns.resolver.resolve(domain, 'A')]
        result["MX"] = [r.to_text() for r in dns.resolver.resolve(domain, 'MX')]
        result["NS"] = [r.to_text() for r in dns.resolver.resolve(domain, 'NS')]
    except Exception as e:
        logger.warning(f"[DNS] Failed for {domain}: {e}")
        result["error"] = str(e)
    return result

def get_ip(domain):
    try:
        return socket.gethostbyname(domain)
    except Exception as e:
        logger.warning(f"[IP] Failed to resolve {domain}: {e}")
        return "Resolution failed"

def run_info_scan(domain):
    logger.info(f"[INFO_GATHERING] Gathering info for: {domain}")
    data = {
        "domain": domain,
        "ip_address": get_ip(domain),
        "whois": get_whois_info(domain),
        "dns": get_dns_info(domain),
    }

    for fmt in ["json", "txt"]:
        save_output("info_gathering", domain, data, format=fmt)

    return data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Domain Info Gathering")
    parser.add_argument("domain", help="Domain to scan")
    args = parser.parse_args()

    run_info_scan(args.domain)

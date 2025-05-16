# recon/info_gathering.py

import socket
import whois
import requests
import json
import subprocess
from ipwhois import IPWhois
from datetime import datetime
from utils.logger import log
from utils.output import save_output

# Optional 3rd-party APIs (add your API keys)
SHODAN_API_KEY = ""
HUNTER_API_KEY = ""
HIBP_API_KEY = ""


def get_whois(domain):
    try:
        w = whois.whois(domain)
        return dict(w)
    except Exception as e:
        log(f"[!] WHOIS failed: {e}")
        return {}

def get_ip(domain):
    try:
        ip = socket.gethostbyname(domain)
        return ip
    except Exception as e:
        log(f"[!] IP resolution failed: {e}")
        return None

def get_dns_records(domain):
    try:
        result = subprocess.check_output(["dig", domain, "ANY", "+short"]).decode().strip()
        return result.splitlines()
    except Exception as e:
        log(f"[!] DNS lookup failed: {e}")
        return []

def get_http_headers(domain):
    try:
        response = requests.get(f"http://{domain}", timeout=5)
        return dict(response.headers)
    except Exception as e:
        log(f"[!] HTTP headers fetch failed: {e}")
        return {}

def get_ip_info(ip):
    try:
        obj = IPWhois(ip)
        data = obj.lookup_rdap(depth=1)
        return {
            "asn": data.get("asn"),
            "asn_description": data.get("asn_description"),
            "network": data.get("network", {}).get("name"),
            "country": data.get("network", {}).get("country"),
        }
    except Exception as e:
        log(f"[!] IPWhois failed: {e}")
        return {}

def get_geo_location(ip):
    try:
        response = requests.get(f"http://ip-api.com/json/{ip}")
        return response.json()
    except Exception as e:
        log(f"[!] GeoIP failed: {e}")
        return {}

def scan_ports_nmap(ip):
    try:
        from tools.nmap_runner import run_nmap_scan
        return run_nmap_scan(ip, ports="1-1000", scan_type="top")
    except Exception as e:
        log(f"[!] Port scan failed: {e}")
        return {}

def enum_subdomains(domain):
    try:
        result = subprocess.check_output(["amass", "enum", "-d", domain, "-silent"]).decode().splitlines()
        return result
    except Exception as e:
        log(f"[!] Subdomain enum failed: {e}")
        return []

def search_emails(domain):
    try:
        headers = {"Authorization": f"Bearer {HUNTER_API_KEY}"}
        response = requests.get(f"https://api.hunter.io/v2/domain-search?domain={domain}", headers=headers)
        data = response.json()
        return data.get("data", {}).get("emails", [])
    except Exception as e:
        log(f"[!] Email scraping failed: {e}")
        return []

def check_leaks(domain):
    try:
        headers = {"hibp-api-key": HIBP_API_KEY}
        response = requests.get(f"https://haveibeenpwned.com/api/v3/breachedaccount/{domain}", headers=headers)
        return response.json()
    except Exception as e:
        log(f"[!] Leak check failed: {e}")
        return []

def get_shodan_data(ip):
    try:
        response = requests.get(f"https://api.shodan.io/shodan/host/{ip}?key={SHODAN_API_KEY}")
        return response.json()
    except Exception as e:
        log(f"[!] Shodan lookup failed: {e}")
        return {}

def gather_info(domain):
    log(f"[*] Starting information gathering for: {domain}")
    ip = get_ip(domain)
    whois_info = get_whois(domain)
    dns = get_dns_records(domain)
    headers = get_http_headers(domain)

    ip_info = get_ip_info(ip) if ip else {}
    geo = get_geo_location(ip) if ip else {}
    ports = scan_ports_nmap(ip) if ip else {}
    subdomains = enum_subdomains(domain)
    emails = search_emails(domain)
    leaks = check_leaks(domain)
    shodan = get_shodan_data(ip) if ip else {}

    results = {
        "domain": domain,
        "timestamp": datetime.utcnow().isoformat(),
        "ip": ip,
        "dns_records": dns,
        "http_headers": headers,
        "whois": whois_info,
        "ip_info": ip_info,
        "geolocation": geo,
        "open_ports": ports,
        "subdomains": subdomains,
        "emails": emails,
        "leaks": leaks,
        "shodan_data": shodan
    }

    return results

def save_info_output(domain, results, output_dir="outputs/info_gathering/"):
    save_output("info", domain, results, output_dir)

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python info_gathering.py <domain>")
        exit(1)
    domain = sys.argv[1]
    data = gather_info(domain)
    print(json.dumps(data, indent=2))
    save_info_output(domain, data)

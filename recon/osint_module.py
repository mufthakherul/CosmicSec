# recon/osint_module.py
from recon.whois_lookup import get_whois
from recon.ip_locator import geoip_lookup
from recon.subdomain_finder import find_subdomains
from recon.dns_enumerator import dns_enum


def full_osint(domain):
    return {
        "whois": get_whois(domain),
        "geoip": geoip_lookup(domain),
        "subdomains": find_subdomains(domain),
        "dns": dns_enum(domain)
    }

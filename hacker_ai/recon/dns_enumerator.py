# recon/dns_enumerator.py
import dns.resolver
from utils.logger import logger

def dns_enum(domain):
    records = {}
    for record_type in ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME']:
        try:
            answers = dns.resolver.resolve(domain, record_type)
            records[record_type] = [r.to_text() for r in answers]
        except Exception as e:
            logger.warning(f"[DNS] {record_type} record failed: {e}")
    return records



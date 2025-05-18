# recon/dorker.py
from utils.logger import logger
import requests

GOOGLE_DORKS = [
    'inurl:admin', 'intitle:index.of', 'inurl:login',
    'filetype:env', 'intext:password', 'ext:sql | ext:db']


def perform_dorking(domain):
    logger.info(f"[Dorker] Running dorks for domain: {domain}")
    results = []
    for dork in GOOGLE_DORKS:
        query = f"{dork} site:{domain}"
        logger.debug(f"[Dorker] Searching: {query}")
        url = f"https://www.google.com/search?q={query}"
        results.append({"query": query, "url": url})
    return results



# scanners/tech_detector.py
import requests
from utils.logger import logger

TECH_HEADERS = {
    'X-Powered-By': 'Backend Tech',
    'Server': 'Web Server',
    'X-AspNet-Version': 'ASP.NET',
    'X-Drupal-Cache': 'Drupal',
    'X-Generator': 'CMS Generator'
}

FINGERPRINTS = {
    'wordpress': ['wp-content', 'wp-includes'],
    'joomla': ['Joomla!', 'index.php?option='],
    'drupal': ['sites/all/', 'drupal']
}

def detect_tech(url):
    tech = set()
    try:
        response = requests.get(url, timeout=5)
        headers = response.headers
        body = response.text.lower()

        for h, tech_name in TECH_HEADERS.items():
            if h in headers:
                logger.info(f"[TechDetector] Found {tech_name}: {headers[h]}")
                tech.add(f"{tech_name}: {headers[h]}")

        for cms, patterns in FINGERPRINTS.items():
            for pattern in patterns:
                if pattern in body:
                    logger.info(f"[TechDetector] Detected CMS: {cms}")
                    tech.add(cms)

        return list(tech)
    except Exception as e:
        logger.error(f"[TechDetector] Error detecting tech for {url}: {e}")
        return []



"""
Nightly RAG Knowledge Base loader.
Ingests NVD CVE feeds and MITRE ATT&CK STIX data into ChromaDB.
"""

from __future__ import annotations

import importlib
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Sample MITRE ATT&CK techniques for fallback (when network unavailable)
_MITRE_FALLBACK = [
    {
        "id": "T1059",
        "name": "Command and Scripting Interpreter",
        "description": "Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.",
    },
    {
        "id": "T1078",
        "name": "Valid Accounts",
        "description": "Adversaries may obtain and abuse credentials of existing accounts as a means of gaining initial access, persistence, privilege escalation, or defense evasion.",
    },
    {
        "id": "T1190",
        "name": "Exploit Public-Facing Application",
        "description": "Adversaries may attempt to exploit a weakness in an Internet-facing host or system to initially access a network.",
    },
    {
        "id": "T1566",
        "name": "Phishing",
        "description": "Adversaries may send phishing messages to gain access to victim systems.",
    },
    {
        "id": "T1055",
        "name": "Process Injection",
        "description": "Adversaries may inject code into processes in order to evade process-based defenses as well as possibly elevate privileges.",
    },
]


async def load_nvd_cves(limit: int = 50) -> int:
    """Fetch recent CVEs from NVD API 2.0 and ingest into ChromaDB."""
    _chroma_ok = importlib.util.find_spec("chromadb") is not None
    if not _chroma_ok:
        logger.info("ChromaDB not available — skipping NVD CVE load")
        return 0

    try:
        from .vector_store import ingest_document  # type: ignore[import]

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                "https://services.nvd.nist.gov/rest/json/cves/2.0",
                params={"resultsPerPage": limit},
                headers={"User-Agent": "CosmicSec-KB-Loader/2.0"},
            )
            if resp.status_code != 200:
                logger.warning("NVD API returned %d", resp.status_code)
                return 0
            data = resp.json()
            cves = data.get("vulnerabilities", [])
    except Exception as exc:
        logger.warning("NVD CVE fetch failed: %s", exc)
        return 0

    count = 0
    for item in cves:
        cve = item.get("cve", {})
        cve_id = cve.get("id", "")
        descriptions = cve.get("descriptions", [])
        desc = next((d["value"] for d in descriptions if d.get("lang") == "en"), "")
        if cve_id and desc:
            try:
                ingest_document(cve_id, f"{cve_id}: {desc}")
                count += 1
            except Exception:
                pass

    logger.info("Loaded %d CVEs from NVD", count)
    return count


async def load_mitre_attack() -> int:
    """Fetch MITRE ATT&CK STIX data and ingest techniques into ChromaDB."""
    _chroma_ok = importlib.util.find_spec("chromadb") is not None
    if not _chroma_ok:
        logger.info("ChromaDB not available — skipping MITRE load")
        return 0

    try:
        from .vector_store import ingest_document  # type: ignore[import]
    except Exception:
        return 0

    techniques: list[dict[str, Any]] = []

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(
                "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json",
                headers={"User-Agent": "CosmicSec-KB-Loader/2.0"},
            )
            if resp.status_code == 200:
                stix = resp.json()
                for obj in stix.get("objects", []):
                    if obj.get("type") == "attack-pattern":
                        ext_refs = obj.get("external_references", [])
                        tid = next(
                            (
                                r["external_id"]
                                for r in ext_refs
                                if r.get("source_name") == "mitre-attack"
                            ),
                            "",
                        )
                        if tid:
                            techniques.append(
                                {
                                    "id": tid,
                                    "name": obj.get("name", ""),
                                    "description": obj.get("description", "")[:500],
                                }
                            )
    except Exception as exc:
        logger.warning("MITRE STIX fetch failed, using fallback: %s", exc)

    if not techniques:
        techniques = _MITRE_FALLBACK

    count = 0
    for t in techniques[:100]:
        try:
            ingest_document(f"mitre-{t['id']}", f"{t['id']} {t['name']}: {t['description']}")
            count += 1
        except Exception:
            pass

    logger.info("Loaded %d MITRE ATT&CK techniques", count)
    return count


async def load_all() -> dict[str, int]:
    """Run all KB loaders and return counts."""
    nvd_count = await load_nvd_cves()
    mitre_count = await load_mitre_attack()
    return {"nvd_cves": nvd_count, "mitre_techniques": mitre_count}


def schedule_nightly(app_instance: Any = None) -> None:
    """Schedule nightly KB refresh using APScheduler if available."""
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore[import]

        scheduler = AsyncIOScheduler()
        scheduler.add_job(load_all, "cron", hour=2, minute=0, id="nightly_kb_load")
        scheduler.start()
        logger.info("Nightly KB refresh scheduled at 02:00 UTC")
    except Exception as exc:
        logger.info("APScheduler not available — nightly KB refresh disabled: %s", exc)

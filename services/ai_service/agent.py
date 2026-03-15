from typing import List
from .rag_store import retrieve_guidance


def run_security_agent(target: str, finding_titles: List[str]) -> dict:
    joined = " ".join(finding_titles)
    retrieved = retrieve_guidance(joined)
    return {
        "target": target,
        "strategy": "RAG-assisted remediation planning",
        "actions": retrieved[:3],
    }

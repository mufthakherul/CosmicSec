from typing import Dict, List

RAG_KB: List[Dict[str, str]] = [
    {
        "topic": "missing security headers",
        "guidance": "Set CSP, X-Frame-Options, X-Content-Type-Options, and HSTS headers.",
    },
    {
        "topic": "open ports",
        "guidance": "Limit externally exposed ports; enforce allowlists and MFA-protected admin access.",
    },
]


def retrieve_guidance(text: str) -> List[str]:
    lowered = text.lower()
    hits = [entry["guidance"] for entry in RAG_KB if entry["topic"] in lowered]
    return hits or ["Follow CIS benchmarks and enforce least-privilege access controls."]

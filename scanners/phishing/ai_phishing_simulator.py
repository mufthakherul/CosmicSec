# phishing/ai_phishing_simulator.py

import random
import smtplib
import os
import json
import base64
from email.message import EmailMessage
from faker import Faker
from llm.offline_chat import get_ai_response  # AI prompt-based generator
from utils.logger import log

fake = Faker()

TEMPLATE_PATH = "phishing/templates/"
DEFAULT_FROM = "admin@support-secure.com"

# Encoders for payload mutation
def encode_payload(payload: str) -> dict:
    return {
        "raw": payload,
        "base64": base64.b64encode(payload.encode()).decode(),
        "url_encoded": ''.join('%{:02X}'.format(ord(c)) for c in payload),
        "js_escaped": payload.replace('"', '\\"').replace("'", "\\'")
    }

# Smart AI-generated email content
def generate_email_content(target, tone="corporate", intent="credential harvest"):
    prompt = f"""
    Generate a phishing email targeting a user named {target['name']} who works at {target['company']}.
    Use a {tone} tone, and the goal is {intent}.
    The email should include a convincing call-to-action and a plausible sender.
    """
    return get_ai_response(prompt)

# Send phishing simulation (SMTP or dummy)
def send_email(to_email, subject, body, sender=DEFAULT_FROM):
    log(f"Simulating phishing email to {to_email} from {sender}")
    # In production, configure SMTP here
    print(f"[!] Sending simulated phishing email:\nFrom: {sender}\nTo: {to_email}\nSubject: {subject}\n\n{body}")

# Template loader
def load_templates():
    templates = {}
    for fname in os.listdir(TEMPLATE_PATH):
        if fname.endswith(".json"):
            with open(os.path.join(TEMPLATE_PATH, fname), "r") as f:
                templates[fname] = json.load(f)
    return templates

# Phishing simulation campaign
def simulate_campaign(targets: list, method="ai", obfuscate_payloads=True):
    for target in targets:
        if method == "ai":
            content = generate_email_content(target)
        else:
            templates = load_templates()
            template = random.choice(list(templates.values()))
            content = template["body"].replace("{name}", target["name"]).replace("{company}", target["company"])

        subject = f"{fake.catch_phrase()} - Action Required"
        payload = "https://secure-login.{fake.domain_name()}/verify"
        encoded = encode_payload(payload) if obfuscate_payloads else {"raw": payload}
        content += f"\n\n[Link] {encoded['raw']}"
        
        send_email(target["email"], subject, content)

        log(f"Phishing email simulated for {target['email']} with method={method}")

# Advanced features planned
"""
Future Upgrades:
- AI + CVE awareness: build phishing around known vulns
- Auto-gen HTML landing pages for credentials
- Real-time click tracking and report logging
- LLM-based tone/style selector per target
- Adversarial testing simulation (red team-style)
- Proxy routing to anonymize phishing simulator
- Output log to phishing/logs/campaign_{timestamp}.json
"""

if __name__ == "__main__":
    sample_targets = [
        {"name": "John Doe", "email": "john@corp.com", "company": "Corp Inc"},
        {"name": "Jane Smith", "email": "jane@business.net", "company": "Business LLC"}
    ]
    simulate_campaign(sample_targets)

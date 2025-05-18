# phishing/ai_phishing_simulator.py

import random
import smtplib
import os
import json
import base64
import datetime
from email.message import EmailMessage
from faker import Faker
from llm.offline_chat import get_ai_response  # AI prompt-based generator
from utils.logger import log
from scanners.cve_scanner import get_recent_cves  # CVE integration

fake = Faker()

TEMPLATE_PATH = "phishing/templates/"
LOG_PATH = "phishing/logs/"
DEFAULT_FROM = "admin@support-secure.com"

# Encoders for payload mutation
def encode_payload(payload: str) -> dict:
    return {
        "raw": payload,
        "base64": base64.b64encode(payload.encode()).decode(),
        "url_encoded": ''.join('%{:02X}'.format(ord(c)) for c in payload),
        "js_escaped": payload.replace('"', '\\"').replace("'", "\\'")
    }

# Smart AI-generated email content with CVE awareness
def generate_email_content(target, tone="corporate", intent="credential harvest", include_cve=True):
    cve_info = ""
    if include_cve:
        cves = get_recent_cves(limit=1)
        if cves:
            cve_info = f"Mention CVE: {cves[0]['id']} - {cves[0]['summary']}"

    prompt = f"""
    Generate a phishing email targeting a user named {target['name']} who works at {target['company']}.
    Use a {tone} tone, and the goal is {intent}.
    {cve_info}
    The email should include a convincing call-to-action and a plausible sender.
    """
    return get_ai_response(prompt)

# Send phishing simulation (SMTP or dummy)
def send_email(to_email, subject, body, sender=DEFAULT_FROM):
    log(f"Simulating phishing email to {to_email} from {sender}")
    print(f"[!] Sending simulated phishing email:\nFrom: {sender}\nTo: {to_email}\nSubject: {subject}\n\n{body}")

# Template loader
def load_templates():
    templates = {}
    for fname in os.listdir(TEMPLATE_PATH):
        if fname.endswith(".json"):
            with open(os.path.join(TEMPLATE_PATH, fname), "r") as f:
                templates[fname] = json.load(f)
    return templates

# HTML landing page generator
def generate_html_landing(username):
    return f"""
    <html><body><h2>Sign In Required</h2>
    <form><input type='text' placeholder='Username' value='{username}'><br>
    <input type='password' placeholder='Password'><br>
    <button>Sign In</button></form></body></html>
    """

# Click simulation tracker
def track_click(target_email):
    log(f"[TRACKER] Simulated click by {target_email}")

# Save campaign log
def save_campaign_log(targets, method):
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(LOG_PATH, f"campaign_{ts}.json")
    with open(path, "w") as f:
        json.dump({"method": method, "targets": targets}, f, indent=2)
    log(f"Campaign log saved to {path}")

# Phishing simulation campaign
def simulate_campaign(targets: list, method="ai", obfuscate_payloads=True, simulate_click=True):
    templates = load_templates()
    all_logs = []
    for target in targets:
        if method == "ai":
            content = generate_email_content(target)
        else:
            template = random.choice(list(templates.values()))
            content = template["body"].replace("{name}", target["name"]).replace("{company}", target["company"])

        subject = f"{fake.catch_phrase()} - Action Required"
        payload = f"https://secure-login.{fake.domain_name()}/verify"
        encoded = encode_payload(payload) if obfuscate_payloads else {"raw": payload}
        content += f"\n\n[Link] {encoded['raw']}"

        if simulate_click:
            track_click(target["email"])

        send_email(target["email"], subject, content)
        html_landing = generate_html_landing(target["name"])
        log(f"Generated HTML landing page for {target['email']}:")
        print(html_landing)

        all_logs.append({"target": target, "subject": subject, "payload": encoded})

    save_campaign_log(all_logs, method)

if __name__ == "__main__":
    sample_targets = [
        {"name": "John Doe", "email": "john@corp.com", "company": "Corp Inc"},
        {"name": "Jane Smith", "email": "jane@business.net", "company": "Business LLC"}
    ]
    simulate_campaign(sample_targets)

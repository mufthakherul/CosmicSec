# tools/wpscan_launcher.py

import subprocess
import argparse
import os
import json
from utils.logger import logger
from utils.output import save_output

def run_wpscan(target, api_token=None):
    try:
        logger.info(f"[WPSCAN] Starting scan on: {target}")

        output_json = f"outputs/wpscan/json/{os.path.basename(target)}.json"
        os.makedirs(os.path.dirname(output_json), exist_ok=True)

        cmd = [
            "wpscan",
            "--url", target,
            "--format", "json",
            "--output", output_json
        ]

        if api_token:
            cmd += ["--api-token", api_token]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"[WPSCAN] Error: {result.stderr}")
            return {"error": result.stderr}

        with open(output_json, 'r') as f:
            parsed = json.load(f)

        summary = parsed.get("version", {}).get("number", "No version info")
        logger.info(f"[WPSCAN] Detected version: {summary}")

        for fmt in ["json", "txt"]:
            save_output("wpscan", os.path.basename(target), parsed, format=fmt)

        logger.info(f"[WPSCAN] Scan completed, output saved.")
        return parsed

    except Exception as e:
        logger.error(f"[WPSCAN] Exception: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WPScan Wrapper Script")
    parser.add_argument("target", help="Target WordPress URL")
    parser.add_argument("--api-token", help="WPScan API Token", default=None)

    args = parser.parse_args()
    run_wpscan(args.target, args.api_token)

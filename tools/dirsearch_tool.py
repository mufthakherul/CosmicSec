# tools/dirsearch_tool.py

import subprocess
import argparse
import os
from utils.logger import logger
from utils.output import save_output

def run_dirsearch_scan(target, extensions="php,html,txt", threads=10):
    try:
        logger.info(f"[DIRSEARCH] Starting scan on: {target}")

        output_txt = f"outputs/dirsearch/txt/{os.path.basename(target)}.txt"
        os.makedirs(os.path.dirname(output_txt), exist_ok=True)

        cmd = [
            "dirsearch",
            "-u", target,
            "-e", extensions,
            "-t", str(threads),
            "-o", output_txt,
            "--format", "plain"
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"[DIRSEARCH] Error: {result.stderr}")
            return {"error": result.stderr}

        with open(output_txt, 'r') as f:
            raw_output = f.read()

        parsed = {
            "summary": f"Directory scan on {target} completed.",
            "findings": [line for line in raw_output.splitlines() if line.strip() and not line.startswith('#')]
        }

        for fmt in ["txt", "json"]:
            save_output("dirsearch", os.path.basename(target), parsed, format=fmt)

        logger.info(f"[DIRSEARCH] Scan completed, output saved.")
        return parsed

    except Exception as e:
        logger.error(f"[DIRSEARCH] Exception: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Directory Brute-force Tool")
    parser.add_argument("target", help="Target URL")
    parser.add_argument("--ext", default="php,html,txt", help="Extensions to check")
    parser.add_argument("--threads", default=10, type=int, help="Number of threads")

    args = parser.parse_args()
    run_dirsearch_scan(args.target, args.ext, args.threads)

# tools/nikto_scanner.py

import subprocess
import argparse
import os
from utils.logger import logger
from utils.output import save_output

def run_nikto_scan(target, use_ssl=False, tuning=None):
    """
    Run a Nikto scan on the given target.

    Args:
        target (str): Target host (IP or URL)
        use_ssl (bool): Use SSL flag
        tuning (str): Tuning options for Nikto

    Returns:
        str: Raw output from Nikto
    """
    try:
        logger.info(f"[NIKTO] Starting scan on: {target}")

        cmd = ["nikto", "-host", target]

        if use_ssl:
            cmd.extend(["-ssl"])
        if tuning:
            cmd.extend(["-Tuning", tuning])

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"[NIKTO] Error: {result.stderr}")
            return {"error": result.stderr}

        # Save in both txt and json formats
        for fmt in ["txt", "json"]:
            save_output("nikto", os.path.basename(target), result.stdout, format=fmt)

        return result.stdout

    except Exception as e:
        logger.error(f"[NIKTO] Exception: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nikto Scanner Module")
    parser.add_argument("target", help="Target IP or URL")
    parser.add_argument("--ssl", action="store_true", help="Use SSL")
    parser.add_argument("--tune", help="Tuning options (e.g., 123456)")

    args = parser.parse_args()
    run_nikto_scan(args.target, args.ssl, args.tune)

# tools/nmap_runner.py

import subprocess
import argparse
from utils.logger import logger
from utils.output import save_output
import json

def run_nmap_scan(target, flags="-sV"):
    """
    Executes an Nmap scan with specified flags on the given target.

    Args:
        target (str): Target IP or domain
        flags (str): Nmap command-line flags

    Returns:
        dict: Parsed scan output (if possible)
    """
    try:
        logger.info(f"[NMAP] Running Nmap scan on {target} with flags: {flags}")
        command = f"nmap {flags} {target} -oX -"
        result = subprocess.run(command.split(), capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"[NMAP] Scan failed: {result.stderr}")
            return {"error": result.stderr}

        # Save raw XML output as TXT
        save_output("nmap", target, result.stdout, format="txt")

        # Optional: convert XML to JSON
        try:
            from xmltodict import parse as xml_parse
            parsed = xml_parse(result.stdout)
            save_output("nmap", target, parsed, format="json")
            return parsed
        except Exception as e:
            logger.warning(f"[NMAP] Could not parse XML to JSON: {e}")
            return {"raw_xml": result.stdout}

    except Exception as e:
        logger.error(f"[NMAP] Exception occurred: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nmap Scanner Module")
    parser.add_argument("target", help="Target IP or domain to scan")
    parser.add_argument("--flags", default="-sV", help="Custom Nmap flags (default: -sV)")

    args = parser.parse_args()
    run_nmap_scan(args.target, args.flags)

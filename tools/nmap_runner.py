# tools/nmap_runner.py

import subprocess
import os
import json
from utils.logger import logger

NMAP_PATH = os.getenv("NMAP_PATH", "/usr/bin/nmap")

def run_nmap_scan(target, options="-T4 -F"):
    """
    Run a basic Nmap scan with options on a target.
    """
    logger.info(f"[NMAP] Starting scan on {target} with options: {options}")
    cmd = f"{NMAP_PATH} {options} {target}"
    try:
        result = subprocess.run(cmd.split(), capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            logger.error(f"[NMAP] Error: {result.stderr.strip()}")
            return {"error": result.stderr.strip()}
        
        logger.debug(f"[NMAP] Output:\n{result.stdout}")
        return {
            "target": target,
            "options": options,
            "output": result.stdout
        }
    except subprocess.TimeoutExpired:
        logger.error("[NMAP] Scan timed out.")
        return {"error": "Scan timed out."}
    except Exception as e:
        logger.exception(f"[NMAP] Unexpected error: {str(e)}")
        return {"error": str(e)}

def save_nmap_output(target, output, format="txt"):
    """
    Save scan output in desired format: txt, json (if possible).
    """
    filename = f"results/nmap_{target.replace('.', '_')}.{format}"
    os.makedirs("results", exist_ok=True)

    try:
        with open(filename, "w") as f:
            if format == "json":
                json.dump(output, f, indent=2)
            else:
                f.write(output)
        logger.info(f"[NMAP] Output saved to {filename}")
        return filename
    except Exception as e:
        logger.error(f"[NMAP] Failed to save output: {str(e)}")
        return None

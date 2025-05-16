# tools/nmap_runner.py

import subprocess
import os
import json
import xmltodict
from utils.logger import logger

NMAP_PATH = os.getenv("NMAP_PATH", "/usr/bin/nmap")

def run_nmap_scan(target, options="-T4 -F"):
    """
    Run an Nmap scan with XML output for JSON parsing.
    """
    logger.info(f"[NMAP] Starting scan on {target} with options: {options}")
    xml_output_file = f"results/nmap_{target.replace('.', '_')}.xml"
    os.makedirs("results", exist_ok=True)

    cmd = f"{NMAP_PATH} {options} -oX {xml_output_file} {target}"
    try:
        result = subprocess.run(cmd.split(), capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            logger.error(f"[NMAP] Error: {result.stderr.strip()}")
            return {"error": result.stderr.strip()}

        with open(xml_output_file, "r") as f:
            xml_data = f.read()
            json_data = xmltodict.parse(xml_data)
            logger.debug(f"[NMAP] JSON Parsed Output:\n{json.dumps(json_data, indent=2)}")
            return {
                "target": target,
                "options": options,
                "output": json_data
            }

    except subprocess.TimeoutExpired:
        logger.error("[NMAP] Scan timed out.")
        return {"error": "Scan timed out."}
    except Exception as e:
        logger.exception(f"[NMAP] Unexpected error: {str(e)}")
        return {"error": str(e)}

def save_nmap_output(tool_name, target, data, format="json"):
    """
    Save scan output under /outputs/{tool}/{format}/ directory.
    """
    dir_path = f"outputs/{tool_name}/{format}/"
    os.makedirs(dir_path, exist_ok=True)
    filename = f"{dir_path}{target.replace('.', '_')}.{format}"

    try:
        with open(filename, "w", encoding="utf-8") as f:
            if format == "json":
                json.dump(data, f, indent=2)
            elif format in ["txt", "log"]:
                f.write(str(data))
            elif format == "csv":
                # (optional) handle if data is table
                pass
            else:
                f.write(str(data))  # fallback
        logger.info(f"[{tool_name.upper()}] Output saved to {filename}")
        return filename
    except Exception as e:
        logger.error(f"[{tool_name.upper()}] Failed to save output: {str(e)}")
        return None


# utils/output.py

import os
import json
import csv
from datetime import datetime
from utils.logger import logger

def sanitize_filename(s):
    return s.replace("http://", "").replace("https://", "").replace("/", "_").replace(":", "_")

def save_output(tool_name, target, data, format="json"):
    """
    Saves the output of a tool to file in the specified format.

    Args:
        tool_name (str): e.g., 'nmap', 'sqlmap'
        target (str): The scan target (IP/domain)
        data (dict/str): Parsed result to save
        format (str): 'json', 'txt', 'csv', 'log', etc.

    Returns:
        str: Path to saved file
    """
    try:
        sanitized_target = sanitize_filename(target)
        date_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        dir_path = f"outputs/{tool_name}/{format}/"
        os.makedirs(dir_path, exist_ok=True)

        filename = f"{dir_path}{sanitized_target}_{date_str}.{format}"

        with open(filename, "w", encoding="utf-8") as f:
            if format == "json":
                json.dump(data, f, indent=2)
            elif format in ["txt", "log"]:
                f.write(str(data))
            elif format == "csv":
                if isinstance(data, list):
                    keys = data[0].keys() if data else []
                    writer = csv.DictWriter(f, fieldnames=keys)
                    writer.writeheader()
                    writer.writerows(data)
                elif isinstance(data, dict):
                    writer = csv.writer(f)
                    for k, v in data.items():
                        writer.writerow([k, v])
                else:
                    f.write(str(data))
            else:
                f.write(str(data))

        logger.info(f"[{tool_name.upper()}] Output saved to: {filename}")
        return filename

    except Exception as e:
        logger.error(f"[{tool_name.upper()}] Failed to save output: {e}")
        return None

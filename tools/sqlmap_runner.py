# tools/sqlmap_runner.py

import subprocess
import argparse
from utils.logger import logger
from utils.output import save_output
import os

def run_sqlmap_scan(target, risk=1, level=1, dump=False, dbs=False):
    """
    Run SQLMap on a target URL or request file.

    Args:
        target (str): URL or file path for the SQLMap target
        risk (int): Risk level (1-3)
        level (int): Level of tests (1-5)
        dump (bool): Dump data flag
        dbs (bool): List DBs flag

    Returns:
        str: Output from SQLMap
    """
    try:
        logger.info(f"[SQLMAP] Starting scan on: {target}")
        command = [
            "sqlmap",
            "-u", target if target.startswith("http") else "--input-file=" + target,
            f"--risk={risk}",
            f"--level={level}",
            "--batch"
        ]

        if dump:
            command.append("--dump")
        if dbs:
            command.append("--dbs")

        result = subprocess.run(command, capture_output=True, text=True)

        if result.returncode != 0:
            logger.error(f"[SQLMAP] Error: {result.stderr}")
            return {"error": result.stderr}

        save_output("sqlmap", os.path.basename(target), result.stdout, format="txt")
        return result.stdout

    except Exception as e:
        logger.error(f"[SQLMAP] Exception: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SQLMap Scanner Module")
    parser.add_argument("target", help="Target URL or request file")
    parser.add_argument("--risk", type=int, default=1, help="Risk level (default=1)")
    parser.add_argument("--level", type=int, default=1, help="Test level (default=1)")
    parser.add_argument("--dump", action="store_true", help="Dump data if vulnerable")
    parser.add_argument("--dbs", action="store_true", help="Enumerate databases")

    args = parser.parse_args()
    run_sqlmap_scan(args.target, args.risk, args.level, args.dump, args.dbs)

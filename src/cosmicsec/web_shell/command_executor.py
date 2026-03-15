# web_shell/command_executor.py

import subprocess
import os
import platform
import socket
import getpass
import shutil
from datetime import datetime
from utils.logger import logger
from llm.offline_chat import analyze_with_ai
from utils.security import require_authentication
from utils.helpers import sanitize_output, get_system_info

COMMAND_LOG_FILE = "web_shell/logs/command_history.log"

@require_authentication
def run_command(command: str, ai_analyze: bool = False) -> dict:
    """
    Executes a system command and optionally uses AI to analyze the result.
    """
    logger.info(f"Executing command: {command}")

    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=60
        )
        stdout = sanitize_output(result.stdout.strip())
        stderr = sanitize_output(result.stderr.strip())

        log_command(command, stdout, stderr)

        analysis = ""
        if ai_analyze:
            analysis = analyze_with_ai(f"Analyze output of command: {command}\nOutput:\n{stdout}\nErrors:\n{stderr}")

        return {
            "success": result.returncode == 0,
            "stdout": stdout,
            "stderr": stderr,
            "return_code": result.returncode,
            "ai_analysis": analysis
        }

    except Exception as e:
        logger.error(f"Command execution failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def log_command(command: str, stdout: str, stderr: str):
    with open(COMMAND_LOG_FILE, "a") as log:
        log.write(f"\n{'='*50}\n")
        log.write(f"Timestamp: {datetime.utcnow().isoformat()}\n")
        log.write(f"User: {getpass.getuser()}\n")
        log.write(f"Host: {socket.gethostname()}\n")
        log.write(f"Command: {command}\n")
        log.write(f"Output:\n{stdout}\n")
        log.write(f"Errors:\n{stderr}\n")
        log.write(f"{'='*50}\n")


@require_authentication
def get_system_summary() -> dict:
    """
    Returns detailed system information.
    """
    return get_system_info()


@require_authentication
def list_directory(path: str = ".") -> dict:
    try:
        files = os.listdir(path)
        return {"success": True, "path": path, "files": files}
    except Exception as e:
        return {"success": False, "error": str(e)}


@require_authentication
def get_file(path: str) -> dict:
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        return {"success": True, "path": path, "content": content}
    except Exception as e:
        return {"success": False, "error": str(e)}


@require_authentication
def delete_file(path: str) -> dict:
    try:
        os.remove(path)
        return {"success": True, "message": f"Deleted {path}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@require_authentication
def move_file(src: str, dest: str) -> dict:
    try:
        shutil.move(src, dest)
        return {"success": True, "message": f"Moved {src} to {dest}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@require_authentication
def copy_file(src: str, dest: str) -> dict:
    try:
        shutil.copy(src, dest)
        return {"success": True, "message": f"Copied {src} to {dest}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


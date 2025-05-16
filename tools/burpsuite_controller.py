# tools/burpsuite_controller.py

import subprocess
import os
import requests
import time
from utils.logger import logger


class BurpSuiteController:
    def __init__(self, burp_path="burpsuite", headless=False, project_path=None, port=8080):
        self.burp_path = burp_path
        self.headless = headless
        self.project_path = project_path or "burp_project.burp"
        self.port = port
        self.process = None

    def start_burp(self):
        try:
            args = [self.burp_path]
            if self.headless:
                args += [
                    "--project-file", self.project_path,
                    "--collaborator-server", "off",
                    "--disable-auto-update"
                ]
            logger.info("[BURP] Launching Burp Suite...")
            self.process = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            time.sleep(5)
            logger.info("[BURP] Burp Suite started successfully.")
        except Exception as e:
            logger.error(f"[BURP] Failed to start Burp Suite: {e}")

    def stop_burp(self):
        if self.process:
            self.process.terminate()
            self.process.wait()
            logger.info("[BURP] Burp Suite terminated.")

    def test_proxy(self, url="http://example.com"):
        proxies = {
            "http": f"http://127.0.0.1:{self.port}",
            "https": f"http://127.0.0.1:{self.port}"
        }
        try:
            logger.info(f"[BURP] Testing proxy with {url}")
            r = requests.get(url, proxies=proxies, timeout=5)
            logger.info(f"[BURP] Proxy test status code: {r.status_code}")
            return True
        except Exception as e:
            logger.warning(f"[BURP] Proxy test failed: {e}")
            return False

    def export_session_logs(self, out_file="burp_logs.txt"):
        log_path = os.path.expanduser("~/burpsuite_logs.txt")
        try:
            if os.path.exists(log_path):
                with open(log_path, "r") as src, open(out_file, "w") as dst:
                    dst.write(src.read())
                logger.info(f"[BURP] Exported logs to {out_file}")
            else:
                logger.warning("[BURP] No log file found to export.")
        except Exception as e:
            logger.error(f"[BURP] Failed to export logs: {e}")


# Example usage
if __name__ == "__main__":
    controller = BurpSuiteController(headless=True)
    controller.start_burp()
    if controller.test_proxy():
        logger.info("[BURP] Ready to intercept traffic.")
    time.sleep(10)
    controller.export_session_logs()
    controller.stop_burp()

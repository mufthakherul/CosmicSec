# web_shell/interactive_console.py

import os
import subprocess
import threading
from utils.logger import logger
from utils.auth import require_authentication
from llm.offline_chat import analyze_with_ai

class InteractiveWebShell:
    def __init__(self, shell_url=None, session_id=None):
        self.shell_url = shell_url
        self.session_id = session_id
        self.command_history = []
        self.output_log = []
        self.running = True

    @require_authentication
    def start_console(self):
        logger.info("Interactive Web Shell Console Started.")
        print("[+] Type 'exit' to leave shell mode.\n")
        
        while self.running:
            try:
                command = input("shell> ").strip()
                if command.lower() in ['exit', 'quit']:
                    self.running = False
                    logger.info("Exiting Interactive Console.")
                    break

                if command:
                    self.command_history.append(command)
                    output = self.execute_command(command)
                    self.output_log.append((command, output))
                    print(output)
            except KeyboardInterrupt:
                logger.warning("Interrupted by user.")
                break

    def execute_command(self, command):
        logger.debug(f"Executing command: {command}")
        try:
            output = subprocess.check_output(command, stderr=subprocess.STDOUT, shell=True, text=True)
            return output
        except subprocess.CalledProcessError as e:
            return f"[!] Error: {e.output}"

    def get_history(self):
        return self.command_history

    def save_session_log(self, filename="session_log.txt"):
        with open(filename, "w") as f:
            for cmd, out in self.output_log:
                f.write(f"$ {cmd}\n{out}\n\n")
        logger.info(f"Session log saved to {filename}")

    def analyze_session_with_ai(self):
        session_summary = "\n".join(f"$ {cmd}\n{out}" for cmd, out in self.output_log)
        return analyze_with_ai(session_summary, mode="pentest")


def run_console():
    shell = InteractiveWebShell()
    shell_thread = threading.Thread(target=shell.start_console)
    shell_thread.start()
    shell_thread.join()


if __name__ == "__main__":
    run_console()

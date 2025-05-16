# hacker_ai/main.py

import os
import importlib
import json
import logging
from config import CONFIG
from utils.logger import setup_logger

# Optional: Voice and Web UI starter (stubs)
def start_voice_mode():
    print("[🗣️] Voice interface loading...")
    # Placeholder: actual voice command loop in voice/voice_commands.py

def start_web_ui():
    print("[🌍] Launching Web UI...")
    os.system("python3 ui/web_ui.py")  # Runs Flask interface

# 🧠 Offline AI Chat stub (llm/offline_chat.py)
def start_llm_chat():
    from llm.offline_chat import chat_with_model
    chat_with_model()

# 🔌 Load all available tools dynamically
def load_modules():
    modules = {}
    base_dirs = ["tools", "recon", "scanners", "phishing", "reporting",
                 "web_shell", "alerts", "automation", "remote_control", 
                 "social_eng", "security", "reverse_engineering", "llm", "legal"]
    
    for base in base_dirs:
        path = os.path.join(os.path.dirname(__file__), base)
        for file in os.listdir(path):
            if file.endswith(".py") and not file.startswith("__"):
                mod_name = f"{base}.{file[:-3]}"
                try:
                    mod = importlib.import_module(mod_name)
                    modules[mod_name] = mod
                except Exception as e:
                    logging.warning(f"[!] Failed to load {mod_name}: {e}")
    return modules

# 🧬 Main launcher
def main():
    setup_logger()
    print("🧠 THE ULTIMTE HACKER-AI v1.0 - A EVIL jARVIS")
    print("[MODULAR CYBER ASSISTANT WITH WORMGPT CHAT-]")
    print("==============================================")

    modules = load_modules()

    while True:
        print("\n[🧭] Select mode:")
        print("1. CLI Module Runner")
        print("2. Offline AI Chat")
        print("3. Web Dashboard")
        print("4. Voice Assistant")
        print("5. Exit")

        choice = input("> ").strip()

        if choice == "1":
            print("\n[🧰] Available modules loaded:")
            for i, m in enumerate(modules.keys()):
                print(f"{i+1}. {m}")
            idx = input("[📌] Enter module number to run or 'b' to go back: ")
            if idx.lower() == "b":
                continue
            try:
                mod_name = list(modules.keys())[int(idx) - 1]
                print(f"\n[⚙️] Running: {mod_name}")
                if hasattr(modules[mod_name], "main"):
                    modules[mod_name].main()
                else:
                    print("[!] This module doesn't have a main() function.")
            except:
                print("[!] Invalid selection.")
        
        elif choice == "2":
            start_llm_chat()

        elif choice == "3":
            start_web_ui()

        elif choice == "4":
            start_voice_mode()

        elif choice == "5":
            print("[👋] Exiting Hacker-AI.")
            break

        else:
            print("[!] Invalid choice.")

if __name__ == "__main__":
    main()

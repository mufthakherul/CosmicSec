# llm/chatbot.py
import threading
import time
from llm.model_loader import load_model
from llm.prompt_memory import store_prompt, retrieve_context
from utils.logger import logger
from voice.tts_stt_handler import speak_text

class HackerAIAssistant:
    def __init__(self, model_name="llama3", mode="auto"):
        self.model = load_model(model_name)
        self.mode = mode
        self.context = []
        self.streaming = False
        self.voice_enabled = True
        logger.info(f"[Chatbot] Model '{model_name}' initialized in mode '{mode}'")

    def set_mode(self, new_mode):
        self.mode = new_mode
        logger.info(f"[Chatbot] Mode switched to: {new_mode}")

    def toggle_voice(self, status):
        self.voice_enabled = status

    def ask(self, user, query):
        store_prompt(user, query)
        context = retrieve_context(user)
        prompt = self._format_prompt(query, context)
        logger.debug(f"[Chatbot] Prompt formatted for {user}")

        try:
            if self.streaming:
                return self._stream_response(prompt)
            else:
                response = self.model(prompt)
                self.context.append({"user": user, "query": query, "response": response})
                if self.voice_enabled:
                    threading.Thread(target=speak_text, args=(response,)).start()
                return response
        except Exception as e:
            logger.error(f"[Chatbot] Failed: {e}")
            return "[ERROR] AI failed to generate response."

    def _stream_response(self, prompt):
        full_response = ""
        try:
            for chunk in self.model.stream(prompt):
                print(chunk, end="", flush=True)
                full_response += chunk
                if self.voice_enabled:
                    speak_text(chunk)
            print()
            return full_response
        except Exception as e:
            logger.error(f"[Chatbot] Streaming failed: {e}")
            return "[ERROR] Streaming failed."

    def _format_prompt(self, query, context):
        injected_context = "\n".join(context[-5:])
        personality = {
            "red": "You are an elite red team operator. You generate payloads, simulate APTs, and exploit vulnerabilities responsibly. You specialize in evasion, lateral movement, and ethical post-exploitation.",
            "blue": "You are a seasoned blue team analyst. You write detection rules, investigate logs, correlate threats, and defend systems in real-time. You recommend SIEM, EDR, and mitigation strategies.",
            "re": "You are a reverse engineering expert. You analyze binaries, detect malware, extract IOCs, and uncover obfuscation. You disassemble with Ghidra, Binary Ninja, and IDA.",
            "student": "You are a CSE/CEH mentor AI designed to help students learn cybersecurity, ethical hacking, and penetration testing. You provide step-by-step explanations and lab scenarios.",
            "pentester": "You are an AI penetration tester. You scan networks, fingerprint hosts, identify misconfigurations, and automate attack simulations using Nmap, Burp Suite, SQLMap, etc.",
            "auto": "You are a hybrid cybersecurity specialist AI. You support all hacking fields and adjust your tone based on the query: red, blue, reverse engineering, or training."
        }.get(self.mode, "You are an advanced AI cybersecurity assistant trained in both offensive and defensive tactics.")

        return f"{personality}\n\nContext:\n{injected_context}\n\nUser: {query}\nAI:"

    def suggest_modules(self, query):
        keywords = {
            "sql": "tools/sqlmap_runner.py",
            "wordpress": "tools/wpscan_launcher.py",
            "subdomain": "recon/subdomain_finder.py",
            "reverse": "reverse_engineering/decompiler_interface.py",
            "report": "reporting/report_generator.py"
        }
        suggestions = [path for word, path in keywords.items() if word in query.lower()]
        logger.info(f"[Chatbot] Suggested modules: {suggestions}")
        return suggestions

    def bookmark_module(self, user, module):
        logger.info(f"[Chatbot] {user} bookmarked: {module}")

    def log_usage(self, user, query):
        logger.info(f"[Chatbot] Query logged from {user}: {query}")

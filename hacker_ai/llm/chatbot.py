# llm/chatbot.py
from llm.model_loader import load_model
from llm.prompt_memory import store_prompt, retrieve_context
from utils.logger import logger

class HackerAIAssistant:
    def __init__(self, model_name="llama3", mode="auto"):
        self.model = load_model(model_name)
        self.mode = mode  # auto | red | blue | re | student | pentester
        self.context = []
        logger.info(f"[Chatbot] Model '{model_name}' initialized in mode '{mode}'")

    def set_mode(self, new_mode):
        self.mode = new_mode
        logger.info(f"[Chatbot] Mode switched to: {new_mode}")

    def ask(self, user, query):
        store_prompt(user, query)
        context = retrieve_context(user)

        prompt = self._format_prompt(query, context)
        logger.debug(f"[Chatbot] Prompt formatted for {user}")

        try:
            response = self.model(prompt)
            self.context.append({"user": user, "query": query, "response": response})
            return response
        except Exception as e:
            logger.error(f"[Chatbot] Failed: {e}")
            return "[ERROR] AI failed to generate response."

    def _format_prompt(self, query, context):
        injected_context = "\n".join(context[-5:])
        personality = {
            "red": "You are an elite red team operator.",
            "blue": "You are a defensive cyber analyst.",
            "re": "You are a reverse engineer and malware analyst.",
            "student": "You are a CSE/CEH cybersecurity instructor.",
            "pentester": "You are an AI pentest companion.",
            "auto": "You are a hybrid AI expert in all domains."
        }.get(self.mode, "You are an AI cybersecurity assistant.")

        return f"{personality}\nContext:\n{injected_context}\n\nUser: {query}\nAI:"

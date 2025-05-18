import os
import signal
import json
import threading
import time
from datetime import datetime

from utils.logger import logger
from utils.async_tools import stream_response
from utils.prompt_templates import generate_prompt
from utils.voice_output import speak_text_if_enabled

from llama_cpp import Llama  # You can switch this based on backend
# Supports GGUF, GPTQ, Mistral, etc. (via config)

CONFIG_FILE = "config.py"
MEMORY_FILE = "memory.json"
LOG_FILE = "outputs/llm_conversations.md"

# === Load config for model ===
from config import (
    LLM_MODEL_PATH,
    MAX_TOKENS,
    USE_CUDA,
    LLM_MODE,
    ENABLE_TTS,
    ASSISTANT_MODE,
)

# === Global model instance (reloaded on signal) ===
model = None

def load_model():
    global model
    model = Llama(
        model_path=LLM_MODEL_PATH,
        n_ctx=4096,
        use_gpu=USE_CUDA,
        verbose=False
    )
    logger.info(f"[LLM] Model loaded from: {LLM_MODEL_PATH}")

# Signal handler for hot-reload
def reload_model_handler(signum, frame):
    logger.warning("[LLM] Hot-reloading model...")
    load_model()

signal.signal(signal.SIGHUP, reload_model_handler)

# Initial load
load_model()


# === Core Memory Handler ===
def load_memory():
    if not os.path.exists(MEMORY_FILE):
        return []
    with open(MEMORY_FILE, 'r') as f:
        return json.load(f)

def save_memory(memory):
    with open(MEMORY_FILE, 'w') as f:
        json.dump(memory, f, indent=2)

def log_conversation(prompt, response):
    timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG_FILE, 'a') as log:
        log.write(f"\n### [{timestamp} UTC] Prompt:\n```\n{prompt}\n```\n")
        log.write(f"\n### Response:\n```\n{response}\n```\n")


# === Core LLM Interface ===
def query_local_llm(prompt: str, stream=False):
    logger.debug(f"[LLM] Querying model in {ASSISTANT_MODE} mode")
    memory = load_memory()
    final_prompt = generate_prompt(prompt, memory, mode=ASSISTANT_MODE)

    if stream:
        return stream_response(model, final_prompt, MAX_TOKENS)
    else:
        response = model(final_prompt, max_tokens=MAX_TOKENS)
        output = response['choices'][0]['text'].strip()
        memory.append({"user": prompt, "ai": output})
        save_memory(memory)
        log_conversation(prompt, output)
        return output


# === Voice-compatible wrapper ===
def chat_with_model(prompt: str):
    response = query_local_llm(prompt, stream=False)
    if ENABLE_TTS:
        speak_text_if_enabled(response)
    return response


# === Helper aliases for other scripts ===
get_ai_response = chat_with_model
get_llm_response = chat_with_model
ask_ai = chat_with_model
analyze_with_ai = chat_with_model
get_ai_summary = chat_with_model


# === Threaded Execution (Non-blocking) ===
def ask_ai_threaded(prompt: str):
    thread = threading.Thread(target=chat_with_model, args=(prompt,))
    thread.start()


# === Multi-mode switch ===
def set_assistant_mode(mode: str):
    global ASSISTANT_MODE
    ASSISTANT_MODE = mode
    logger.info(f"[LLM] Assistant mode set to: {mode}")


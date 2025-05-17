import os
import signal
import threading
from pathlib import Path
from utils.logger import logger

# Optional loaders (dynamically selected)
try:
    from llama_cpp import Llama  # llama-cpp-python
except ImportError:
    Llama = None

try:
    import gpt4all
except ImportError:
    gpt4all = None

try:
    import ctransformers
except ImportError:
    ctransformers = None

# Global cache
current_model = None
model_lock = threading.Lock()

# Configurable defaults
DEFAULT_MODEL_PATH = "models/gguf/mistral-7b-instruct-v0.1.Q4_K_M.gguf"
DEFAULT_BACKEND = "llama-cpp"  # Options: llama-cpp, gpt4all, ctransformers
USE_GPU = True  # Auto fallback to CPU if fails
OFFLINE_MODE = True  # Block internet calls if set

def load_model(model_path=DEFAULT_MODEL_PATH, backend=DEFAULT_BACKEND, use_gpu=USE_GPU):
    global current_model
    with model_lock:
        if not Path(model_path).exists():
            raise FileNotFoundError(f"Model not found at: {model_path}")

        logger.info(f"[LLM Loader] Loading model: {model_path} via {backend}")
        if backend == "llama-cpp":
            if Llama is None:
                raise ImportError("llama-cpp-python is not installed")
            current_model = Llama(
                model_path=model_path,
                n_ctx=4096,
                n_threads=os.cpu_count(),
                use_mlock=True,
                n_gpu_layers=35 if use_gpu else 0
            )

        elif backend == "gpt4all":
            if gpt4all is None:
                raise ImportError("gpt4all not installed")
            current_model = gpt4all.GPT4All(model_path)

        elif backend == "ctransformers":
            if ctransformers is None:
                raise ImportError("ctransformers not installed")
            current_model = ctransformers.AutoModelForCausalLM.from_pretrained(
                model_path, model_type="llama", gpu_layers=35 if use_gpu else 0
            )

        else:
            raise ValueError(f"Unsupported backend: {backend}")

        logger.success(f"[LLM Loader] Model loaded successfully: {model_path}")

def get_model():
    if current_model is None:
        raise RuntimeError("Model not loaded yet. Use load_model() first.")
    return current_model

def reload_model(signum=None, frame=None):
    logger.info("[LLM Loader] Hot-reloading model via signal")
    load_model()

def is_model_loaded():
    return current_model is not None

# Optional: register signal for hot-reload (e.g., kill -HUP pid)
signal.signal(signal.SIGHUP, reload_model)

import os
import time
import signal
import threading
from pathlib import Path
from utils.logger import logger

# Try all backends
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

# Global state
current_model = None
model_lock = threading.Lock()
current_backend = None
model_metadata = {}
model_loaded_time = None

# Config defaults
MODEL_DIR = Path("models")
DEFAULT_MODEL = MODEL_DIR / "gguf" / "mistral-7b-instruct-v0.1.Q4_K_M.gguf"
DEFAULT_BACKEND = "auto"  # 'llama-cpp', 'ctransformers', 'gpt4all', or 'auto'
USE_GPU = True
OFFLINE_ONLY = True

# === Core Functions ===

def list_available_models():
    """Scan for available models and return details."""
    logger.info("[LLM Loader] Scanning for available models...")
    models = list(MODEL_DIR.rglob("*.gguf")) + list(MODEL_DIR.rglob("*.bin"))
    return models

def select_backend_by_model(model_path):
    """Guess backend from model extension"""
    ext = model_path.suffix
    if ext == ".gguf":
        return "llama-cpp"
    elif ext == ".bin":
        return "gpt4all"
    else:
        return DEFAULT_BACKEND

def load_model(model_path=DEFAULT_MODEL, backend=DEFAULT_BACKEND, use_gpu=USE_GPU, test_mode=False):
    global current_model, current_backend, model_metadata, model_loaded_time

    model_path = Path(model_path)
    if not model_path.exists():
        raise FileNotFoundError(f"❌ Model not found at: {model_path}")
    if OFFLINE_ONLY and "http" in str(model_path).lower():
        raise PermissionError("Blocked online model loading in offline-only mode!")

    if backend == "auto":
        backend = select_backend_by_model(model_path)

    start_time = time.time()
    logger.info(f"🔄 Loading model: {model_path.name} using backend: {backend}")

    with model_lock:
        if backend == "llama-cpp":
            if not Llama:
                raise ImportError("llama-cpp-python not available")
            current_model = Llama(
                model_path=str(model_path),
                n_ctx=4096,
                n_threads=os.cpu_count(),
                use_mlock=True,
                n_gpu_layers=35 if use_gpu else 0
            )
        elif backend == "gpt4all":
            if not gpt4all:
                raise ImportError("gpt4all not available")
            current_model = gpt4all.GPT4All(model_path=str(model_path))
        elif backend == "ctransformers":
            if not ctransformers:
                raise ImportError("ctransformers not available")
            current_model = ctransformers.AutoModelForCausalLM.from_pretrained(
                model_path=str(model_path),
                model_type="llama",
                gpu_layers=35 if use_gpu else 0
            )
        else:
            raise ValueError(f"Unsupported backend: {backend}")

        load_duration = round(time.time() - start_time, 2)
        model_loaded_time = time.strftime("%Y-%m-%d %H:%M:%S")
        current_backend = backend

        model_metadata = {
            "name": model_path.name,
            "backend": backend,
            "path": str(model_path),
            "load_time_sec": load_duration,
            "loaded_at": model_loaded_time,
            "use_gpu": use_gpu,
        }

        logger.success(f"✅ Model loaded: {model_path.name} in {load_duration}s")

        if test_mode:
            logger.info("🧪 Test mode: unloading model after test")
            current_model = None  # Free RAM

def get_model():
    if current_model is None:
        raise RuntimeError("No model is loaded. Call load_model() first.")
    return current_model

def is_model_loaded():
    return current_model is not None

def get_model_info():
    """Return info about currently loaded model."""
    if not current_model:
        return {"status": "No model loaded"}
    return {
        **model_metadata,
        "status": "Loaded",
        "backend": current_backend,
    }

def reload_model(signum=None, frame=None):
    """Reloads the current model (signal handler)."""
    logger.info("🔁 Hot-reloading current model")
    if model_metadata.get("path") and model_metadata.get("backend"):
        load_model(model_metadata["path"], model_metadata["backend"])

# Hook into signal for reload
signal.signal(signal.SIGHUP, reload_model)

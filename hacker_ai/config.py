import os
import json
import yaml
import hashlib
from dotenv import load_dotenv
from threading import Timer

# Load environment variables
load_dotenv()

# === Paths ===
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "data")
LOG_DIR = os.path.join(DATA_DIR, "logs")
CACHE_DIR = os.path.join(DATA_DIR, "cache")
CONFIG_DIR = os.path.join(ROOT_DIR, "config")
TOOLS_DIR = os.path.join(ROOT_DIR, "tools")

# === Persistent Files ===
MEMORY_FILE = os.path.join(ROOT_DIR, "ai_memory.json")
USER_PROFILE_FILE = os.path.join(ROOT_DIR, "user_profiles.json")
USAGE_STATS_FILE = os.path.join(DATA_DIR, "usage_stats.json")
BANLIST_FILE = os.path.join(DATA_DIR, "banlist.txt")

# === Logging ===
LOGBOOK_FILE = os.path.join(ROOT_DIR, "logbook.md")
ERROR_LOG_FILE = os.path.join(LOG_DIR, "error.log")

# === YAML config fallback ===
YAML_CONFIG_FILE = os.path.join(CONFIG_DIR, "settings.yaml")

# === Feature Flags ===
LIVE_CONFIG_EDIT = True
REALTIME_RELOAD = True
ENABLE_YAML = True
ENABLE_HASHING = True

# === Role Definitions ===
ROLE_PERMISSIONS = {
    "admin": {"access_all": True},
    "analyst": {"allow_modules": ["recon", "scanners", "reporting"]},
    "pentester": {"allow_modules": ["phishing", "web_shell", "tools", "reverse_engineering"]},
    "guest": {"deny_modules": ["web_shell", "social_eng", "remote_control", "security"]}
}

# === UI Behavior ===
ASCII_LOGO = True
COLOR_OUTPUT = True
USE_VISUAL_TUI = True
SHOW_DOCSTRINGS = True
SHOW_README_PREVIEWS = True

# === Launcher Enhancements ===
DEFAULT_LAUNCH_MODE = "interactive"
ENABLE_MODULE_BOOKMARKS = True
ENABLE_FUZZY_SEARCH = True
ENABLE_RUNTIME_LOGGING = True
ENABLE_ROLE_LOCKS = True
AUTO_SUGGEST_MODULES = True
TRACK_HEATMAP = True
ENABLE_PLUGIN_MANAGER = True
CHECK_AUTO_UPDATE = True

# === API Keys ===
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")

# === Defaults ===
DEFAULT_USER_ROLE = "guest"
DEFAULT_THEME = "dark"
DEFAULT_LLM_PROVIDER = "openai"

# === Runtime Cache ===
__CONFIG_HASH = None


# === Functions ===

def get_user_permissions(role):
    return ROLE_PERMISSIONS.get(role, ROLE_PERMISSIONS["guest"])

def is_module_allowed(role, module_folder):
    perms = get_user_permissions(role)
    if perms.get("access_all"):
        return True
    elif "allow_modules" in perms:
        return module_folder in perms["allow_modules"]
    elif "deny_modules" in perms:
        return module_folder not in perms["deny_modules"]
    return False

def load_user_settings(user_id):
    try:
        with open(USER_PROFILE_FILE, 'r') as f:
            users = json.load(f)
        return users.get(user_id, {})
    except Exception as e:
        print(f"[CONFIG ERROR] Failed to load user profile: {e}")
        return {}

def load_yaml_config():
    if not ENABLE_YAML or not os.path.exists(YAML_CONFIG_FILE):
        return {}
    with open(YAML_CONFIG_FILE, 'r') as f:
        try:
            return yaml.safe_load(f)
        except yaml.YAMLError as e:
            print(f"[YAML ERROR] {e}")
            return {}

def config_to_dict():
    return {
        "ascii_logo": ASCII_LOGO,
        "color_output": COLOR_OUTPUT,
        "default_theme": DEFAULT_THEME,
        "default_provider": DEFAULT_LLM_PROVIDER,
        "enable_plugin_manager": ENABLE_PLUGIN_MANAGER,
        "role_permissions": ROLE_PERMISSIONS,
    }

def get_config_hash():
    global __CONFIG_HASH
    config_str = json.dumps(config_to_dict(), sort_keys=True)
    __CONFIG_HASH = hashlib.sha256(config_str.encode()).hexdigest()
    return __CONFIG_HASH

def detect_config_change():
    global __CONFIG_HASH
    current_hash = get_config_hash()
    if __CONFIG_HASH and __CONFIG_HASH != current_hash:
        print("[⚠️ WARNING] Config file has been modified!")
    __CONFIG_HASH = current_hash
    if REALTIME_RELOAD:
        Timer(10.0, detect_config_change).start()

def save_config_to_file(path=os.path.join(CONFIG_DIR, "runtime_config.json")):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(path, 'w') as f:
        json.dump(config_to_dict(), f, indent=2)
    print("[✔] Config saved to runtime_config.json")

# === Init Runtime Check ===
if ENABLE_HASHING:
    detect_config_change()

# Create a settings object for backward compatibility
class Settings:
    def __init__(self):
        for key, value in config_to_dict().items():
            setattr(self, key, value)

settings = Settings()


# live_module_launcher.py

import os
import sys
import json
import importlib
import datetime
from pathlib import Path
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt
from rich import box
from rich.markdown import Markdown
from rich.text import Text
import traceback

console = Console()

MODULES_DIR = Path("src/cosmicsec")
USAGE_LOG = MODULES_DIR / "logbook.md"
USAGE_STATS = MODULES_DIR / "usage_stats.json"
USER_PROFILE = MODULES_DIR / "user_profiles.json"
BOOKMARKS_FILE = MODULES_DIR / "bookmarks.json"
PLUGINS_FILE = MODULES_DIR / "plugins.json"

# ────────────────────────────────────────────────────────────────────────────────
# Utility Functions
# ────────────────────────────────────────────────────────────────────────────────

def load_modules():
    modules = {}
    for category in MODULES_DIR.iterdir():
        if category.is_dir():
            for module_file in category.glob("*.py"):
                module_name = module_file.stem
                module_path = f"{category.name}.{module_name}"
                try:
                    spec = importlib.util.spec_from_file_location(module_path, module_file)
                    mod = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(mod)
                    doc = (mod.__doc__.strip().split('\n')[0] if mod.__doc__ else "No description")
                except Exception:
                    doc = "Failed to load module"
                modules[module_path] = {
                    "category": category.name,
                    "name": module_name,
                    "path": module_path,
                    "description": doc
                }
    return modules

def log_module_run(module_name):
    time = datetime.datetime.now().isoformat()
    with open(USAGE_LOG, 'a') as f:
        f.write(f"[{time}] {module_name}\n")
    stats = json.load(open(USAGE_STATS)) if USAGE_STATS.exists() else {}
    stats[module_name] = stats.get(module_name, 0) + 1
    json.dump(stats, open(USAGE_STATS, 'w'), indent=2)

def get_user_role():
    if USER_PROFILE.exists():
        profile = json.load(open(USER_PROFILE))
        return profile.get("role", "guest")
    return "guest"

def is_bookmarked(module_path):
    if not BOOKMARKS_FILE.exists(): return False
    bookmarks = json.load(open(BOOKMARKS_FILE))
    return module_path in bookmarks.get("modules", [])

def show_ascii_logo():
    logo = Text("""
██╗  ██╗ █████╗  ██████╗██╗  ██╗███████╗██████╗ 
██║  ██║██╔══██╗██╔════╝██║  ██║██╔════╝██╔══██╗
███████║███████║██║     ███████║█████╗  ██████╔╝
██╔══██║██╔══██║██║     ██╔══██║██╔══╝  ██╔══██╗
██║  ██║██║  ██║╚██████╗██║  ██║███████╗██║  ██║
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
""", style="bold green")
    console.print(logo)

def fuzzy_search(query, modules):
    return {k: v for k, v in modules.items() if query.lower() in k.lower() or query.lower() in v["description"].lower()}

def print_heatmap():
    if not USAGE_STATS.exists(): return
    stats = json.load(open(USAGE_STATS))
    top_used = sorted(stats.items(), key=lambda x: -x[1])[:10]
    table = Table(title="🔥 Most Used Modules", box=box.MINIMAL_DOUBLE_HEAD)
    table.add_column("Module")
    table.add_column("Usage Count", justify="right")
    for mod, count in top_used:
        table.add_row(mod, str(count))
    console.print(table)

# ────────────────────────────────────────────────────────────────────────────────
# Main Launcher UI
# ────────────────────────────────────────────────────────────────────────────────

def show_module_table(modules):
    table = Table(title="🚀 Available Modules", box=box.SIMPLE)
    table.add_column("#")
    table.add_column("Module Path")
    table.add_column("Description")
    role = get_user_role()
    sorted_mods = sorted(modules.items())
    for i, (path, meta) in enumerate(sorted_mods, 1):
        if meta['name'].startswith("_") and role != "admin": continue
        bookmark = "⭐ " if is_bookmarked(path) else ""
        table.add_row(str(i), bookmark + path, meta['description'])
    console.print(table)

def run_module(path):
    try:
        mod = importlib.import_module(path)
        log_module_run(path)
        if hasattr(mod, 'main'):
            mod.main()
        else:
            console.print("[red]Module has no main() function.")
    except Exception as e:
        with open("error.log", 'a') as log:
            log.write(f"[{datetime.datetime.now()}] Error in {path}:\n{traceback.format_exc()}\n")
        console.print(f"[red]Error running module:[/red] {e}")

# ────────────────────────────────────────────────────────────────────────────────
# Launcher Entry
# ────────────────────────────────────────────────────────────────────────────────

def main():
    os.system('cls' if os.name == 'nt' else 'clear')
    show_ascii_logo()
    modules = load_modules()
    print_heatmap()

    while True:
        show_module_table(modules)
        choice = Prompt.ask("\nEnter module number, name, or command (search, quit)", default="quit")
        if choice.lower() in ["q", "quit"]:
            break
        elif choice.lower().startswith("search"):
            query = choice.split(" ", 1)[-1] if ' ' in choice else Prompt.ask("Search query")
            results = fuzzy_search(query, modules)
            if not results:
                console.print("[red]No matches found.")
            else:
                show_module_table(results)
        elif choice.lower() == "help":
            console.print(Markdown("""
### Help:
- Type a module number or path to run it.
- Use `search <keyword>` to find modules.
- Use `quit` to exit.
- Top modules are starred ⭐.
            """))
        elif choice.isdigit():
            index = int(choice) - 1
            keys = list(sorted(modules))
            if 0 <= index < len(keys):
                run_module(keys[index])
        elif choice in modules:
            run_module(choice)
        else:
            console.print("[red]Invalid input.")

if __name__ == "__main__":
    main()

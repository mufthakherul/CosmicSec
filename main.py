import os
import json
import subprocess
import importlib.util
import time
from pathlib import Path
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt
from rich.markdown import Markdown
from collections import defaultdict

console = Console()

# Paths and settings
USER_PROFILES = "user_profiles.json"
LOGBOOK = "logbook.md"
USAGE_STATS = "usage_stats.json"
ASCII_LOGO = """
██╗  ██╗ █████╗  ██████╗██╗  ██╗███████╗██████╗     █████╗ ██╗
██║  ██║██╔══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗   ██╔══██╗██║
███████║███████║██║     █████╔╝ █████╗  ██████╔╝   ███████║██║
██╔══██║██╔══██║██║     ██╔═██╗ ██╔══╝  ██╔══██╗   ██╔══██║██║
██║  ██║██║  ██║╚██████╗██║  ██╗███████╗██║  ██║██╗██║  ██║██║
╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝
"""

MODULE_CATEGORIES = {
    "🛠 Tools": "tools",
    "🧠 Scanners": "scanners",
    "🔍 Recon": "recon",
    "🎣 Phishing": "phishing",
    "🌐 Web Shell": "web_shell",
    "🔬 Reverse Engineering": "reverse_engineering",
    "🤖 LLM": "llm",
    "🗣 Voice": "voice",
    "📊 Reporting": "reporting",
    "🚨 Alerts": "alerts",
    "⚙️ Automation": "automation",
    "🛰 Remote Control": "remote_control",
    "🎭 Social Engineering": "social_eng",
    "🛡 Security": "security",
    "📜 Legal": "legal",
    "📚 Learning": "learning",
    "🖥 UI": "ui"
}


def get_user_role():
    try:
        with open(USER_PROFILES) as f:
            profiles = json.load(f)
            current_user = os.getenv("USER") or "default"
            return profiles.get(current_user, {}).get("role", "guest")
    except:
        return "guest"


def list_modules(directory):
    try:
        return [f for f in os.listdir(directory) if f.endswith(".py") and not f.startswith("__")]
    except:
        return []


def read_description(path):
    try:
        with open(path) as f:
            for line in f:
                if line.strip().startswith('"""') or line.strip().startswith("''"):
                    return line.strip().strip('""').strip("''")[:100] + "..."
        return "No description found."
    except:
        return "Could not read file."


def log_usage(module_path):
    with open(LOGBOOK, "a") as f:
        f.write(f"- {datetime.now()} - Launched `{module_path}`\n")

    stats = defaultdict(int)
    if os.path.exists(USAGE_STATS):
        with open(USAGE_STATS) as f:
            stats.update(json.load(f))
    stats[module_path] += 1
    with open(USAGE_STATS, "w") as f:
        json.dump(stats, f, indent=2)


def get_suggestions():
    if not os.path.exists(USAGE_STATS):
        return []
    with open(USAGE_STATS) as f:
        stats = json.load(f)
    return sorted(stats.items(), key=lambda x: x[1], reverse=True)[:3]


def launch_module(module_path):
    log_usage(module_path)
    subprocess.run(["python3", module_path])


def display_category_menu():
    console.clear()
    console.print(Panel.fit(ASCII_LOGO, title="[bold red]HACKER_AI LAUNCHER[/bold red]"))
    console.print("\n[bold cyan]Most Used Modules:[/bold cyan]")
    for name, count in get_suggestions():
        console.print(f"[green]✔[/green] {name} ({count}x)")

    table = Table(title="Module Categories", show_lines=True)
    table.add_column("ID", justify="center")
    table.add_column("Category", justify="left")

    for i, category in enumerate(MODULE_CATEGORIES, 1):
        table.add_row(str(i), category)
    console.print(table)
    return Prompt.ask("Enter category number (or 0 to quit)", default="0")


def display_module_menu(category_name, folder):
    module_files = list_modules(folder)
    if not module_files:
        console.print("[red]No modules found in this category.[/red]")
        return

    table = Table(title=f"Modules in {category_name}", show_lines=True)
    table.add_column("ID")
    table.add_column("Filename")
    table.add_column("Description")

    for i, mod in enumerate(module_files, 1):
        desc = read_description(f"{folder}/{mod}")
        table.add_row(str(i), mod, desc)

    console.print(table)
    return Prompt.ask("Select module to launch (or 0 to go back)", default="0")


def main():
    role = get_user_role()
    while True:
        choice = display_category_menu()
        if choice == "0":
            console.print("[bold red]\nGoodbye![/bold red]")
            break

        try:
            index = int(choice) - 1
            category_name = list(MODULE_CATEGORIES.keys())[index]
            folder = MODULE_CATEGORIES[category_name]
        except:
            console.print("[red]Invalid selection.[/red]")
            continue

        module_choice = display_module_menu(category_name, folder)
        if module_choice == "0":
            continue

        try:
            mod_index = int(module_choice) - 1
            module_files = list_modules(folder)
            selected_module = module_files[mod_index]
            full_path = f"{folder}/{selected_module}"
            launch_module(full_path)
        except:
            console.print("[red]Failed to launch selected module.[/red]")


if __name__ == "__main__":
    main()

# hacker_ai/launcher.py

import os
import sys
import time
import importlib
from rich.console import Console
from rich.table import Table
from rich.prompt import Prompt
from hacker_ai.config import settings  # from config.py
from hacker_ai.utils.fuzzy_search import fuzzy_find_module  # Optional
from hacker_ai.utils.logger import log_module_run          # Optional

console = Console()

ASCII_LOGO = r"""
[bold cyan]
 ██████╗ ██████╗ ███████╗███╗   ███╗██╗ ██████╗███████╗███████╗ ██████╗
██╔════╝██╔═══██╗██╔════╝████╗ ████║██║██╔════╝██╔════╝██╔════╝██╔════╝
██║     ██║   ██║███████╗██╔████╔██║██║██║     ███████╗█████╗  ██║
██║     ██║   ██║╚════██║██║╚██╔╝██║██║██║     ╚════██║██╔══╝  ██║
╚██████╗╚██████╔╝███████║██║ ╚═╝ ██║██║╚██████╗███████║███████╗╚██████╗
 ╚═════╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝╚═╝ ╚═════╝╚══════╝╚══════╝ ╚═════╝[/bold cyan]
[bold purple]         🌌 Universal Cybersecurity Intelligence Platform 🌌[/bold purple]
[dim]                    Powered by Helix AI Engine[/dim]
"""

def main():
    os.system('clear' if os.name != 'nt' else 'cls')
    console.print(ASCII_LOGO)
    console.print("[bold cyan]Welcome to CosmicSec – GuardAxisSphere Platform[/bold cyan]")
    console.print("[dim]Your Intelligent Security Operations Hub with Helix AI[/dim]\n")

    modules_dir = os.path.join(os.path.dirname(__file__), 'modules')
    modules = [f[:-3] for f in os.listdir(modules_dir) if f.endswith('.py') and not f.startswith('_')]

    table = Table(title="Available Modules", header_style="bold magenta")
    table.add_column("ID", style="dim")
    table.add_column("Module")
    for i, mod in enumerate(modules):
        table.add_row(str(i), mod)
    console.print(table)

    while True:
        choice = Prompt.ask("\nEnter module ID or name ('exit' to quit)")
        if choice.lower() in ['exit', 'quit']:
            console.print("[bold red]Exiting...[/bold red]")
            break

        selected = fuzzy_find_module(choice, modules) if not choice.isdigit() else modules[int(choice)]
        if selected:
            console.print(f"\n[green]Launching:[/green] {selected}")
            try:
                mod = importlib.import_module(f"hacker_ai.modules.{selected}")
                if hasattr(mod, 'run'):
                    log_module_run(selected)
                    mod.run()
                else:
                    console.print("[yellow]Module has no `run()` function.[/yellow]")
            except Exception as e:
                console.print(f"[red]Error loading module:[/red] {e}")
        else:
            console.print("[red]Invalid choice or module not found.[/red]")

if __name__ == "__main__":
    main()

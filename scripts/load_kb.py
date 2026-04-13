#!/usr/bin/env python3
"""
Manual one-shot KB loader script.
Usage: python scripts/load_kb.py [--nvd] [--mitre] [--all]
"""
import argparse
import asyncio
import sys
import os

# Allow importing services from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def main() -> None:
    parser = argparse.ArgumentParser(description="CosmicSec KB Loader")
    parser.add_argument("--nvd", action="store_true", help="Load NVD CVE data")
    parser.add_argument("--mitre", action="store_true", help="Load MITRE ATT&CK data")
    parser.add_argument("--all", action="store_true", help="Load all knowledge bases")
    args = parser.parse_args()

    if not (args.nvd or args.mitre or args.all):
        print("Specify at least one option: --nvd, --mitre, or --all")
        parser.print_help()
        sys.exit(1)

    from services.ai_service.kb_loader import load_nvd_cves, load_mitre_attack, load_all

    if args.all:
        counts = await load_all()
        print(f"Loaded: {counts}")
    else:
        if args.nvd:
            n = await load_nvd_cves()
            print(f"Loaded {n} NVD CVEs")
        if args.mitre:
            n = await load_mitre_attack()
            print(f"Loaded {n} MITRE techniques")


if __name__ == "__main__":
    asyncio.run(main())

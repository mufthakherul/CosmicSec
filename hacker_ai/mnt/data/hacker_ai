import os
import json
import yaml
import csv

# Define directory structure with modules and statuses
modules = {
    "scanners": {
        "vulnerability_scanner.py": "✅",
        "port_scanner.py": "🕒"
    },
    "phishing": {
        "ai_phishing_simulator.py": "🔧",
        "credential_harvester.py": "🕒",
        "html_generator.py": "🕒",
        "phish_detection_bypass.py": "🕒",
        "phishing_payloads.py": "🕒"
    },
    "osint": {
        "osint_module.py": "🕒",
        "social_mapper.py": "🕒"
    },
    "spoofing": {
        "sms_spoofer.py": "🕒",
        "spoof_payloads.py": "🕒"
    },
    "core": {
        "api_server.py": "🕒",
        "security_layer.py": "🕒"
    }
}

# Create directory structure and placeholder files
base_dir = "/mnt/data/hacker_ai"
for folder, files in modules.items():
    dir_path = os.path.join(base_dir, folder)
    os.makedirs(dir_path, exist_ok=True)
    for file in files:
        file_path = os.path.join(dir_path, file)
        if not os.path.exists(file_path):
            with open(file_path, "w") as f:
                f.write(f"# {file}\n# Status: {modules[folder][file]}\n")

# Create roadmap.md
roadmap_path = os.path.join(base_dir, "roadmap.md")
with open(roadmap_path, "w") as f:
    f.write("# Hacker AI Development Roadmap\n\n")
    f.write("## Legend\n")
    f.write("- ✅ Completed\n")
    f.write("- 🔧 In Progress\n")
    f.write("- 🕒 Planned\n\n")
    for folder, files in modules.items():
        f.write(f"### {folder.capitalize()}\n")
        for file, status in files.items():
            f.write(f"- {status} `{file}`\n")
        f.write("\n")

# Create docs folder
docs_path = os.path.join(base_dir, "docs")
os.makedirs(docs_path, exist_ok=True)
with open(os.path.join(docs_path, "README.md"), "w") as f:
    f.write("# Documentation\n\n- User Guide\n- Developer Setup\n- API Usage\n- Architecture Diagrams\n")

# Create JSON format
json_path = os.path.join(base_dir, "structure.json")
with open(json_path, "w") as f:
    json.dump(modules, f, indent=4)

# Create YAML format
yaml_path = os.path.join(base_dir, "structure.yaml")
with open(yaml_path, "w") as f:
    yaml.dump(modules, f)

# Create tracker CSV
csv_path = os.path.join(base_dir, "tracker.csv")
with open(csv_path, "w", newline="") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(["Module", "File", "Status"])
    for folder, files in modules.items():
        for file, status in files.items():
            writer.writerow([folder, file, status])

base_dir

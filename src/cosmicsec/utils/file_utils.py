# utils/file_utils.py
import os
import json
from pathlib import Path

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def read_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

def list_files(directory, ext=None):
    return [f for f in os.listdir(directory) if (ext is None or f.endswith(ext))]

def ensure_dir(path):
    Path(path).mkdir(parents=True, exist_ok=True)



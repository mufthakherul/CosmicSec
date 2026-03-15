"""
reverse_engineering/string_extractor.py

Extracts readable strings, potential secrets, IPs, URLs, and keywords from binaries
or raw data files. Designed to support red and blue team reverse engineering efforts.
"""

import re
import os
import subprocess
from utils.logger import logger
from llm.offline_chat import get_ai_summary


def extract_strings(file_path, min_length=4):
    """Extract printable strings from binary using built-in tools or Python fallback."""
    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return []

    try:
        output = subprocess.check_output(["strings", "-n", str(min_length), file_path], text=True)
        strings = output.splitlines()
        logger.info(f"Extracted {len(strings)} strings using system 'strings'.")
        return strings
    except Exception as e:
        logger.warning(f"Falling back to Python strings extraction due to: {e}")
        with open(file_path, 'rb') as f:
            data = f.read()
        return re.findall(rb"[\x20-\x7E]{%d,}" % min_length, data)


def detect_keywords(strings):
    """Detect IPs, URLs, emails, API keys, secrets, and flags."""
    findings = {
        'ips': [],
        'urls': [],
        'emails': [],
        'api_keys': [],
        'flags': [],
        'tokens': [],
        'passwords': []
    }

    for s in strings:
        if isinstance(s, bytes):
            s = s.decode('utf-8', errors='ignore')

        if re.match(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b", s):
            findings['ips'].append(s)
        if re.match(r"https?://[\w./?=&-]+", s):
            findings['urls'].append(s)
        if re.match(r"[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}", s):
            findings['emails'].append(s)
        if re.search(r'(?i)(api[_-]?key|secret|token|auth)["\':=\s]+[A-Za-z0-9-_]+', s):
            findings['api_keys'].append(s)
        if re.search(r"CTF\{.*?\}|flag\{.*?\}", s, re.IGNORECASE):
            findings['flags'].append(s)
        if re.search(r'(?i)password["\':=\s]+\S+', s):
            findings['passwords'].append(s)

    return findings


def analyze_strings(file_path):
    logger.info(f"Analyzing strings in: {file_path}")
    strings = extract_strings(file_path)
    results = detect_keywords(strings)

    summary = get_ai_summary("\n".join(strings[:500]))
    return {
        "file": file_path,
        "summary": summary,
        "keywords": results,
        "total_strings": len(strings)
    }


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python string_extractor.py <binary_file>")
        exit(1)

    result = analyze_strings(sys.argv[1])
    print("\n--- AI Summary ---\n", result['summary'])
    print("\n--- Findings ---")
    for k, v in result['keywords'].items():
        print(f"{k}: {v}")

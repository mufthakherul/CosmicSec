import os
import re
import subprocess
import json
import tempfile
from utils.logger import logger
from llm.offline_chat import analyze_with_ai
from utils.multithreading import run_in_threads

class StringExtractor:
    def __init__(self, entropy_threshold=4.5):
        self.entropy_threshold = entropy_threshold
        self.secret_patterns = {
            "AWS Access Key": r'AKIA[0-9A-Z]{16}',
            "Private Key": r'-----BEGIN(.*?)PRIVATE KEY-----',
            "Password": r'(?i)(password|pwd|pass)\s*[:=]\s*[\'"]?[^\'"\s]+[\'"]?',
            "Token": r'([A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,})',
        }

    def calculate_entropy(self, s):
        import math
        prob = [float(s.count(c)) / len(s) for c in set(s)]
        entropy = -sum([p * math.log(p) / math.log(2.0) for p in prob])
        return entropy

    def extract_strings(self, filepath, min_length=4):
        logger.info(f"[🧵] Extracting strings from: {filepath}")
        with tempfile.NamedTemporaryFile(delete=False) as tmpfile:
            try:
                subprocess.run(['strings', '-n', str(min_length), filepath], stdout=tmpfile, stderr=subprocess.PIPE)
                tmpfile.flush()
                tmpfile.seek(0)
                strings = tmpfile.read().decode(errors="ignore").splitlines()
            finally:
                os.unlink(tmpfile.name)
        return list(set(strings))

    def detect_secrets(self, strings):
        findings = []
        for s in strings:
            entropy = self.calculate_entropy(s)
            if entropy > self.entropy_threshold:
                findings.append({"string": s, "type": "High Entropy", "score": entropy})
            for label, pattern in self.secret_patterns.items():
                if re.search(pattern, s):
                    findings.append({"string": s, "type": label, "score": entropy})
        return findings

    def classify_with_ai(self, strings):
        logger.info("[🤖] Running AI analysis on strings...")
        prompt = f"Classify and analyze the following strings from a binary for potential secrets, credentials, or indicators of compromise:\n\n{json.dumps(strings, indent=2)}"
        result = analyze_with_ai(prompt)
        return result

    def extract_and_analyze(self, filepath):
        all_strings = self.extract_strings(filepath)
        secrets = self.detect_secrets(all_strings)
        ai_summary = self.classify_with_ai(secrets)
        return {
            "extracted": all_strings,
            "secrets": secrets,
            "ai_analysis": ai_summary
        }

def batch_extract(file_list):
    extractor = StringExtractor()
    results = run_in_threads(lambda f: extractor.extract_and_analyze(f), file_list)
    return results

if __name__ == "__main__":
    test_file = "samples/binary_test_file.bin"
    if not os.path.exists(test_file):
        logger.error(f"Test file not found: {test_file}")
    else:
        extractor = StringExtractor()
        result = extractor.extract_and_analyze(test_file)
        logger.info(json.dumps(result, indent=2))

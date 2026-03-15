import os
import subprocess
import json
from utils.logger import logger
from llm.offline_chat import get_llm_response

SUPPORTED_FORMATS = [".exe", ".dll", ".apk", ".jar", ".so", ".pyc"]
DECOMPILERS = {
    ".exe": "ghidra",
    ".dll": "ghidra",
    ".apk": "jadx",
    ".jar": "cfr",
    ".so": "ghidra",
    ".pyc": "uncompyle6"
}

def detect_format(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext in SUPPORTED_FORMATS:
        return ext
    return None

def run_command(command, cwd=None):
    try:
        result = subprocess.run(command, cwd=cwd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"Command failed: {result.stderr}")
        return result.stdout
    except Exception as e:
        logger.error(f"Error running command: {str(e)}")
        return ""

def decompile_with_ghidra(file_path, output_dir):
    logger.info("Running Ghidra decompiler...")
    project_name = os.path.splitext(os.path.basename(file_path))[0]
    ghidra_path = "/opt/ghidra/support/analyzeHeadless"
    command = (
        f"{ghidra_path} {output_dir} {project_name} -import {file_path} -postScript ExtractStrings.java -deleteProject"
    )
    return run_command(command)

def decompile_with_jadx(file_path, output_dir):
    logger.info("Running JADX decompiler...")
    return run_command(f"jadx -d {output_dir} {file_path}")

def decompile_with_cfr(file_path, output_dir):
    logger.info("Running CFR Java decompiler...")
    return run_command(f"java -jar cfr.jar {file_path} --outputdir {output_dir}")

def decompile_with_uncompyle6(file_path, output_dir):
    logger.info("Running uncompyle6...")
    out_file = os.path.join(output_dir, os.path.basename(file_path) + ".py")
    return run_command(f"uncompyle6 {file_path} > {out_file}")

def decompile_file(file_path, output_dir="reverse_engineering/output"):
    os.makedirs(output_dir, exist_ok=True)
    file_type = detect_format(file_path)
    if not file_type:
        logger.error("Unsupported file format")
        return

    if file_type == ".exe" or file_type == ".dll" or file_type == ".so":
        result = decompile_with_ghidra(file_path, output_dir)
    elif file_type == ".apk":
        result = decompile_with_jadx(file_path, output_dir)
    elif file_type == ".jar":
        result = decompile_with_cfr(file_path, output_dir)
    elif file_type == ".pyc":
        result = decompile_with_uncompyle6(file_path, output_dir)
    else:
        result = "No valid decompiler found."

    logger.success("Decompilation complete.")
    return result

def ai_analyze_decompiled_code(output_dir):
    logger.info("Analyzing decompiled code using AI...")
    decompiled_content = ""
    for root, _, files in os.walk(output_dir):
        for file in files:
            path = os.path.join(root, file)
            if path.endswith((".java", ".smali", ".py", ".c", ".cpp")):
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        decompiled_content += f"\n--- {file} ---\n" + content
                except:
                    continue

    prompt = f"Analyze this reverse engineered code for vulnerabilities or malicious behavior:\n{decompiled_content[:8000]}"
    response = get_llm_response(prompt)
    logger.info("AI analysis complete.")
    return response

# Example:
# result = decompile_file("sample.apk")
# ai_report = ai_analyze_decompiled_code("reverse_engineering/output")
# print(ai_report)

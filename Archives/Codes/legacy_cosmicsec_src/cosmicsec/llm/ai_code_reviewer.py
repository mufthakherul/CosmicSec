import os
import re
import json
from datetime import datetime

from utils.logger import logger
from utils.code_utils import extract_code_blocks, summarize_code, highlight_vulnerabilities
from llm.offline_chat import analyze_with_ai, get_ai_summary, get_llm_response

CODE_REVIEW_LOG = "outputs/code_reviews.md"


def review_code(code: str, context: str = None) -> dict:
    """
    Analyze code for bugs, security issues, and suggest improvements.
    :param code: Code block to review.
    :param context: Optional context for review (e.g. project, language).
    :return: Dict with issues, suggestions, summary.
    """
    logger.info("[Code Reviewer] Reviewing code block")
    
    prompt = f"""
    You are a professional AI code reviewer. Analyze the following code for:
    1. Syntax or logic errors
    2. Security vulnerabilities
    3. Optimization improvements
    4. Code readability & style
    
    {f"Context: {context}\n" if context else ""}

    Code:
    ```
    {code}
    ```
    
    Respond with a structured analysis.
    """

    analysis = analyze_with_ai(prompt)
    summary = get_ai_summary(f"Summarize the review in 2-3 lines:\n{analysis}")

    log_code_review(code, analysis)

    return {
        "code": code,
        "review": analysis,
        "summary": summary
    }


def review_file(filepath: str, context: str = None) -> dict:
    """
    Review code from a file.
    :param filepath: Path to code file.
    :param context: Optional context for analysis.
    :return: Review report dict.
    """
    if not os.path.exists(filepath):
        logger.error(f"File not found: {filepath}")
        return {"error": "File not found"}

    with open(filepath, 'r') as f:
        code = f.read()
    return review_code(code, context)


def log_code_review(code: str, review: str):
    """Log reviewed code and its analysis."""
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    with open(CODE_REVIEW_LOG, 'a') as f:
        f.write(f"\n### [Code Review] {timestamp} UTC\n")
        f.write(f"\n```python\n{code}\n```")
        f.write(f"\n\n**AI Review:**\n\n{review}\n")


def auto_review_project(folder_path: str):
    """
    Auto-review all Python files in a folder (recursive).
    :param folder_path: Folder path to scan and review.
    """
    logger.info(f"[Code Reviewer] Auto reviewing: {folder_path}")
    results = []
    for root, _, files in os.walk(folder_path):
        for file in files:
            if file.endswith(".py"):
                full_path = os.path.join(root, file)
                logger.info(f"Reviewing {full_path}")
                result = review_file(full_path, context="Automated Review")
                results.append({"file": full_path, **result})
    return results


def extract_and_review_blocks(text: str):
    """
    Extract code blocks from text (e.g., Markdown) and review them.
    :param text: Text content with embedded code.
    :return: List of review results.
    """
    code_blocks = extract_code_blocks(text)
    results = []
    for block in code_blocks:
        results.append(review_code(block, context="Extracted Block"))
    return results


def detect_vulnerabilities(code: str) -> dict:
    """
    Highlight vulnerabilities and return a structured list.
    :param code: Code to analyze.
    :return: Dict with vulnerable lines and reasoning.
    """
    logger.info("[Code Reviewer] Detecting vulnerabilities")
    response = get_llm_response(f"Detect vulnerabilities in the following code:\n\n```python\n{code}\n```\n\nExplain each issue found.")
    return {
        "code": code,
        "vulnerabilities": highlight_vulnerabilities(code, response),
        "raw_analysis": response
    }
def review_code_with_vulnerabilities(code: str) -> dict:
    """
    Review code and highlight vulnerabilities.
    :param code: Code to analyze.
    :return: Dict with review and vulnerabilities.
    """
    logger.info("[Code Reviewer] Reviewing code with vulnerability detection")
    review = review_code(code)
    vulnerabilities = detect_vulnerabilities(code)
    
    return {
        "review": review,
        "vulnerabilities": vulnerabilities
    }
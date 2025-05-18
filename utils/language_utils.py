# utils/language_utils.py
from langdetect import detect
from langdetect.lang_detect_exception import LangDetectException


def detect_language(text):
    try:
        return detect(text)
    except LangDetectException:
        return "unknown"

def is_english(text):
    return detect_language(text) == "en"

def translate_to_english(text):
    # Placeholder for future translation module
    return text

# tools/hash_cracker.py
import hashlib
from utils.logger import logger

ALGORITHMS = ["md5", "sha1", "sha256", "sha512"]

def crack_hash(hash_to_crack, wordlist_path, algorithm="sha256"):
    logger.info(f"[HashCracker] Starting with algorithm: {algorithm}")
    try:
        with open(wordlist_path, 'r', encoding='utf-8') as wordlist:
            for word in wordlist:
                word = word.strip()
                hash_func = getattr(hashlib, algorithm)
                hashed = hash_func(word.encode()).hexdigest()
                if hashed == hash_to_crack:
                    logger.success(f"[HashCracker] Match found: {word}")
                    return word
        logger.warning("[HashCracker] No match found.")
        return None
    except Exception as e:
        logger.error(f"[HashCracker] Error: {e}")
        return None



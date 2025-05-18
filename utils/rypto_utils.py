# utils/crypto_utils.py
import hashlib
import base64
from cryptography.fernet import Fernet


def hash_string(s, algo="sha256"):
    return getattr(hashlib, algo)(s.encode()).hexdigest()

def encode_base64(data):
    return base64.b64encode(data.encode()).decode()

def decode_base64(encoded):
    return base64.b64decode(encoded.encode()).decode()

def generate_key():
    return Fernet.generate_key()

def encrypt_message(message, key):
    f = Fernet(key)
    return f.encrypt(message.encode()).decode()

def decrypt_message(token, key):
    f = Fernet(key)
    return f.decrypt(token.encode()).decode()
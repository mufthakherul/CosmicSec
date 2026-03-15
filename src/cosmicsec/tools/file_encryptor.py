# tools/file_encryptor.py
from cryptography.fernet import Fernet
from utils.logger import logger


def generate_key():
    return Fernet.generate_key()

def encrypt_file(filepath, key):
    try:
        with open(filepath, 'rb') as file:
            data = file.read()
        fernet = Fernet(key)
        encrypted = fernet.encrypt(data)
        with open(filepath + ".enc", 'wb') as enc_file:
            enc_file.write(encrypted)
        logger.info(f"[FileEncryptor] Encrypted {filepath}")
    except Exception as e:
        logger.error(f"[FileEncryptor] Error encrypting file: {e}")

def decrypt_file(filepath, key):
    try:
        with open(filepath, 'rb') as enc_file:
            encrypted = enc_file.read()
        fernet = Fernet(key)
        decrypted = fernet.decrypt(encrypted)
        output_path = filepath.replace(".enc", ".dec")
        with open(output_path, 'wb') as dec_file:
            dec_file.write(decrypted)
        logger.info(f"[FileEncryptor] Decrypted {filepath} to {output_path}")
    except Exception as e:
        logger.error(f"[FileEncryptor] Error decrypting file: {e}")

# utils/logger.py

import logging
from logging.handlers import RotatingFileHandler
import os
import datetime

def log_module_run(module_name):
    with open("logbook.md", "a") as f:
        f.write(f"- {datetime.datetime.now()} - Ran `{module_name}`\n")


LOG_FILE = "logs/cosmicsec.log"
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG").upper()

# Ensure logs directory exists
os.makedirs("logs", exist_ok=True)

def setup_logger(name="cosmicsec"):
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, LOG_LEVEL, logging.DEBUG))

    # Avoid duplicate handlers
    if logger.hasHandlers():
        logger.handlers.clear()

    # Console handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    ch_formatter = logging.Formatter("[%(levelname)s] %(message)s")
    ch.setFormatter(ch_formatter)

    # File handler
    fh = RotatingFileHandler(LOG_FILE, maxBytes=5*1024*1024, backupCount=3)
    fh.setLevel(logging.INFO)
    fh_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    fh.setFormatter(fh_formatter)

    logger.addHandler(ch)
    logger.addHandler(fh)

    return logger

logger = setup_logger()

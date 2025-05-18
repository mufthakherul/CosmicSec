# phishing/sms_spoofer.py
from utils.logger import logger
import requests

FAKE_SMS_API = "https://api.textbelt.com/text"

def send_spoof_sms(phone, message, spoof_number="+15555555555", api_key="textbelt"):
    payload = {
        "phone": phone,
        "message": f"{message}\n- From: {spoof_number}",
        "key": api_key
    }
    try:
        res = requests.post(FAKE_SMS_API, data=payload)
        response = res.json()
        if response.get("success"):
            logger.info(f"[SMSSpoofer] Spoofed SMS sent to {phone}")
        else:
            logger.warning(f"[SMSSpoofer] Failed: {response.get('error')}")
        return response
    except Exception as e:
        logger.error(f"[SMSSpoofer] Error: {e}")
        return {}



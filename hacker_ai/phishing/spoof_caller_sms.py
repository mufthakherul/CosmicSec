# phishing/spoof_caller_sms.py
from utils.logger import logger
import random
import string

def spoof_call_simulation(caller_id="+1-800-123-4567", message="This is a spoofed call."):
    simulation_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    logger.info(f"[CallSpoof] Simulating spoofed call from {caller_id} - ID: {simulation_id}")
    return {
        "caller_id": caller_id,
        "message": message,
        "simulation_id": simulation_id,
        "status": "simulated"
    }
# tools/port_finder.py
import socket
from utils.logger import logger

def scan_open_ports(ip, ports=range(1, 1025)):
    open_ports = []
    logger.info(f"[PortFinder] Scanning {ip}...")
    for port in ports:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            result = s.connect_ex((ip, port))
            if result == 0:
                logger.info(f"[PortFinder] Port {port} is open")
                open_ports.append(port)
    return open_ports

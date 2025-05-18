# utils/network_utils.py
import socket
import requests
import re


def get_ip(hostname):
    return socket.gethostbyname(hostname)

def is_port_open(host, port, timeout=2):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        return s.connect_ex((host, port)) == 0

def get_headers(url):
    try:
        return requests.head(url, timeout=5).headers
    except:
        return {}

def detect_technology_from_headers(headers):
    tech = []
    if 'x-powered-by' in headers:
        tech.append(headers['x-powered-by'])
    if 'server' in headers:
        tech.append(headers['server'])
    return tech

def extract_links(html):
    return re.findall(r'href=["\'](.*?)["\']', html)



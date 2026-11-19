"""
smtp_mailer.py – Real SMTP Email OTP Delivery for RenalWatch.

Sends medical-grade transactional verification emails via SMTP (e.g. Gmail, Outlook, AWS SES).
Supports STARTTLS (port 587) and SSL (port 465).
"""

from __future__ import annotations

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict

logger = logging.getLogger("renalwatch.smtp")


def is_valid_email(email: str) -> bool:
    """Basic email validation check."""
    return bool(email and "@" in email and "." in email.split("@")[-1])


def send_smtp_otp(recipient_email: str, otp: str, patient_name: str = "") -> Dict[str, Any]:
    """Dispatch a real OTP verification email via configured SMTP gateway.

    Returns status dict with delivery details.
    """
    email_clean = recipient_email.strip().lower()

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port_str = os.getenv("SMTP_PORT", "587").strip()
    try:
        smtp_port = int(smtp_port_str)
    except ValueError:
        smtp_port = 587

    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from = os.getenv("SMTP_FROM", "").strip() or f"RenalWatch <{smtp_user}>"

    # If SMTP is not configured
    if not smtp_user or not smtp_password:
        logger.info(f"=== [RENALWATCH DEV OTP] Email: {email_clean} | Code: {otp} ===")
        return {
            "ok": True,
            "real_email_sent": False,
            "provider": "development_sandbox",
            "email": email_clean,
            "dev_otp": otp,
            "message": "SMTP credentials not configured in .env. Use sandbox OTP code.",
        }

    # Compose Email Message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your RenalWatch Verification Code: {otp}"
    msg["From"] = smtp_from
    msg["To"] = email_clean

    display_name = f"Hello {patient_name.strip()}," if patient_name else "Hello,"

    # Plain text version
    text_content = (
        f"{display_name}\n\n"
        f"Your RenalWatch verification code is: {otp}\n\n"
        f"This code will expire in 5 minutes.\n"
        f"Do not share this OTP with anyone. RenalWatch clinical staff will never ask for your code.\n\n"
        f"— RenalWatch Dialysis Companion Team"
    )

    # Clean, responsive HTML email version
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFA; color: #1E293B; margin: 0; padding: 24px; }}
    .card {{ max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ text-align: center; margin-bottom: 24px; }}
    .logo {{ display: inline-block; background: #0F7C8A; color: #ffffff; font-weight: 800; font-size: 18px; padding: 6px 16px; border-radius: 20px; letter-spacing: 0.5px; text-decoration: none; }}
    h2 {{ font-size: 20px; font-weight: 700; color: #0F7C8A; margin: 16px 0 8px; text-align: center; }}
    p {{ font-size: 14px; line-height: 1.6; color: #475569; margin: 8px 0; }}
    .otp-box {{ background: #DDF1F3; border: 2px dashed #0F7C8A; border-radius: 12px; text-align: center; padding: 18px; margin: 24px 0; }}
    .otp-code {{ font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #08535D; font-family: 'Courier New', monospace; }}
    .timer-note {{ font-size: 12px; color: #08535D; margin-top: 6px; font-weight: 600; }}
    .footer {{ margin-top: 24px; pt: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #94A3B8; text-align: center; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">RenalWatch</div>
      <h2>Patient Portal Verification</h2>
    </div>
    <p>{display_name}</p>
    <p>Please enter the following 6-digit verification code to confirm your registration for the RenalWatch Dialysis Companion portal:</p>
    
    <div class="otp-box">
      <div class="otp-code">{otp}</div>
      <div class="timer-note">Valid for 5 minutes</div>
    </div>

    <p style="font-size: 12px; color: #64748B;">
      <strong>Security notice:</strong> Do not share this code with anyone. If you did not request this registration, please ignore this email.
    </p>

    <div class="footer">
      &copy; RenalWatch &middot; Real-time Dialysis Patient Monitoring
    </div>
  </div>
</body>
</html>"""

    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    # Attempt connection and dispatch
    try:
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, [email_clean], msg.as_string())
        server.quit()

        logger.info(f"Real SMTP OTP dispatched to {email_clean} via {smtp_host}")
        return {
            "ok": True,
            "real_email_sent": True,
            "provider": f"SMTP ({smtp_host})",
            "email": email_clean,
            "message": f"Real OTP email sent to {email_clean}! Please check your inbox (and spam folder).",
        }

    except smtplib.SMTPAuthenticationError as e:
        error_msg = str(e)
        hint = ""
        if "smtp.gmail.com" in smtp_host.lower():
            hint = (
                " Gmail requires a 16-character App Password (not your Gmail login password). "
                "Visit https://myaccount.google.com/apppasswords to generate one and set SMTP_PASSWORD in .env."
            )
        logger.error(f"SMTP Authentication Error: {error_msg}.{hint}")
        return {
            "ok": True,
            "real_email_sent": False,
            "provider": "development_sandbox",
            "email": email_clean,
            "dev_otp": otp,
            "smtp_auth_error": True,
            "message": f"SMTP Authentication failed for {smtp_user}.{hint} Use sandbox code below.",
        }

    except Exception as e:
        logger.error(f"SMTP Error during email delivery: {e}")
        return {
            "ok": True,
            "real_email_sent": False,
            "provider": "development_sandbox",
            "email": email_clean,
            "dev_otp": otp,
            "error": str(e),
            "message": f"Could not reach SMTP server ({e}). Use sandbox code below.",
        }

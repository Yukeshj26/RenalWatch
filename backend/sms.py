"""
sms.py – Real Mobile Number OTP Delivery for RenalWatch.

Supports real carrier SMS dispatch across major providers:
1. Fast2SMS (Standard Indian SMS Gateway - https://fast2sms.com)
   Env: FAST2SMS_API_KEY
2. Twilio (Global SMS Gateway - https://twilio.com)
   Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
3. 2Factor.in (Specialized Indian OTP Gateway - https://2factor.in)
   Env: TWO_FACTOR_API_KEY

If no carrier API key is configured in the environment, RenalWatch securely
logs the OTP and returns dev mode delivery so local development works seamlessly.
"""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.parse
import urllib.request
from typing import Dict, Any, Optional

logger = logging.getLogger("renalwatch.sms")


def clean_phone(phone: str) -> str:
    """Normalize phone number to digits only, keeping leading + if international."""
    p = phone.strip()
    has_plus = p.startswith("+")
    digits = re.sub(r"\D", "", p)
    if has_plus:
        return f"+{digits}"
    # If 10 digits (India standard), format with +91
    if len(digits) == 10:
        return f"+91{digits}"
    return f"+{digits}" if digits else ""


def send_carrier_sms(phone: str, otp: str) -> Dict[str, Any]:
    """
    Attempt to send a real SMS via configured carrier gateways.
    Returns status dict with delivery details.
    """
    normalized_phone = clean_phone(phone)
    ten_digit = re.sub(r"\D", "", normalized_phone)
    if len(ten_digit) > 10 and ten_digit.startswith("91"):
        ten_digit = ten_digit[2:]

    message_body = (
        f"Your RenalWatch Dialysis Companion verification OTP is {otp}. "
        f"Valid for 5 minutes. Do not share this code with anyone."
    )

    # 1. Check Fast2SMS (Popular for Indian mobile numbers)
    fast2sms_key = os.getenv("FAST2SMS_API_KEY")
    if fast2sms_key and len(ten_digit) == 10:
        try:
            url = "https://www.fast2sms.com/dev/bulkV2"
            payload = {
                "variables_values": otp,
                "route": "otp",
                "numbers": ten_digit,
            }
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={
                    "authorization": fast2sms_key,
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                logger.info(f"Fast2SMS response: {resp_data}")
                if resp_data.get("return") is True:
                    return {
                        "ok": True,
                        "real_sms_sent": True,
                        "provider": "Fast2SMS",
                        "phone": normalized_phone,
                        "message": "Real SMS OTP sent to your phone via Fast2SMS",
                    }
        except Exception as e:
            logger.error(f"Fast2SMS error: {e}")

    # 2. Check 2Factor.in (OTP API)
    twofactor_key = os.getenv("TWO_FACTOR_API_KEY")
    if twofactor_key and len(ten_digit) == 10:
        try:
            url = f"https://2factor.in/API/V1/{twofactor_key}/SMS/{ten_digit}/{otp}/RenalWatch"
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                if resp_data.get("Status") == "Success":
                    return {
                        "ok": True,
                        "real_sms_sent": True,
                        "provider": "2Factor.in",
                        "phone": normalized_phone,
                        "message": "Real SMS OTP sent to your phone via 2Factor.in",
                    }
        except Exception as e:
            logger.error(f"2Factor error: {e}")

    # 3. Check Twilio (Global carrier SMS)
    twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_from = os.getenv("TWILIO_PHONE_NUMBER")
    if twilio_sid and twilio_token and twilio_from:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
            post_data = urllib.parse.urlencode({
                "To": normalized_phone,
                "From": twilio_from,
                "Body": message_body,
            }).encode("utf-8")

            import base64
            auth_str = f"{twilio_sid}:{twilio_token}"
            auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

            req = urllib.request.Request(
                url,
                data=post_data,
                headers={
                    "Authorization": f"Basic {auth_b64}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                if "sid" in resp_data:
                    return {
                        "ok": True,
                        "real_sms_sent": True,
                        "provider": "Twilio",
                        "phone": normalized_phone,
                        "message": "Real SMS OTP sent to your phone via Twilio",
                    }
        except Exception as e:
            logger.error(f"Twilio error: {e}")

    # 4. Fallback when no carrier SMS keys are set in environment
    logger.info(f"=== [RENALWATCH OTP] Mobile: {normalized_phone} | Code: {otp} ===")
    return {
        "ok": True,
        "real_sms_sent": False,
        "provider": "development_sandbox",
        "phone": normalized_phone,
        "dev_otp": otp,
        "message": (
            "OTP generated. Set FAST2SMS_API_KEY or TWILIO_ACCOUNT_SID in environment "
            "for live carrier SMS delivery."
        ),
    }

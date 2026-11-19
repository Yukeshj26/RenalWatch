"""
api/index.py – Resilient Vercel ASGI Gateway for RenalWatch FastAPI backend.
"""

import json
import os
import sys
import traceback
from pathlib import Path

# Add root and current directory to sys.path
_CURRENT_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _CURRENT_DIR.parent
for _p in [str(_ROOT_DIR), str(_CURRENT_DIR)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

_app_instance = None
_startup_err = None

try:
    from backend.main import app as _fastapi_app
    _app_instance = _fastapi_app
except BaseException as e:
    _startup_err = traceback.format_exc()


async def app(scope, receive, send):
    """ASGI application entry point for Vercel Python runtime."""
    if _startup_err:
        if scope["type"] == "http":
            body = json.dumps({
                "status": "startup_error",
                "error": _startup_err,
                "sys_path": sys.path,
                "cwd": os.getcwd(),
                "files_in_root": os.listdir(".") if os.path.exists(".") else [],
            }).encode("utf-8")
            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": [
                    [b"content-type", b"application/json"],
                    [b"access-control-allow-origin", b"*"],
                ],
            })
            await send({"type": "http.response.body", "body": body})
        return

    # Forward to FastAPI with full error interception
    try:
        await _app_instance(scope, receive, send)
    except BaseException as req_err:
        req_trace = traceback.format_exc()
        if scope["type"] == "http":
            body = json.dumps({
                "status": "request_error",
                "error": str(req_err),
                "traceback": req_trace,
            }).encode("utf-8")
            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": [
                    [b"content-type", b"application/json"],
                    [b"access-control-allow-origin", b"*"],
                ],
            })
            await send({"type": "http.response.body", "body": body})

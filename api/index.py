"""
api/index.py – Vercel Serverless Function entry point for RenalWatch FastAPI backend.
"""

import json
import os
import sys
import traceback
from pathlib import Path

# Add all candidate paths to sys.path so 'backend' is always importable
_CURRENT_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _CURRENT_DIR.parent
_CWD = Path.cwd()

for _p in [str(_ROOT_DIR), str(_CURRENT_DIR), str(_CWD)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

_init_error = None
try:
    from backend.main import app
except BaseException as _err:
    _init_error = traceback.format_exc()
    try:
        from fastapi import FastAPI
        from fastapi.responses import JSONResponse
        from fastapi.middleware.cors import CORSMiddleware

        app = FastAPI(title="RenalWatch Diagnostic Gateway")
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
        def catch_import_error(path: str):
            return JSONResponse(
                status_code=200,
                content={
                    "status": "startup_import_error",
                    "error": str(_err),
                    "traceback": _init_error,
                    "cwd": str(Path.cwd()),
                    "sys_path": sys.path,
                },
            )
    except BaseException:
        # Zero-dependency WSGI fallback callable
        def app(environ, start_response):
            body = json.dumps({
                "status": "critical_import_failure",
                "error": str(_err),
                "traceback": _init_error,
            }).encode("utf-8")
            start_response("200 OK", [
                ("Content-Type", "application/json"),
                ("Access-Control-Allow-Origin", "*"),
            ])
            return [body]
else:
    # Expose health & ping diagnostics directly on app
    @app.get("/api/ping")
    def ping():
        return {
            "status": "healthy",
            "service": "RenalWatch Vercel Serverless",
            "cwd": str(Path.cwd()),
            "root_exists": _ROOT_DIR.exists(),
        }

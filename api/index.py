"""
api/index.py – Vercel Serverless Function entry point for RenalWatch FastAPI backend.
"""

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

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Initialize the main app
try:
    from backend.main import app
except Exception as _import_err:
    _init_error = traceback.format_exc()
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
                "error": str(_import_err),
                "traceback": _init_error,
                "cwd": str(Path.cwd()),
                "sys_path": sys.path,
                "dir_contents": os.listdir(".") if Path(".").exists() else [],
            },
        )
else:
    # App imported successfully - add diagnostic ping route directly
    @app.get("/api/ping")
    def ping():
        return {
            "status": "healthy",
            "service": "RenalWatch Vercel Serverless",
            "cwd": str(Path.cwd()),
            "root_exists": _ROOT_DIR.exists(),
        }

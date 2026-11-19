"""
api/index.py – Vercel Serverless Function entry point for RenalWatch FastAPI backend.
"""

import os
import sys
import traceback
from pathlib import Path

# Add all candidate paths to sys.path so 'backend' package is always resolvable
_CURRENT_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _CURRENT_DIR.parent
_CWD = Path.cwd()

for _p in [str(_ROOT_DIR), str(_CURRENT_DIR), str(_CWD)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from backend.main import app
    from backend import db, risk
    # Eagerly initialize DB and model in serverless environment
    db.init()
    risk.train_model()
except Exception as _e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    app = FastAPI(title="RenalWatch Fallback Diagnostic")
    _err_tb = traceback.format_exc()

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    def serverless_diagnostic_handler(full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Serverless Startup Failure",
                "exception": str(_e),
                "traceback": _err_tb,
                "sys_path": sys.path,
                "cwd": str(Path.cwd()),
            },
        )

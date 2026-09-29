"""
Synthara — Synthetic Data Platform
FastAPI application entrypoint.

Startup checklist:
  pip install -r requirements.txt
  uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import os
import time
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.routers import generate, export, infer, validate, metadata, ai

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("synthara")


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown hooks)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Synthara backend starting up…")
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if gemini_key:
        logger.info("AI features: ENABLED (Gemini)")
    else:
        logger.warning("AI features: DISABLED (set GEMINI_API_KEY to enable)")
    yield
    logger.info("Synthara backend shutting down.")


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Synthara — Synthetic Data Platform",
    description=(
        "Generate realistic, privacy-safe tabular, relational, and document "
        "data on demand. AI-powered schema generation via Gemini."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server and production origin
# ---------------------------------------------------------------------------

_allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173")
_allowed_origins = [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request timing middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Process-Time-Ms"] = str(elapsed)
    return response


# ---------------------------------------------------------------------------
# Global exception handlers — always return the standard error envelope
# ---------------------------------------------------------------------------

def _error_response(code: str, message: str, details: Any = None, status_code: int = 500) -> JSONResponse:
    body: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


@app.exception_handler(ValidationError)
async def pydantic_validation_handler(request: Request, exc: ValidationError):
    return _error_response(
        code="VALIDATION_ERROR",
        message="Request body failed validation.",
        details=exc.errors(),
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return _error_response(
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred. Check server logs.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


# ---------------------------------------------------------------------------
# Health check — must respond in < 50 ms, no dependencies
# ---------------------------------------------------------------------------

@app.get(
    "/api/health",
    tags=["Meta"],
    summary="Health check",
    response_description="Always returns { status: 'ok' }",
)
def health() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Mount routers
# ---------------------------------------------------------------------------

API_PREFIX = "/api"

app.include_router(metadata.router,  prefix=API_PREFIX, tags=["Meta"])
app.include_router(generate.router,  prefix=API_PREFIX, tags=["Generate"])
app.include_router(export.router,    prefix=API_PREFIX, tags=["Export"])
app.include_router(infer.router,     prefix=API_PREFIX, tags=["Schema Inference"])
app.include_router(validate.router,  prefix=API_PREFIX, tags=["Validation"])
app.include_router(ai.router,        prefix=API_PREFIX, tags=["AI"])


# ---------------------------------------------------------------------------
# Root redirect to docs
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

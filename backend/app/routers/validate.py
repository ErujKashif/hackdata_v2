"""
POST /api/validate — run the validation suite against a GenerateRequest.
Returns a list of named checks with pass/warn/fail status.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.engine.validation import run_validation
from app.models.schemas import GenerateRequest, ValidationResponse

router = APIRouter()


@router.post(
    "/validate",
    response_model=ValidationResponse,
    summary="Validate a generation configuration",
    description=(
        "Runs a suite of statistical checks on the given configuration: "
        "seed determinism, null rates, row count, column presence, "
        "numeric range bounds, category integrity, and UUID uniqueness."
    ),
)
def validate_endpoint(req: GenerateRequest) -> ValidationResponse:
    try:
        return run_validation(req)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "VALIDATION_ERROR", "message": str(exc)},
        ) from exc

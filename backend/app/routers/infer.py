"""
POST /api/infer-schema — upload a CSV and get back a ColumnSpec array.
Multipart form upload, max 5 MB, runs entirely locally.
"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.engine.inference import infer_schema_from_csv, MAX_FILE_BYTES
from app.models.schemas import InferSchemaResponse

router = APIRouter()

_ACCEPTED_CONTENT_TYPES = {"text/csv", "application/csv", "application/octet-stream", "text/plain"}


@router.post(
    "/infer-schema",
    response_model=InferSchemaResponse,
    summary="Infer schema from a CSV file",
    description=(
        "Upload a CSV (max 5 MB). Returns inferred column types, null rates, "
        "sample values, and PII warnings. Runs entirely locally — no data "
        "leaves the machine."
    ),
)
async def infer_schema(
    file: UploadFile = File(..., description="CSV file to analyse (max 5 MB)"),
) -> InferSchemaResponse:
    # Content-type guard (browsers may send application/octet-stream)
    ct = (file.content_type or "").split(";")[0].strip().lower()
    if ct and ct not in _ACCEPTED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "code": "WRONG_CONTENT_TYPE",
                "message": f"Expected a CSV file, got '{ct}'.",
            },
        )

    content = await file.read()

    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"File exceeds the 5 MB limit ({len(content):,} bytes received).",
            },
        )

    if not content.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "EMPTY_FILE", "message": "Uploaded file is empty."},
        )

    try:
        result = infer_schema_from_csv(content)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INFERENCE_ERROR", "message": str(exc)},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "Schema inference failed."},
        ) from exc

    return result

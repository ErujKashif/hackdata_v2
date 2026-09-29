"""
POST /api/export/tabular — CSV or JSON file download.
Generates the full row_count (not preview-limited) and streams it
as a file attachment.
"""

from __future__ import annotations

import csv
import io
import json

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.engine.tabular import generate_tabular
from app.models.schemas import ExportFormat, GenerateRequest

router = APIRouter(prefix="/export")


@router.post(
    "/tabular",
    summary="Export full synthetic dataset",
    description=(
        "Generates the full `row_count` and returns it as a file download. "
        "Use `format=csv` or `format=json`."
    ),
    responses={
        200: {
            "content": {
                "text/csv": {},
                "application/json": {},
            },
            "description": "File download",
        }
    },
)
def export_tabular(
    req: GenerateRequest,
    format: ExportFormat = Query(default=ExportFormat.csv, description="csv or json"),
) -> StreamingResponse:
    try:
        result = generate_tabular(req, limit=None)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "EXPORT_ERROR", "message": str(exc)},
        ) from exc

    rows = result["rows"]
    filename_base = f"synthara_export_seed{req.seed}"

    if format == ExportFormat.csv:
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "EMPTY_EXPORT", "message": "No rows were generated."},
            )
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        buffer.seek(0)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename_base}.csv"'
            },
        )

    # JSON
    json_bytes = json.dumps(rows, indent=2, default=str).encode("utf-8")
    return StreamingResponse(
        iter([json_bytes]),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename_base}.json"'
        },
    )

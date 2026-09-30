"""
POST /api/ai/schema-from-prompt
Natural Language → Column Schema using Google Gemini (google-genai SDK).
Requires GEMINI_API_KEY in environment. Gracefully disabled if key is absent.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

logger = logging.getLogger("synthara.ai")
router = APIRouter()

# ---------------------------------------------------------------------------
# Valid column types (must match backend ColumnType enum)
# ---------------------------------------------------------------------------
VALID_TYPES = {
    "integer", "int", "float", "string", "boolean", "date", "datetime",
    "category", "name", "email", "phone", "address", "city", "company",
    "uuid", "currency", "cnic", "iban", "country",
}

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SchemaFromPromptRequest(BaseModel):
    prompt: str
    locale: str = "pk_PK"


class AIColumnSpec(BaseModel):
    name: str
    type: str
    nullable: bool = False
    null_rate: float = 0.0
    masking: str = "none"
    params: dict[str, Any] = {}
    reason: str = ""   # short AI explanation (stripped before sending to generate)


class SchemaFromPromptResponse(BaseModel):
    columns: list[AIColumnSpec]
    suggested_row_count: int
    summary: str


# ---------------------------------------------------------------------------
# System prompt for Gemini
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are a synthetic data schema designer.
The user will describe a database table in plain English.
You must return ONLY valid JSON — no markdown, no explanation outside the JSON.

Output format:
{
  "columns": [
    {
      "name": "snake_case_field_name",
      "type": "<one of the allowed types>",
      "nullable": false,
      "null_rate": 0.0,
      "masking": "none",
      "params": {},
      "reason": "one sentence why you chose this type"
    }
  ],
  "suggested_row_count": 1000,
  "summary": "one sentence describing the table"
}

Allowed types (use EXACTLY these strings):
uuid, integer, int, float, string, boolean, date, datetime, category,
name, email, phone, address, city, company, currency, cnic, iban, country

Rules:
- name → use for full person names
- cnic → Pakistani national ID (13-digit format)
- iban → bank account number
- currency → monetary amounts (set params.min and params.max if obvious)
- category → enum-like fields (set params.categories as array of strings)
- date / datetime → temporal fields (optionally set params.date_start, params.date_end as YYYY-MM-DD)
- integer / float → numeric ranges (set params.min and params.max when obvious)
- uuid → primary keys / IDs
- Use null_rate 0.05–0.15 for optional real-world fields
- Keep column names lowercase, snake_case, no spaces
- Generate between 4 and 20 columns, as appropriate
- suggested_row_count: 100–10000, realistic for the table type
"""


def _build_user_message(prompt: str, locale: str) -> str:
    return f"Locale context: {locale}\nUser description: {prompt}"


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/ai/schema-from-prompt",
    response_model=SchemaFromPromptResponse,
    summary="Generate schema from natural language (Gemini AI)",
    description=(
        "Describe your table in plain English and get back a fully typed "
        "ColumnSpec array powered by Google Gemini. "
        "Requires GEMINI_API_KEY environment variable."
    ),
)
async def schema_from_prompt(body: SchemaFromPromptRequest) -> SchemaFromPromptResponse:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AI_NOT_CONFIGURED",
                "message": (
                    "AI features are disabled. Set GEMINI_API_KEY in your "
                    "environment to enable natural-language schema generation. "
                    "Get a free key at https://aistudio.google.com/"
                ),
            },
        )

    if not body.prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "EMPTY_PROMPT", "message": "Prompt cannot be empty."},
        )

    try:
        from google import genai  # type: ignore
        from google.genai import types as genai_types  # type: ignore
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "MISSING_DEPENDENCY",
                "message": "google-genai package not installed. Run: pip install google-genai",
            },
        )

    try:
        client = genai.Client(api_key=api_key)
        user_msg = _build_user_message(body.prompt, body.locale)

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=user_msg,
            config=genai_types.GenerateContentConfig(
                system_instruction=_SYSTEM_PROMPT,
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )

        raw_text = response.text.strip()

        # Strip markdown code fences if model wraps with ```json ... ```
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
        raw_text = re.sub(r"\s*```$", "", raw_text, flags=re.MULTILINE)
        raw_text = raw_text.strip()

        data = json.loads(raw_text)

    except json.JSONDecodeError as exc:
        logger.error("Gemini returned non-JSON: %s", raw_text[:300])
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "AI_PARSE_ERROR", "message": f"AI returned invalid JSON: {exc}"},
        ) from exc
    except Exception as exc:
        logger.exception("Gemini API error")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "AI_ERROR", "message": str(exc)},
        ) from exc

    # Validate and sanitize columns
    sanitized: list[AIColumnSpec] = []
    for col in data.get("columns", []):
        col_type = str(col.get("type", "string")).lower()
        if col_type not in VALID_TYPES:
            col_type = "string"
        sanitized.append(AIColumnSpec(
            name=str(col.get("name", "column")).lower().replace(" ", "_"),
            type=col_type,
            nullable=bool(col.get("nullable", False)),
            null_rate=float(col.get("null_rate", 0.0)),
            masking=str(col.get("masking", "none")),
            params=col.get("params", {}),
            reason=str(col.get("reason", "")),
        ))

    return SchemaFromPromptResponse(
        columns=sanitized,
        suggested_row_count=int(data.get("suggested_row_count", 1000)),
        summary=str(data.get("summary", "")),
    )

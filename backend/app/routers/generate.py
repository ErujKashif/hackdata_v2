"""
POST /api/generate/tabular    — preview (limit param caps rows returned)
POST /api/generate/invoice    — invoice document generation
POST /api/generate/relational — multi-table relational dataset
POST /api/generate/bank-statement — bank statement HTML document
"""

from __future__ import annotations

from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel, Field

from app.engine.tabular import generate_tabular
from app.engine.invoice import generate_invoice
from app.engine.relational import generate_relational, RELATIONAL_SCHEMAS
from app.engine.bank_statement import generate_bank_statement
from app.models.schemas import (
    GenerateRequest,
    GenerateResponse,
    InvoiceRequest,
    InvoiceResponse,
)

router = APIRouter(prefix="/generate")


@router.post(
    "/tabular",
    response_model=GenerateResponse,
    summary="Generate tabular synthetic data",
    description=(
        "Returns up to `limit` rows from the synthetic dataset. "
        "The `total_rows` field always reflects the full `row_count`. "
        "Use the same seed to get stable previews while configuring."
    ),
)
def generate_tabular_endpoint(
    req: GenerateRequest,
    limit: int = Query(default=20, ge=1, le=1000, description="Max rows to return"),
) -> GenerateResponse:
    try:
        result = generate_tabular(req, limit=limit)
        return GenerateResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "GENERATION_ERROR", "message": str(exc)},
        ) from exc


@router.post(
    "/invoice",
    response_model=InvoiceResponse,
    summary="Generate a synthetic invoice document",
    description=(
        "Generates a realistic invoice with reconciling totals. "
        "Returns both structured data and a rendered HTML document."
    ),
)
def generate_invoice_endpoint(req: InvoiceRequest) -> InvoiceResponse:
    try:
        return generate_invoice(req)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVOICE_ERROR", "message": str(exc)},
        ) from exc


# ── Relational ────────────────────────────────────────────────────────────────

class RelationalRequest(BaseModel):
    schema_id: str = Field(..., description="ecommerce | hr | banking")
    row_count: int = Field(default=20, ge=2, le=500)
    seed: int = Field(default=42)
    locale: str = Field(default="pk_PK")


@router.get(
    "/relational/schemas",
    summary="List available relational schemas",
)
def list_relational_schemas():
    return {"schemas": [
        {"id": k, **v}
        for k, v in RELATIONAL_SCHEMAS.items()
    ]}


@router.post(
    "/relational",
    summary="Generate a multi-table relational dataset",
    description=(
        "Generates 2-3 linked tables with FK integrity maintained. "
        "Totals reconcile across parent/child tables. "
        "schema_id: ecommerce | hr | banking"
    ),
)
def generate_relational_endpoint(req: RelationalRequest):
    try:
        return generate_relational(req.schema_id, req.row_count, req.seed, req.locale)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_SCHEMA", "message": str(exc)},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "RELATIONAL_ERROR", "message": str(exc)},
        ) from exc


# ── Bank Statement ────────────────────────────────────────────────────────────

class BankStatementRequest(BaseModel):
    account_holder: str = Field(default="")
    account_number: str = Field(default="")
    bank_name: str = Field(default="HBL – Habib Bank Limited")
    num_transactions: int = Field(default=20, ge=5, le=100)
    opening_balance: float = Field(default=50000.0)
    currency: str = Field(default="PKR")
    month: int = Field(default=9, ge=1, le=12)
    year: int = Field(default=2025, ge=2020, le=2030)
    locale: str = Field(default="pk_PK")
    seed: int = Field(default=42)


@router.post(
    "/bank-statement",
    summary="Generate a synthetic bank statement",
    description="Returns a rendered HTML bank statement with running balance and realistic transactions.",
)
def generate_bank_statement_endpoint(req: BankStatementRequest):
    try:
        return generate_bank_statement(
            account_holder=req.account_holder,
            account_number=req.account_number,
            bank_name=req.bank_name,
            num_transactions=req.num_transactions,
            opening_balance=req.opening_balance,
            currency=req.currency,
            month=req.month,
            year=req.year,
            locale=req.locale,
            seed=req.seed,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "BANK_STMT_ERROR", "message": str(exc)},
        ) from exc

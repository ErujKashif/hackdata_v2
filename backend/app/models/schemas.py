"""
Pydantic v2 schemas — single source of truth for all request/response shapes.
Every router imports from here. Never define models inline in routers.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ColumnType(str, Enum):
    integer = "integer"
    int_alias = "int"
    float_ = "float"
    string = "string"
    boolean = "boolean"
    date = "date"
    datetime = "datetime"
    category = "category"
    name = "name"
    email = "email"
    phone = "phone"
    address = "address"
    city = "city"
    company = "company"
    uuid = "uuid"
    currency = "currency"
    cnic = "cnic"
    iban = "iban"
    country = "country"


class MaskingType(str, Enum):
    none = "none"
    mask = "mask"
    hash = "hash"


class Distribution(str, Enum):
    uniform = "uniform"
    normal = "normal"


class ExportFormat(str, Enum):
    csv = "csv"
    json = "json"


# ---------------------------------------------------------------------------
# Column specification
# ---------------------------------------------------------------------------

class ColumnParams(BaseModel):
    """Optional parameters that refine generation for a given column type."""
    model_config = {"extra": "allow"}
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    std: Optional[float] = None
    distribution: Optional[Distribution] = Distribution.uniform
    categories: Optional[list[str]] = None
    weights: Optional[list[float]] = None
    date_start: Optional[str] = None   # ISO format: YYYY-MM-DD
    date_end: Optional[str] = None
    format: Optional[str] = None       # strftime format string

    @field_validator("weights")
    @classmethod
    def weights_must_sum_to_one(cls, v: Optional[list[float]]) -> Optional[list[float]]:
        if v is not None and abs(sum(v) - 1.0) > 1e-6:
            raise ValueError("weights must sum to 1.0")
        return v


class ColumnSpec(BaseModel):
    model_config = {"extra": "allow"}
    name: str = Field(..., min_length=1, max_length=128)
    type: ColumnType
    nullable: bool = False
    null_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    masking: MaskingType = MaskingType.none
    params: ColumnParams = Field(default_factory=ColumnParams)

    @model_validator(mode="after")
    def null_rate_requires_nullable(self) -> "ColumnSpec":
        if self.null_rate > 0 and not self.nullable:
            # Auto-enable nullable when null_rate > 0
            self.nullable = True
        return self


# ---------------------------------------------------------------------------
# Generate request / response
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    model_config = {"extra": "allow"}
    columns: list[ColumnSpec] = Field(..., min_length=1, max_length=100)
    row_count: int = Field(default=100, ge=1, le=100_000)
    locale: str = Field(default="pk_PK")
    seed: int = Field(default=42)
    edge_cases: bool = Field(default=False)

    @field_validator("edge_cases", mode="before")
    @classmethod
    def parse_edge_cases(cls, v: Any) -> bool:
        if isinstance(v, dict):
            return bool(v.get("enabled", False))
        return bool(v)

    @field_validator("locale")
    @classmethod
    def locale_must_be_known(cls, v: str) -> str:
        allowed = {
            "pk_PK", "en_US", "en_GB", "de_DE", "fr_FR",
            "ar_SA", "zh_CN", "ja_JP", "es_ES", "pt_BR",
        }
        if v not in allowed:
            raise ValueError(f"Unsupported locale '{v}'. Supported: {sorted(allowed)}")
        return v


class GenerateResponse(BaseModel):
    rows: list[dict[str, Any]]
    columns: list[str] = Field(default_factory=list)
    returned_rows: int
    total_rows: int
    seed: int
    locale: str


# ---------------------------------------------------------------------------
# Schema inference
# ---------------------------------------------------------------------------

class InferredColumn(BaseModel):
    name: str
    type: ColumnType
    nullable: bool
    null_rate: float
    masking: MaskingType = MaskingType.none
    params: ColumnParams = Field(default_factory=ColumnParams)
    sample_values: list[str]
    pii: Optional[str] = None   # e.g. "email", "phone", "name"


class InferSchemaResponse(BaseModel):
    columns: list[InferredColumn]
    sampled_rows: int
    warnings: list[str]


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class CheckStatus(str, Enum):
    pass_ = "pass"
    warn = "warn"
    fail = "fail"


class ValidationCheck(BaseModel):
    model_config = {"extra": "allow"}
    name: str
    status: CheckStatus
    expected: Any
    actual: Any
    check: Optional[str] = None
    detail: Optional[str] = None

    @model_validator(mode="after")
    def sync_aliases(self) -> "ValidationCheck":
        if not self.check:
            self.check = self.name
        if not self.detail:
            self.detail = f"Expected: {self.expected} | Actual: {self.actual}"
        return self


class ValidationResponse(BaseModel):
    model_config = {"extra": "allow"}
    checks: list[ValidationCheck]
    overall_status: CheckStatus = CheckStatus.pass_
    total_checks: int = 0
    passed_checks: int = 0
    warned_checks: int = 0
    failed_checks: int = 0
    summary: str = ""

    @model_validator(mode="after")
    def compute_summary(self) -> "ValidationResponse":
        self.total_checks = len(self.checks)
        self.passed_checks = sum(1 for c in self.checks if c.status == CheckStatus.pass_)
        self.warned_checks = sum(1 for c in self.checks if c.status == CheckStatus.warn)
        self.failed_checks = sum(1 for c in self.checks if c.status == CheckStatus.fail)
        if self.failed_checks > 0:
            self.overall_status = CheckStatus.fail
            self.summary = f"{self.failed_checks} checks failed verification"
        elif self.warned_checks > 0:
            self.overall_status = CheckStatus.warn
            self.summary = f"Passed with {self.warned_checks} warnings"
        else:
            self.overall_status = CheckStatus.pass_
            self.summary = "All statistical and privacy checks passed"
        return self


# ---------------------------------------------------------------------------
# Invoice
# ---------------------------------------------------------------------------

class LineItem(BaseModel):
    model_config = {"extra": "allow"}
    description: str = Field(default="Professional Services", min_length=1)
    qty: int = Field(default=1, ge=1)
    price: float = Field(default=0.0, ge=0.0)

    @model_validator(mode="before")
    @classmethod
    def normalize_keys(cls, data: Any) -> Any:
        if isinstance(data, dict):
            qty = data.get("qty") if data.get("qty") is not None else data.get("quantity", 1)
            price = data.get("price") if data.get("price") is not None else data.get("unit_price", 0.0)
            desc = data.get("description", "Service Item")
            return {
                **data,
                "description": desc,
                "qty": int(qty),
                "price": float(price),
            }
        return data


class InvoiceRequest(BaseModel):
    model_config = {"extra": "allow"}
    company_name: str = ""
    client_name: str = ""
    line_items: list[LineItem] = Field(default_factory=list)
    currency: str = Field(default="PKR")
    locale: str = Field(default="pk_PK")
    tax_rate: float = Field(default=0.17, ge=0.0, le=1.0)
    seed: Optional[int] = Field(default=42)

    @model_validator(mode="before")
    @classmethod
    def normalize_invoice_request(cls, data: Any) -> Any:
        if isinstance(data, dict):
            company = data.get("company_name") or data.get("sender_name") or "Apex Systems Ltd"
            client = data.get("client_name") or data.get("recipient_name") or "Habib & Sons"
            items = data.get("line_items") or data.get("items") or [
                {"description": "Standard Professional Services", "qty": 1, "price": 50000.0}
            ]
            return {
                **data,
                "company_name": company,
                "client_name": client,
                "line_items": items,
            }
        return data


class InvoiceLineItem(BaseModel):
    description: str
    qty: int
    price: float
    amount: float


class InvoiceResponse(BaseModel):
    model_config = {"extra": "allow"}
    invoice_number: str
    issue_date: str
    company_name: str
    client_name: str
    line_items: list[InvoiceLineItem]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    currency: str
    document_html: str
    html_document: str = ""

    @model_validator(mode="after")
    def sync_html_document(self) -> "InvoiceResponse":
        if not self.html_document:
            self.html_document = self.document_html
        return self


# ---------------------------------------------------------------------------
# Locales / Presets
# ---------------------------------------------------------------------------

class LocaleInfo(BaseModel):
    code: str
    label: str


class LocalesResponse(BaseModel):
    locales: list[LocaleInfo]


class PresetInfo(BaseModel):
    id: str
    label: str
    description: str
    request: GenerateRequest


class PresetsResponse(BaseModel):
    presets: list[PresetInfo]


# ---------------------------------------------------------------------------
# Error envelope (used by exception handlers in main.py)
# ---------------------------------------------------------------------------

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[dict[str, Any]] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail

"""
/api/locales  — returns the list of supported locales.
/api/presets  — returns built-in schema presets.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import (
    LocaleInfo,
    LocalesResponse,
    PresetInfo,
    PresetsResponse,
    GenerateRequest,
    ColumnSpec,
    ColumnType,
    ColumnParams,
    MaskingType,
)

router = APIRouter()

# ---------------------------------------------------------------------------
# Locales
# ---------------------------------------------------------------------------

_LOCALES = [
    LocaleInfo(code="pk_PK", label="Pakistan (PKR, Urdu names)"),
    LocaleInfo(code="en_US", label="United States (USD)"),
    LocaleInfo(code="en_GB", label="United Kingdom (GBP)"),
    LocaleInfo(code="de_DE", label="Germany (EUR)"),
    LocaleInfo(code="fr_FR", label="France (EUR)"),
    LocaleInfo(code="ar_SA", label="Saudi Arabia (SAR)"),
    LocaleInfo(code="zh_CN", label="China (CNY)"),
    LocaleInfo(code="ja_JP", label="Japan (JPY)"),
    LocaleInfo(code="es_ES", label="Spain (EUR)"),
    LocaleInfo(code="pt_BR", label="Brazil (BRL)"),
]


@router.get("/locales", response_model=LocalesResponse)
def get_locales() -> LocalesResponse:
    return LocalesResponse(locales=_LOCALES)


# ---------------------------------------------------------------------------
# Presets
# ---------------------------------------------------------------------------

def _col(name: str, type: ColumnType, nullable: bool = False, null_rate: float = 0.0,
         masking: MaskingType = MaskingType.none, **params) -> ColumnSpec:
    """Helper to build a ColumnSpec concisely."""
    return ColumnSpec(
        name=name,
        type=type,
        nullable=nullable,
        null_rate=null_rate,
        masking=masking,
        params=ColumnParams(**params),
    )


_PRESETS: list[PresetInfo] = [
    # ------------------------------------------------------------------
    # 1. E-commerce users
    # ------------------------------------------------------------------
    PresetInfo(
        id="ecommerce_users",
        label="E-commerce Users",
        description="Customer profiles with ID, name, email, phone, city, balance, signup date, and account status.",
        request=GenerateRequest(
            columns=[
                _col("customer_id",  ColumnType.uuid),
                _col("full_name",    ColumnType.name),
                _col("email",        ColumnType.email, masking=MaskingType.mask),
                _col("phone",        ColumnType.phone, masking=MaskingType.mask),
                _col("city",         ColumnType.city),
                _col("balance_pkr",  ColumnType.currency, min=0.0, max=500_000.0),
                _col("signup_date",  ColumnType.date, date_start="2019-01-01", date_end="2025-06-30"),
                _col("status",       ColumnType.category,
                     categories=["active", "inactive", "suspended"],
                     weights=[0.75, 0.15, 0.10]),
            ],
            row_count=100,
            locale="pk_PK",
            seed=42,
            edge_cases=False,
        ),
    ),

    # ------------------------------------------------------------------
    # 2. Financial transactions
    # ------------------------------------------------------------------
    PresetInfo(
        id="financial_transactions",
        label="Financial Transactions",
        description="Bank-style transaction ledger with amount, type, merchant, and running date.",
        request=GenerateRequest(
            columns=[
                _col("txn_id",       ColumnType.uuid),
                _col("account_id",   ColumnType.integer, min=100000, max=999999),
                _col("txn_date",     ColumnType.datetime, date_start="2024-01-01", date_end="2025-06-30"),
                _col("amount_pkr",   ColumnType.currency, min=50.0, max=250_000.0),
                _col("txn_type",     ColumnType.category,
                     categories=["debit", "credit", "transfer", "refund"],
                     weights=[0.45, 0.35, 0.15, 0.05]),
                _col("merchant",     ColumnType.company),
                _col("status",       ColumnType.category,
                     categories=["completed", "pending", "failed"],
                     weights=[0.88, 0.09, 0.03]),
            ],
            row_count=200,
            locale="pk_PK",
            seed=7,
            edge_cases=False,
        ),
    ),

    # ------------------------------------------------------------------
    # 3. HR / Employee records
    # ------------------------------------------------------------------
    PresetInfo(
        id="hr_employees",
        label="HR Employees",
        description="Employee master data — name, department, salary, hire date, performance rating.",
        request=GenerateRequest(
            columns=[
                _col("employee_id",  ColumnType.integer, min=1000, max=9999),
                _col("full_name",    ColumnType.name),
                _col("email",        ColumnType.email, masking=MaskingType.mask),
                _col("department",   ColumnType.category,
                     categories=["Engineering", "Finance", "HR", "Sales", "Operations", "Marketing"],
                     weights=[0.30, 0.15, 0.10, 0.20, 0.15, 0.10]),
                _col("salary_pkr",   ColumnType.currency, min=40_000.0, max=500_000.0),
                _col("hire_date",    ColumnType.date, date_start="2015-01-01", date_end="2025-01-01"),
                _col("rating",       ColumnType.category,
                     categories=["Excellent", "Good", "Satisfactory", "Needs Improvement"],
                     weights=[0.20, 0.45, 0.25, 0.10]),
                _col("is_active",    ColumnType.boolean),
            ],
            row_count=100,
            locale="pk_PK",
            seed=99,
            edge_cases=False,
        ),
    ),

    # ------------------------------------------------------------------
    # 4. IoT sensor readings
    # ------------------------------------------------------------------
    PresetInfo(
        id="iot_sensors",
        label="IoT Sensor Readings",
        description="Time-series sensor data with temperature, humidity, pressure, and device ID.",
        request=GenerateRequest(
            columns=[
                _col("reading_id",   ColumnType.uuid),
                _col("device_id",    ColumnType.integer, min=1, max=500),
                _col("timestamp",    ColumnType.datetime, date_start="2025-01-01", date_end="2025-06-30"),
                _col("temperature_c",ColumnType.float_,  min=-10.0, max=60.0,
                     distribution="normal", mean=25.0, std=8.0),
                _col("humidity_pct", ColumnType.float_,  min=10.0, max=100.0,
                     distribution="normal", mean=60.0, std=15.0),
                _col("pressure_hpa", ColumnType.float_,  min=950.0, max=1050.0,
                     distribution="normal", mean=1013.0, std=10.0),
                _col("location",     ColumnType.city),
                _col("status",       ColumnType.category,
                     categories=["online", "offline", "error"],
                     weights=[0.90, 0.07, 0.03]),
            ],
            row_count=500,
            locale="pk_PK",
            seed=13,
            edge_cases=True,
        ),
    ),

    # ------------------------------------------------------------------
    # 5. Product catalog
    # ------------------------------------------------------------------
    PresetInfo(
        id="product_catalog",
        label="Product Catalog",
        description="Retail product listings with SKU, name, category, price, stock, and rating.",
        request=GenerateRequest(
            columns=[
                _col("sku",          ColumnType.uuid),
                _col("product_name", ColumnType.string),
                _col("category",     ColumnType.category,
                     categories=["Electronics", "Clothing", "Food", "Books", "Home", "Sports"],
                     weights=[0.25, 0.20, 0.15, 0.15, 0.15, 0.10]),
                _col("price_pkr",    ColumnType.currency, min=100.0, max=200_000.0),
                _col("stock_qty",    ColumnType.integer,  min=0, max=5000),
                _col("rating",       ColumnType.float_,   min=1.0, max=5.0),
                _col("in_stock",     ColumnType.boolean),
                _col("added_date",   ColumnType.date, date_start="2022-01-01", date_end="2025-06-01"),
            ],
            row_count=100,
            locale="pk_PK",
            seed=55,
            edge_cases=False,
        ),
    ),

    # ------------------------------------------------------------------
    # 6. Healthcare patients (masked PII)
    # ------------------------------------------------------------------
    PresetInfo(
        id="healthcare_patients",
        label="Healthcare Patients",
        description="Patient records with masked name and phone, diagnosis category, age, and visit date.",
        request=GenerateRequest(
            columns=[
                _col("patient_id",   ColumnType.uuid),
                _col("full_name",    ColumnType.name,    masking=MaskingType.mask),
                _col("phone",        ColumnType.phone,   masking=MaskingType.mask),
                _col("age",          ColumnType.integer, min=1, max=90),
                _col("gender",       ColumnType.category,
                     categories=["Male", "Female"],
                     weights=[0.51, 0.49]),
                _col("city",         ColumnType.city),
                _col("diagnosis",    ColumnType.category,
                     categories=["Hypertension", "Diabetes", "Respiratory", "Orthopedic", "General"],
                     weights=[0.25, 0.30, 0.15, 0.15, 0.15]),
                _col("visit_date",   ColumnType.date, date_start="2024-01-01", date_end="2025-06-30"),
                _col("fee_pkr",      ColumnType.currency, min=500.0, max=15_000.0),
            ],
            row_count=100,
            locale="pk_PK",
            seed=77,
            edge_cases=False,
        ),
    ),
]


@router.get("/presets", response_model=PresetsResponse)
def get_presets() -> PresetsResponse:
    return PresetsResponse(presets=_PRESETS)

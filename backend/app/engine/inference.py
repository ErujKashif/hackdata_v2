"""
CSV schema inference engine.
- Runs entirely locally — no LLM, no network calls.
- Uses pandas profiling + rule-based type detection.
- Detects PII columns by name heuristics and value patterns.
- Returns ColumnSpec-compatible output plus sample_values and pii annotations.
"""

from __future__ import annotations

import io
import re
from typing import Optional

import pandas as pd

from app.models.schemas import (
    ColumnParams,
    ColumnType,
    InferredColumn,
    InferSchemaResponse,
    MaskingType,
)


# ---------------------------------------------------------------------------
# PII detection
# ---------------------------------------------------------------------------

# Name-based PII hints (check column name)
PII_NAME_PATTERNS: dict[str, str] = {
    r"\bname\b": "name",
    r"\bemail\b": "email",
    r"\bphone\b|mobile|cell": "phone",
    r"\baddress\b|addr\b": "address",
    r"\bnid\b|cnic|national.?id|ssn|passport": "national_id",
    r"\bsalary\b|income|wage": "salary",
    r"\bdob\b|birth.?date|date.?of.?birth": "date_of_birth",
    r"\bip\b|ip.?address": "ip_address",
    r"\bcard\b|credit.?card|debit.?card|pan\b": "card_number",
    r"\biban\b|account.?number|bank.?account": "bank_account",
}

# Value-based PII patterns (applied to sample values)
PII_VALUE_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("email", re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")),
    ("phone", re.compile(r"^(\+92|0092|0)[0-9\-\s]{9,14}$")),
    ("national_id", re.compile(r"^\d{5}-\d{7}-\d$")),
    ("card_number", re.compile(r"^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$")),
    ("ip_address", re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")),
]


def _detect_pii_by_name(col_name: str) -> Optional[str]:
    lower = col_name.lower()
    for pattern, label in PII_NAME_PATTERNS.items():
        if re.search(pattern, lower):
            return label
    return None


def _detect_pii_by_values(samples: list[str]) -> Optional[str]:
    if not samples:
        return None
    # Check a representative sample (up to 20 values)
    check = [str(s) for s in samples[:20] if s and str(s).strip()]
    if not check:
        return None
    for label, pattern in PII_VALUE_PATTERNS:
        matches = sum(1 for v in check if pattern.match(v.strip()))
        if matches / len(check) > 0.6:
            return label
    return None


# ---------------------------------------------------------------------------
# Type inference
# ---------------------------------------------------------------------------

def _infer_column_type(series: pd.Series, col_name: str) -> tuple[ColumnType, ColumnParams]:
    """
    Infer ColumnType and ColumnParams from a pandas Series.
    Returns (type, params).
    """
    name_lower = col_name.lower()

    # Check name hints first
    if re.search(r"\bemail\b", name_lower):
        return ColumnType.email, ColumnParams()
    if re.search(r"\bphone\b|mobile|cell", name_lower):
        return ColumnType.phone, ColumnParams()
    if re.search(r"\bname\b", name_lower):
        return ColumnType.name, ColumnParams()
    if re.search(r"\baddress\b|addr\b", name_lower):
        return ColumnType.address, ColumnParams()
    if re.search(r"\bcity\b|town\b", name_lower):
        return ColumnType.city, ColumnParams()
    if re.search(r"\bcompany\b|firm\b|organization\b", name_lower):
        return ColumnType.company, ColumnParams()
    if re.search(r"\buuid\b|guid\b|id\b", name_lower):
        # Check if values look like UUIDs
        sample = series.dropna().astype(str).head(10)
        uuid_re = re.compile(r"^[0-9a-f\-]{32,36}$", re.I)
        if sample.apply(lambda v: bool(uuid_re.match(v))).mean() > 0.7:
            return ColumnType.uuid, ColumnParams()

    # Pandas dtype inference
    if pd.api.types.is_bool_dtype(series):
        return ColumnType.boolean, ColumnParams()

    if pd.api.types.is_integer_dtype(series):
        lo = float(series.min()) if len(series) > 0 else 0.0
        hi = float(series.max()) if len(series) > 0 else 100.0
        # Currency hint
        if re.search(r"\bprice\b|amount\b|cost\b|salary\b|balance\b|total\b|fee\b", name_lower):
            return ColumnType.currency, ColumnParams(min=lo, max=hi)
        return ColumnType.integer, ColumnParams(min=lo, max=hi)

    if pd.api.types.is_float_dtype(series):
        lo = float(series.min()) if len(series) > 0 else 0.0
        hi = float(series.max()) if len(series) > 0 else 100.0
        if re.search(r"\bprice\b|amount\b|cost\b|salary\b|balance\b|total\b|fee\b", name_lower):
            return ColumnType.currency, ColumnParams(min=lo, max=hi)
        return ColumnType.float_, ColumnParams(min=lo, max=hi)

    # Try to parse as datetime
    if re.search(r"\bdate\b|time\b|created\b|updated\b|timestamp\b", name_lower):
        try:
            parsed = pd.to_datetime(series.dropna().head(20), errors="coerce")
            if parsed.notna().mean() > 0.7:
                sample_parsed = parsed.dropna()
                if len(sample_parsed) > 0:
                    start = str(sample_parsed.min().date())
                    end = str(sample_parsed.max().date())
                    # Determine if it has time component
                    has_time = any(":" in str(v) for v in series.dropna().head(10))
                    col_type = ColumnType.datetime if has_time else ColumnType.date
                    return col_type, ColumnParams(date_start=start, date_end=end)
        except Exception:
            pass

    # Category detection: string with low cardinality
    if pd.api.types.is_object_dtype(series):
        unique_count = series.nunique()
        total = len(series.dropna())
        if total > 0 and unique_count / total < 0.1 and unique_count <= 30:
            cats = series.dropna().unique().tolist()[:30]
            cat_strings = [str(c) for c in cats]
            # Build weights — convert to dict first for safe .get() access
            vc_dict = series.value_counts(normalize=True).to_dict()
            weights = [round(float(vc_dict.get(c, 0.0)), 4) for c in cats]
            return ColumnType.category, ColumnParams(categories=cat_strings, weights=weights)

    return ColumnType.string, ColumnParams()


# ---------------------------------------------------------------------------
# Main inference function
# ---------------------------------------------------------------------------

MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB


def infer_schema_from_csv(content: bytes) -> InferSchemaResponse:
    """
    Parse a CSV file (as bytes) and return an InferSchemaResponse.
    """
    warnings: list[str] = []

    if len(content) > MAX_FILE_BYTES:
        raise ValueError("File exceeds the 5 MB limit.")

    try:
        df = pd.read_csv(io.BytesIO(content), low_memory=False)
    except Exception as exc:
        raise ValueError(f"Could not parse CSV: {exc}") from exc

    if df.empty:
        raise ValueError("CSV file is empty.")

    sampled_rows = len(df)
    if sampled_rows > 500:
        df = df.sample(n=500, random_state=42)
        warnings.append("File has more than 500 rows; schema inferred from a random sample of 500.")

    columns: list[InferredColumn] = []

    for col_name in df.columns:
        series = df[col_name]

        # Null analysis
        null_count = int(series.isna().sum())
        total = len(series)
        null_rate = round(null_count / total, 4) if total > 0 else 0.0
        nullable = null_rate > 0

        # Try numeric coercion for object columns
        if pd.api.types.is_object_dtype(series):
            coerced = pd.to_numeric(series, errors="coerce")
            if coerced.notna().mean() > 0.8:
                series = coerced

        col_type, params = _infer_column_type(series, col_name)

        # Sample values (up to 5, as strings)
        sample_values = (
            df[col_name].dropna().head(5).astype(str).tolist()
        )

        # PII detection
        pii = _detect_pii_by_name(col_name) or _detect_pii_by_values(sample_values)

        if pii:
            warnings.append(f"Column '{col_name}' may contain {pii} data (PII detected).")

        inferred = InferredColumn(
            name=col_name,
            type=col_type,
            nullable=nullable,
            null_rate=null_rate,
            masking=MaskingType.none,
            params=params,
            sample_values=sample_values,
            pii=pii,
        )
        columns.append(inferred)

    return InferSchemaResponse(
        columns=columns,
        sampled_rows=sampled_rows,
        warnings=warnings,
    )

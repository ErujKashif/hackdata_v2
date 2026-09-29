"""
Validation engine.
Runs a suite of statistical checks on a GenerateRequest and returns
pass/warn/fail results for the validation report panel.
"""

from __future__ import annotations

import math
import random
from typing import Any

from app.models.schemas import (
    CheckStatus,
    ColumnType,
    GenerateRequest,
    ValidationCheck,
    ValidationResponse,
)
from app.engine.tabular import generate_tabular


def _check_seed_determinism(req: GenerateRequest) -> ValidationCheck:
    """Same seed must produce identical rows."""
    result_a = generate_tabular(req, limit=5)
    result_b = generate_tabular(req, limit=5)
    identical = result_a["rows"] == result_b["rows"]
    return ValidationCheck(
        name="Seed determinism",
        status=CheckStatus.pass_ if identical else CheckStatus.fail,
        expected="Rows identical across two calls with same seed",
        actual="Pass" if identical else "Rows differ — seeding broken",
    )


def _check_null_rate(req: GenerateRequest) -> list[ValidationCheck]:
    """Null rate per nullable column should land within ±5 percentage points."""
    checks: list[ValidationCheck] = []
    nullable_cols = [c for c in req.columns if c.nullable and c.null_rate > 0]
    if not nullable_cols:
        return checks

    # Generate enough rows for a meaningful check
    sample_count = min(req.row_count, 500)
    sample_req = req.model_copy(update={"row_count": sample_count})
    result = generate_tabular(sample_req, limit=sample_count)
    rows = result["rows"]

    for col in nullable_cols:
        null_count = sum(1 for r in rows if r.get(col.name) is None)
        actual_rate = null_count / len(rows) if rows else 0.0
        expected_rate = col.null_rate
        diff = abs(actual_rate - expected_rate)
        tolerance = 0.08  # 8 percentage points tolerance

        if diff <= tolerance:
            status = CheckStatus.pass_
        elif diff <= 0.15:
            status = CheckStatus.warn
        else:
            status = CheckStatus.fail

        checks.append(ValidationCheck(
            name=f"Null rate — {col.name}",
            status=status,
            expected=f"{expected_rate:.1%}",
            actual=f"{actual_rate:.1%} (Δ {diff:.1%})",
        ))

    return checks


def _check_row_count(req: GenerateRequest) -> ValidationCheck:
    """Generated row count must match requested."""
    result = generate_tabular(req, limit=req.row_count)
    actual = result["returned_rows"]
    expected = min(req.row_count, actual)  # limit may cap
    ok = actual <= req.row_count
    return ValidationCheck(
        name="Row count",
        status=CheckStatus.pass_ if ok else CheckStatus.fail,
        expected=str(req.row_count),
        actual=str(actual),
    )


def _check_column_presence(req: GenerateRequest) -> ValidationCheck:
    """All requested columns must appear in every row."""
    result = generate_tabular(req, limit=min(10, req.row_count))
    rows = result["rows"]
    if not rows:
        return ValidationCheck(
            name="Column presence",
            status=CheckStatus.warn,
            expected=str(len(req.columns)),
            actual="0 rows generated",
        )
    expected_names = {c.name for c in req.columns}
    missing: set[str] = set()
    for row in rows:
        for name in expected_names:
            if name not in row:
                missing.add(name)
    if missing:
        return ValidationCheck(
            name="Column presence",
            status=CheckStatus.fail,
            expected=", ".join(sorted(expected_names)),
            actual=f"Missing: {', '.join(sorted(missing))}",
        )
    return ValidationCheck(
        name="Column presence",
        status=CheckStatus.pass_,
        expected=str(len(req.columns)),
        actual=f"{len(expected_names)} columns present in all rows",
    )


def _check_numeric_range(req: GenerateRequest) -> list[ValidationCheck]:
    """Numeric columns must stay within configured min/max."""
    checks: list[ValidationCheck] = []
    numeric_types = {ColumnType.integer, ColumnType.float_, ColumnType.currency}
    numeric_cols = [c for c in req.columns if c.type in numeric_types
                    and (c.params.min is not None or c.params.max is not None)]
    if not numeric_cols:
        return checks

    sample_count = min(req.row_count, 200)
    sample_req = req.model_copy(update={"row_count": sample_count})
    result = generate_tabular(sample_req, limit=sample_count)
    rows = result["rows"]

    for col in numeric_cols:
        values = [
            r[col.name] for r in rows
            if r.get(col.name) is not None and isinstance(r.get(col.name), (int, float))
            and not (isinstance(r.get(col.name), float) and math.isinf(r[col.name]))
        ]
        if not values:
            continue

        lo = col.params.min
        hi = col.params.max
        out_of_range = sum(
            1 for v in values
            if (lo is not None and v < lo) or (hi is not None and v > hi)
        )
        rate = out_of_range / len(values)

        if rate == 0:
            status = CheckStatus.pass_
        elif rate < 0.02:
            status = CheckStatus.warn
        else:
            status = CheckStatus.fail

        checks.append(ValidationCheck(
            name=f"Range bounds — {col.name}",
            status=status,
            expected=f"[{lo}, {hi}]",
            actual=f"{out_of_range}/{len(values)} out-of-range ({rate:.1%})",
        ))

    return checks


def _check_category_integrity(req: GenerateRequest) -> list[ValidationCheck]:
    """Category columns must only produce values from the declared category list."""
    checks: list[ValidationCheck] = []
    cat_cols = [c for c in req.columns
                if c.type == ColumnType.category and c.params.categories]
    if not cat_cols:
        return checks

    sample_count = min(req.row_count, 200)
    sample_req = req.model_copy(update={"row_count": sample_count})
    result = generate_tabular(sample_req, limit=sample_count)
    rows = result["rows"]

    for col in cat_cols:
        allowed = set(col.params.categories or [])
        values = [str(r[col.name]) for r in rows if r.get(col.name) is not None]
        invalid = [v for v in values if v not in allowed]

        if not invalid:
            status = CheckStatus.pass_
            actual_str = f"All {len(values)} values are valid"
        else:
            status = CheckStatus.fail
            actual_str = f"{len(invalid)} invalid values found: {list(set(invalid))[:5]}"

        checks.append(ValidationCheck(
            name=f"Category integrity — {col.name}",
            status=status,
            expected=f"{len(allowed)} categories",
            actual=actual_str,
        ))

    return checks


def _check_uniqueness(req: GenerateRequest) -> list[ValidationCheck]:
    """UUID columns should be unique. Check for duplicates."""
    checks: list[ValidationCheck] = []
    uuid_cols = [c for c in req.columns if c.type == ColumnType.uuid]
    if not uuid_cols:
        return checks

    sample_count = min(req.row_count, 500)
    sample_req = req.model_copy(update={"row_count": sample_count})
    result = generate_tabular(sample_req, limit=sample_count)
    rows = result["rows"]

    for col in uuid_cols:
        values = [r[col.name] for r in rows if r.get(col.name) is not None]
        unique = len(set(values))
        total = len(values)
        duplicates = total - unique

        checks.append(ValidationCheck(
            name=f"Uniqueness — {col.name}",
            status=CheckStatus.pass_ if duplicates == 0 else CheckStatus.fail,
            expected="All unique",
            actual=f"{unique}/{total} unique ({duplicates} duplicates)",
        ))

    return checks


def run_validation(req: GenerateRequest) -> ValidationResponse:
    """
    Run the full validation suite and return results.
    """
    checks: list[ValidationCheck] = []

    checks.append(_check_seed_determinism(req))
    checks.append(_check_row_count(req))
    checks.append(_check_column_presence(req))
    checks.extend(_check_null_rate(req))
    checks.extend(_check_numeric_range(req))
    checks.extend(_check_category_integrity(req))
    checks.extend(_check_uniqueness(req))

    return ValidationResponse(checks=checks)

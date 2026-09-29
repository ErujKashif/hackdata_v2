"""
Pytest tests for the Synthara backend.
Covers:
  - Same seed → same rows (determinism)
  - Null rate accuracy (within tolerance)
  - Invoice totals reconcile exactly
  - Export produces correct structure
  - Schema inference on a known CSV
  - Validation suite runs without error
"""

from __future__ import annotations

import io
import csv
import math

import pytest

from app.models.schemas import (
    ColumnSpec,
    ColumnType,
    ColumnParams,
    GenerateRequest,
    InvoiceRequest,
    LineItem,
    MaskingType,
)
from app.engine.tabular import generate_tabular
from app.engine.invoice import generate_invoice
from app.engine.inference import infer_schema_from_csv
from app.engine.validation import run_validation


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _simple_request(**overrides) -> GenerateRequest:
    defaults = dict(
        columns=[
            ColumnSpec(name="id",    type=ColumnType.uuid),
            ColumnSpec(name="name",  type=ColumnType.name),
            ColumnSpec(name="score", type=ColumnType.integer,
                       params=ColumnParams(min=0, max=100)),
        ],
        row_count=50,
        locale="pk_PK",
        seed=42,
        edge_cases=False,
    )
    defaults.update(overrides)
    return GenerateRequest(**defaults)


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------

class TestDeterminism:
    def test_same_seed_same_rows(self):
        req = _simple_request()
        result_a = generate_tabular(req, limit=10)
        result_b = generate_tabular(req, limit=10)
        assert result_a["rows"] == result_b["rows"], (
            "Two calls with identical seed must return identical rows."
        )

    def test_different_seeds_different_rows(self):
        req_a = _simple_request(seed=1)
        req_b = _simple_request(seed=2)
        rows_a = generate_tabular(req_a, limit=5)["rows"]
        rows_b = generate_tabular(req_b, limit=5)["rows"]
        # At minimum the name column should differ between seeds
        names_a = [r["name"] for r in rows_a]
        names_b = [r["name"] for r in rows_b]
        assert names_a != names_b, "Different seeds must produce different data."

    def test_seed_in_response(self):
        req = _simple_request(seed=99)
        result = generate_tabular(req, limit=1)
        assert result["seed"] == 99


# ---------------------------------------------------------------------------
# Row counts
# ---------------------------------------------------------------------------

class TestRowCounts:
    def test_limit_respected(self):
        req = _simple_request(row_count=100)
        result = generate_tabular(req, limit=20)
        assert result["returned_rows"] == 20
        assert len(result["rows"]) == 20

    def test_total_rows_reflects_row_count(self):
        req = _simple_request(row_count=200)
        result = generate_tabular(req, limit=5)
        assert result["total_rows"] == 200

    def test_no_limit_returns_all(self):
        req = _simple_request(row_count=30)
        result = generate_tabular(req, limit=None)
        assert result["returned_rows"] == 30


# ---------------------------------------------------------------------------
# Null rates
# ---------------------------------------------------------------------------

class TestNullRates:
    def test_null_rate_accuracy(self):
        col = ColumnSpec(
            name="score",
            type=ColumnType.integer,
            nullable=True,
            null_rate=0.30,
            params=ColumnParams(min=0, max=100),
        )
        req = GenerateRequest(
            columns=[col],
            row_count=2000,
            locale="pk_PK",
            seed=42,
            edge_cases=False,
        )
        result = generate_tabular(req, limit=2000)
        rows = result["rows"]
        null_count = sum(1 for r in rows if r["score"] is None)
        actual_rate = null_count / len(rows)
        # Allow ±5 percentage points
        assert abs(actual_rate - 0.30) < 0.05, (
            f"Expected ~30% nulls, got {actual_rate:.1%}"
        )

    def test_zero_null_rate_no_nulls(self):
        col = ColumnSpec(
            name="val",
            type=ColumnType.integer,
            nullable=False,
            null_rate=0.0,
            params=ColumnParams(min=1, max=10),
        )
        req = GenerateRequest(
            columns=[col], row_count=100, locale="pk_PK", seed=1, edge_cases=False
        )
        rows = generate_tabular(req)["rows"]
        assert all(r["val"] is not None for r in rows)


# ---------------------------------------------------------------------------
# Invoice
# ---------------------------------------------------------------------------

class TestInvoice:
    def _make_request(self) -> InvoiceRequest:
        return InvoiceRequest(
            company_name="Synthara Ltd",
            client_name="Acme Corp",
            line_items=[
                LineItem(description="API access", qty=1, price=1000.00),
                LineItem(description="Support",    qty=2, price=250.00),
            ],
            currency="PKR",
            locale="pk_PK",
            tax_rate=0.17,
            seed=42,
        )

    def test_totals_reconcile(self):
        inv = generate_invoice(self._make_request())
        expected_subtotal = round(1 * 1000.00 + 2 * 250.00, 2)  # 1500.00
        expected_tax = round(expected_subtotal * 0.17, 2)         # 255.00
        expected_total = round(expected_subtotal + expected_tax, 2)  # 1755.00

        assert inv.subtotal == expected_subtotal
        assert inv.tax_amount == expected_tax
        assert inv.total == expected_total

    def test_invoice_number_format(self):
        inv = generate_invoice(self._make_request())
        assert inv.invoice_number.startswith("INV-")
        assert len(inv.invoice_number) > 5

    def test_html_document_generated(self):
        inv = generate_invoice(self._make_request())
        assert inv.document_html.strip().startswith("<!DOCTYPE html>")
        assert "Synthara" in inv.document_html
        assert inv.invoice_number in inv.document_html

    def test_line_item_amounts(self):
        inv = generate_invoice(self._make_request())
        for item in inv.line_items:
            expected = round(item.qty * item.price, 2)
            assert item.amount == expected, f"Line item amount wrong for '{item.description}'"


# ---------------------------------------------------------------------------
# Masking
# ---------------------------------------------------------------------------

class TestMasking:
    def test_mask_applied(self):
        col = ColumnSpec(name="email", type=ColumnType.email, masking=MaskingType.mask)
        req = GenerateRequest(
            columns=[col], row_count=10, locale="pk_PK", seed=1, edge_cases=False
        )
        rows = generate_tabular(req)["rows"]
        for row in rows:
            if row["email"] is not None:
                assert "*" in str(row["email"]), "Masked value should contain asterisks"

    def test_hash_applied(self):
        col = ColumnSpec(name="phone", type=ColumnType.phone, masking=MaskingType.hash)
        req = GenerateRequest(
            columns=[col], row_count=5, locale="pk_PK", seed=2, edge_cases=False
        )
        rows = generate_tabular(req)["rows"]
        for row in rows:
            if row["phone"] is not None:
                val = str(row["phone"])
                # SHA-256 hex digest is 64 chars
                assert len(val) == 64, "Hash should be 64-char SHA-256 hex"


# ---------------------------------------------------------------------------
# Schema inference
# ---------------------------------------------------------------------------

class TestSchemaInference:
    def _make_csv(self, rows: list[dict]) -> bytes:
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        return buf.getvalue().encode("utf-8")

    def test_basic_inference(self):
        data = [
            {"name": "Ahmad Khan", "email": "a@b.com", "age": 30, "city": "Lahore"},
            {"name": "Sara Ali",   "email": "s@c.com", "age": 25, "city": "Karachi"},
        ]
        content = self._make_csv(data)
        result = infer_schema_from_csv(content)
        col_names = [c.name for c in result.columns]
        assert "name" in col_names
        assert "email" in col_names
        assert "age" in col_names

    def test_pii_detected_for_email(self):
        data = [{"email": "test@example.com"}, {"email": "hello@world.org"}]
        content = self._make_csv(data)
        result = infer_schema_from_csv(content)
        email_col = next((c for c in result.columns if c.name == "email"), None)
        assert email_col is not None
        assert email_col.pii is not None, "Email column should be flagged as PII"

    def test_empty_csv_raises(self):
        with pytest.raises(ValueError, match="empty"):
            infer_schema_from_csv(b"col1,col2\n")

    def test_warnings_list_returned(self):
        data = [{"name": "Ahmad"}, {"name": "Sara"}]
        content = self._make_csv(data)
        result = infer_schema_from_csv(content)
        assert isinstance(result.warnings, list)


# ---------------------------------------------------------------------------
# Validation suite
# ---------------------------------------------------------------------------

class TestValidation:
    def test_validation_runs_without_error(self):
        req = _simple_request(row_count=50)
        result = run_validation(req)
        assert len(result.checks) > 0

    def test_determinism_check_passes(self):
        req = _simple_request()
        result = run_validation(req)
        det_check = next((c for c in result.checks if "determinism" in c.name.lower()), None)
        assert det_check is not None
        assert det_check.status.value == "pass"

    def test_all_checks_have_required_fields(self):
        req = _simple_request()
        result = run_validation(req)
        for check in result.checks:
            assert check.name
            assert check.status
            assert check.expected is not None
            assert check.actual is not None


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_single_row(self):
        req = _simple_request(row_count=1)
        result = generate_tabular(req)
        assert len(result["rows"]) == 1

    def test_max_columns(self):
        cols = [
            ColumnSpec(name=f"col_{i}", type=ColumnType.integer,
                       params=ColumnParams(min=0, max=100))
            for i in range(20)
        ]
        req = GenerateRequest(columns=cols, row_count=10, locale="pk_PK", seed=1, edge_cases=False)
        result = generate_tabular(req)
        assert len(result["rows"]) == 10
        assert len(result["rows"][0]) == 20

    def test_all_column_types_generate(self):
        """Every ColumnType must produce a non-crashing value."""
        cols = [
            ColumnSpec(name="c_int",      type=ColumnType.integer),
            ColumnSpec(name="c_float",    type=ColumnType.float_),
            ColumnSpec(name="c_string",   type=ColumnType.string),
            ColumnSpec(name="c_bool",     type=ColumnType.boolean),
            ColumnSpec(name="c_date",     type=ColumnType.date),
            ColumnSpec(name="c_datetime", type=ColumnType.datetime),
            ColumnSpec(name="c_category", type=ColumnType.category,
                       params=ColumnParams(categories=["A", "B"])),
            ColumnSpec(name="c_name",     type=ColumnType.name),
            ColumnSpec(name="c_email",    type=ColumnType.email),
            ColumnSpec(name="c_phone",    type=ColumnType.phone),
            ColumnSpec(name="c_address",  type=ColumnType.address),
            ColumnSpec(name="c_city",     type=ColumnType.city),
            ColumnSpec(name="c_company",  type=ColumnType.company),
            ColumnSpec(name="c_uuid",     type=ColumnType.uuid),
            ColumnSpec(name="c_currency", type=ColumnType.currency),
        ]
        req = GenerateRequest(columns=cols, row_count=5, locale="pk_PK", seed=1, edge_cases=False)
        result = generate_tabular(req)
        assert len(result["rows"]) == 5
        # Every column present
        for row in result["rows"]:
            for col in cols:
                assert col.name in row

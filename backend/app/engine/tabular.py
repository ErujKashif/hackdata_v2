"""
Tabular data generation engine.
- Seeded, deterministic, reproducible.
- Supports all ColumnType values.
- Pakistan locale uses bundled data pools (no Faker network calls).
- Edge-case injection: nulls beyond null_rate, outliers, empty strings.
- Column masking: mask (***) and SHA-256 hash.
"""

from __future__ import annotations

import hashlib
import random
import string
import uuid
from datetime import datetime, timedelta, date
from typing import Any

import numpy as np

from app.models.schemas import (
    ColumnSpec,
    ColumnType,
    GenerateRequest,
    MaskingType,
)
from app.data import pakistan as pk


# ---------------------------------------------------------------------------
# Locale-aware Faker wrapper
# ---------------------------------------------------------------------------

class LocaleProvider:
    """
    Wraps locale-specific data pools. Pakistan uses our curated data.
    Other locales fall back to Faker.
    """

    def __init__(self, locale: str, rng: random.Random, np_rng: np.random.Generator):
        self.locale = locale
        self.rng = rng
        self.np_rng = np_rng
        self._faker = None  # lazy-loaded only for non-PK locales

    def _get_faker(self):
        if self._faker is None:
            from faker import Faker
            faker_locale = self.locale if self.locale != "pk_PK" else "en_US"
            self._faker = Faker(faker_locale)
            self._faker.seed_instance(self.rng.randint(0, 2**31))
        return self._faker

    def name(self) -> str:
        if self.locale == "pk_PK":
            return pk.full_name(self.rng)
        return self._get_faker().name()

    def email(self, name: str | None = None) -> str:
        if self.locale == "pk_PK":
            parts = name.split() if name else ["user", "pk"]
            first = parts[0] if len(parts) > 0 else "user"
            last = parts[-1] if len(parts) > 1 else "pk"
            return pk.email(first, last, self.rng)
        return self._get_faker().email()

    def phone(self) -> str:
        if self.locale == "pk_PK":
            return pk.phone(self.rng)
        return self._get_faker().phone_number()

    def address(self) -> str:
        if self.locale == "pk_PK":
            return pk.address(self.rng)
        return self._get_faker().address().replace("\n", ", ")

    def city(self) -> str:
        if self.locale == "pk_PK":
            return self.rng.choice(pk.CITIES)
        return self._get_faker().city()

    def company(self) -> str:
        if self.locale == "pk_PK":
            return pk.company(self.rng)
        return self._get_faker().company()


# ---------------------------------------------------------------------------
# Value generators per ColumnType
# ---------------------------------------------------------------------------

def _gen_integer(col: ColumnSpec, rng: random.Random, np_rng: np.random.Generator) -> int:
    p = col.params
    lo = int(p.min) if p.min is not None else 0
    hi = int(p.max) if p.max is not None else 10_000
    if p.distribution and p.distribution.value == "normal":
        mean = p.mean if p.mean is not None else (lo + hi) / 2
        std = p.std if p.std is not None else (hi - lo) / 6
        val = int(np_rng.normal(mean, std))
        return max(lo, min(hi, val))
    return rng.randint(lo, hi)


def _gen_float(col: ColumnSpec, rng: random.Random, np_rng: np.random.Generator) -> float:
    p = col.params
    lo = p.min if p.min is not None else 0.0
    hi = p.max if p.max is not None else 10_000.0
    if p.distribution and p.distribution.value == "normal":
        mean = p.mean if p.mean is not None else (lo + hi) / 2
        std = p.std if p.std is not None else (hi - lo) / 6
        val = float(np_rng.normal(mean, std))
        return round(max(lo, min(hi, val)), 4)
    return round(rng.uniform(lo, hi), 4)


def _gen_string(col: ColumnSpec, rng: random.Random) -> str:
    length = rng.randint(4, 24)
    return "".join(rng.choices(string.ascii_letters + string.digits, k=length))


def _gen_boolean(rng: random.Random) -> bool:
    return rng.random() > 0.5


def _gen_date(col: ColumnSpec, rng: random.Random) -> str:
    p = col.params
    start_str = p.date_start or "2020-01-01"
    end_str = p.date_end or "2025-12-31"
    try:
        start = date.fromisoformat(start_str)
        end = date.fromisoformat(end_str)
    except ValueError:
        start = date(2020, 1, 1)
        end = date(2025, 12, 31)
    delta = (end - start).days
    if delta < 0:
        delta = 0
    offset = rng.randint(0, delta)
    result = start + timedelta(days=offset)
    fmt = p.format or "%Y-%m-%d"
    return result.strftime(fmt)


def _gen_datetime(col: ColumnSpec, rng: random.Random) -> str:
    p = col.params
    start_str = p.date_start or "2020-01-01"
    end_str = p.date_end or "2025-12-31"
    try:
        start = datetime.fromisoformat(start_str)
        end = datetime.fromisoformat(end_str)
    except ValueError:
        start = datetime(2020, 1, 1)
        end = datetime(2025, 12, 31)
    delta_seconds = int((end - start).total_seconds())
    if delta_seconds < 0:
        delta_seconds = 0
    offset = rng.randint(0, delta_seconds)
    result = start + timedelta(seconds=offset)
    fmt = p.format or "%Y-%m-%dT%H:%M:%S"
    return result.strftime(fmt)


def _gen_category(col: ColumnSpec, rng: random.Random) -> str:
    p = col.params
    cats = p.categories if p.categories else ["A", "B", "C"]
    weights = p.weights
    if weights and len(weights) == len(cats):
        return rng.choices(cats, weights=weights, k=1)[0]
    return rng.choice(cats)


def _gen_uuid(_rng: random.Random) -> str:
    return str(uuid.UUID(int=_rng.getrandbits(128), version=4))


def _gen_currency(col: ColumnSpec, rng: random.Random) -> float:
    p = col.params
    lo = p.min if p.min is not None else 100.0
    hi = p.max if p.max is not None else 1_000_000.0
    return round(rng.uniform(lo, hi), 2)


def _gen_cnic(rng: random.Random) -> str:
    area = rng.choice(["17301", "35201", "42101", "61101", "71401"])
    mid = f"{rng.randint(1000000, 9999999)}"
    end = f"{rng.randint(1, 9)}"
    return f"{area}-{mid}-{end}"


def _gen_country(rng: random.Random) -> str:
    return rng.choice(["Pakistan", "United States", "United Kingdom", "Germany", "Saudi Arabia", "Canada", "UAE"])


def _gen_iban(rng: random.Random) -> str:
    bank = rng.choice(["HABB", "MCBL", "UBLP", "BAHL", "MEZN"])
    digits = "".join(str(rng.randint(0, 9)) for _ in range(16))
    return f"PK{rng.randint(10, 99)}{bank}{digits}"


# ---------------------------------------------------------------------------
# Edge-case injection
# ---------------------------------------------------------------------------

EDGE_STRINGS = ["", "NULL", "N/A", "undefined", "0", "-1", "!@#$%", "á é í ó ú"]
EDGE_NUMBERS = [0, -1, 999_999_999, -999_999_999, 0.000001, float("inf")]  # inf filtered later


def _inject_edge(col: ColumnSpec, rng: random.Random) -> Any:
    """Return an edge-case value appropriate for the column type."""
    t = col.type
    if t in (ColumnType.integer,):
        return rng.choice([0, -1, 2**31 - 1, -(2**31)])
    if t in (ColumnType.float_, ColumnType.currency):
        return rng.choice([0.0, -0.01, 99999.99])
    if t in (ColumnType.string, ColumnType.name, ColumnType.email,
             ColumnType.phone, ColumnType.address, ColumnType.city,
             ColumnType.company):
        return rng.choice(EDGE_STRINGS)
    if t == ColumnType.boolean:
        return None
    if t in (ColumnType.date, ColumnType.datetime):
        return rng.choice(["0001-01-01", "9999-12-31", ""])
    return None


# ---------------------------------------------------------------------------
# Masking
# ---------------------------------------------------------------------------

def _apply_masking(value: Any, masking: MaskingType) -> Any:
    if masking == MaskingType.none or value is None:
        return value
    str_val = str(value)
    if masking == MaskingType.mask:
        visible = min(3, len(str_val) // 3)
        return str_val[:visible] + "*" * max(3, len(str_val) - visible)
    if masking == MaskingType.hash:
        return hashlib.sha256(str_val.encode()).hexdigest()
    return value


# ---------------------------------------------------------------------------
# Core generation
# ---------------------------------------------------------------------------

def generate_row(
    columns: list[ColumnSpec],
    provider: LocaleProvider,
    rng: random.Random,
    np_rng: np.random.Generator,
    edge_cases: bool,
    row_idx: int,
) -> dict[str, Any]:
    row: dict[str, Any] = {}

    # Store names so email can reference them
    name_cache: dict[str, str] = {}

    for col in columns:
        # Edge-case injection: ~5% of rows get an edge value when enabled
        if edge_cases and rng.random() < 0.05:
            raw = _inject_edge(col, rng)
            row[col.name] = _apply_masking(raw, col.masking)
            continue

        # Null injection
        if col.nullable and rng.random() < col.null_rate:
            row[col.name] = None
            continue

        # Generate value
        t = col.type
        if t in (ColumnType.integer, ColumnType.int_alias):
            raw = _gen_integer(col, rng, np_rng)
        elif t == ColumnType.float_:
            raw = _gen_float(col, rng, np_rng)
        elif t == ColumnType.string:
            raw = _gen_string(col, rng)
        elif t == ColumnType.boolean:
            raw = _gen_boolean(rng)
        elif t == ColumnType.date:
            raw = _gen_date(col, rng)
        elif t == ColumnType.datetime:
            raw = _gen_datetime(col, rng)
        elif t == ColumnType.category:
            raw = _gen_category(col, rng)
        elif t == ColumnType.uuid:
            raw = _gen_uuid(rng)
        elif t == ColumnType.currency:
            raw = _gen_currency(col, rng)
        elif t == ColumnType.cnic:
            raw = _gen_cnic(rng)
        elif t == ColumnType.country:
            raw = _gen_country(rng)
        elif t == ColumnType.iban:
            raw = _gen_iban(rng)
        elif t == ColumnType.name:
            raw = provider.name()
            name_cache[col.name] = raw
        elif t == ColumnType.email:
            # Try to link to a name column for realism
            linked_name = next(iter(name_cache.values()), None)
            raw = provider.email(linked_name)
        elif t == ColumnType.phone:
            raw = provider.phone()
        elif t == ColumnType.address:
            raw = provider.address()
        elif t == ColumnType.city:
            raw = provider.city()
        elif t == ColumnType.company:
            raw = provider.company()
        else:
            raw = _gen_string(col, rng)

        row[col.name] = _apply_masking(raw, col.masking)

    return row


def generate_tabular(req: GenerateRequest, limit: int | None = None) -> dict:
    """
    Main entrypoint. Returns a dict matching GenerateResponse shape.
    `limit` caps the number of rows returned (for preview); total_rows
    always reflects row_count.
    """
    rng = random.Random(req.seed)
    np_rng = np.random.default_rng(req.seed)
    provider = LocaleProvider(req.locale, rng, np_rng)

    total = req.row_count
    n = min(limit, total) if limit is not None else total

    rows = [
        generate_row(req.columns, provider, rng, np_rng, req.edge_cases, i)
        for i in range(n)
    ]

    return {
        "columns": [c.name for c in req.columns],
        "rows": rows,
        "returned_rows": len(rows),
        "total_rows": total,
        "seed": req.seed,
        "locale": req.locale,
    }

# Synthara — Synthetic Data Platform

> Realistic, privacy-safe tabular, relational, and document data — generated on demand.  
> Built for HackDataV2 by **Team Prompt3**.

---

## What it does

Synthara is a local-first workspace where developers, QA engineers, and data teams generate synthetic data without touching real records.

| Feature | Status |
|---|---|
| Tabular data generation (all column types) | ✅ Tier A |
| Live preview (seeded, deterministic) | ✅ Tier A |
| CSV / JSON export | ✅ Tier A |
| CSV schema inference (local, no AI) | ✅ Tier A |
| PII detection warnings | ✅ Tier A |
| Column masking & hashing | ✅ Tier A |
| 6 built-in presets | ✅ Tier A |
| Edge-case injection | ✅ Tier A |
| Validation report (7 checks) | ✅ Tier A |
| Pakistan locale (names, phones, cities, PKR) | ✅ Tier A |
| Invoice generation with HTML output | ✅ Tier A |
| Relational engine + SQL dump | 🔜 Tier B |
| Bank statements | 🔜 Tier B |

---

## Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, middleware, error handlers
│   ├── models/schemas.py    # Pydantic v2 — all request/response types
│   ├── routers/
│   │   ├── generate.py      # POST /api/generate/tabular|invoice
│   │   ├── export.py        # POST /api/export/tabular
│   │   ├── infer.py         # POST /api/infer-schema
│   │   ├── validate.py      # POST /api/validate
│   │   └── metadata.py      # GET /api/locales, /api/presets
│   ├── engine/
│   │   ├── tabular.py       # Core generation engine
│   │   ├── invoice.py       # Invoice + Jinja2 HTML
│   │   ├── inference.py     # Local schema inference (pandas)
│   │   └── validation.py    # 7-check validation suite
│   └── data/
│       └── pakistan.py      # Curated PK names, cities, phones, companies
├── tests/test_backend.py    # Pytest suite (determinism, nulls, totals, PII…)
└── requirements.txt
```

---

## Quick Start — Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Copy env template
copy .env.example .env

# Start the server
uvicorn app.main:app --reload --port 8000
```

API is live at **http://localhost:8000**  
Interactive docs at **http://localhost:8000/docs**

---

## API Reference

Base URL: `http://localhost:8000`  
CORS allowed origin: `http://localhost:5173` (Vite dev server)

### Error envelope (all errors)
```json
{ "error": { "code": "STRING", "message": "Human-readable", "details": {} } }
```

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/locales` | GET | Supported locales |
| `/api/presets` | GET | Built-in schema presets |
| `/api/generate/tabular?limit=20` | POST | Preview rows (seeded) |
| `/api/export/tabular?format=csv` | POST | Full export download |
| `/api/infer-schema` | POST (multipart) | CSV → ColumnSpec array |
| `/api/validate` | POST | Statistical validation report |
| `/api/generate/invoice` | POST | Synthetic invoice + HTML |

Full interactive docs: `/docs`

---

## Running Tests

```bash
cd backend
.venv\Scripts\activate
pytest
```

Tests cover: seed determinism · null rate accuracy · invoice total reconciliation · masking · schema inference · all column types · validation suite.

---

## Design decisions

**Offline-first**: Schema inference uses pandas + rule-based detection — no LLM, no network. All Pakistan locale data is bundled in `app/data/pakistan.py`.

**Seeded determinism**: Every generation call uses `random.Random(seed)` + `numpy.random.default_rng(seed)`. Same seed → identical rows, every time. This is the preview contract the frontend relies on.

**Privacy by architecture**: Masking and hashing happen in the engine before rows are returned. The original value never appears in the response when masking is enabled.

**Invoice reconciliation**: `subtotal → tax_amount → total` are always computed arithmetically. The HTML template receives the computed values — no floating-point discrepancy possible.

---

## Team

**Team Prompt3** — HackDataV2

# Synthara — Synthetic Data Platform

> Realistic, privacy-safe tabular, relational, and document data — generated on demand.  
> Built for HackDataV2 by **Team Prompt3**.

---

## What it does

Synthara is a local-first workspace where developers, QA engineers, and data teams generate synthetic data without touching real records.

| Feature | Status |
|---|---|
| Tabular data generation (18 column types) | ✅ Live |
| Live preview (seeded, deterministic, 50-row cap) | ✅ Live |
| CSV / JSON export (full dataset) | ✅ Live |
| 6 built-in schema presets | ✅ Live |
| Edge-case injection (boundary values, nulls) | ✅ Live |
| Validation report (7 statistical checks) | ✅ Live |
| Pakistan locale (names, phones, cities, CNICs, PKR) | ✅ Live |
| CSV schema inference (local, no AI) | ✅ Live |
| PII detection warnings | ✅ Live |
| Column masking & hashing | ✅ Live |
| Invoice generation with HTML output | ✅ Live |
| **Relational engine** (3 multi-table schemas + FK integrity) | ✅ Live |
| **Bank statement generator** (running balance, merchant data) | ✅ Live |
| **AI schema from prompt** (Gemini-powered) | ✅ Live (requires `GEMINI_API_KEY`) |

---

## Architecture

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, middleware, error handlers
│   ├── models/schemas.py    # Pydantic v2 — all request/response types
│   ├── routers/
│   │   ├── generate.py      # POST /api/generate/tabular|invoice|relational|bank-statement
│   │   ├── export.py        # POST /api/export/tabular
│   │   ├── infer.py         # POST /api/infer-schema
│   │   ├── validate.py      # POST /api/validate
│   │   ├── ai.py            # POST /api/ai/schema-from-prompt (Gemini)
│   │   └── metadata.py      # GET /api/locales, /api/presets
│   ├── engine/
│   │   ├── tabular.py       # Core generation engine (18 column types)
│   │   ├── invoice.py       # Invoice + Jinja2 HTML
│   │   ├── relational.py    # Multi-table relational generator (FK integrity)
│   │   ├── bank_statement.py # Bank statement + HTML layout
│   │   ├── inference.py     # Local schema inference (pandas)
│   │   └── validation.py    # 7-check validation suite
│   └── data/
│       └── pakistan.py      # Curated PK names, cities, phones, companies
├── tests/test_backend.py    # Pytest suite (determinism, nulls, totals, PII...)
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

# Copy env template and set your Gemini API key (for AI features)
copy .env.example .env

# Start the server
uvicorn app.main:app --reload --port 8000
```

API is live at **http://localhost:8000**  
Interactive docs at **http://localhost:8000/docs**

---

## Quick Start — Frontend

```bash
cd frontend
npm install
npm run dev
```

App is live at **http://localhost:5173**

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
| `/api/infer-schema` | POST (multipart) | CSV to ColumnSpec array |
| `/api/validate` | POST | Statistical validation report |
| `/api/generate/invoice` | POST | Synthetic invoice + HTML |
| `/api/generate/relational` | POST | Multi-table relational dataset |
| `/api/generate/relational/schemas` | GET | Available relational schemas |
| `/api/generate/bank-statement` | POST | Synthetic bank statement + HTML |
| `/api/ai/schema-from-prompt` | POST | Natural language to column schema (Gemini AI) |

Full interactive docs: `/docs`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Enables AI schema generation. Get one at https://aistudio.google.com |

---

## Running Tests

```bash
cd backend
.venv\Scripts\activate
pytest
```

Tests cover: seed determinism, null rate accuracy, invoice total reconciliation, masking, schema inference, all column types, validation suite.

---

## Design decisions

**Offline-first**: Schema inference uses pandas + rule-based detection — no LLM, no network. All Pakistan locale data is bundled in `app/data/pakistan.py`.

**Seeded determinism**: Every generation call uses `random.Random(seed)` + `numpy.random.default_rng(seed)`. Same seed gives identical rows, every time. This is the preview contract the frontend relies on.

**Privacy by architecture**: Masking and hashing happen in the engine before rows are returned. The original value never appears in the response when masking is enabled.

**Invoice reconciliation**: `subtotal -> tax_amount -> total` are always computed arithmetically. The HTML template receives the computed values — no floating-point discrepancy possible.

**Relational integrity**: The relational engine generates parent tables first, then uses FK pool sampling to guarantee every child record references a valid parent ID.

**AI graceful degradation**: The `/api/ai/schema-from-prompt` endpoint returns a clear `503 AI_NOT_CONFIGURED` when `GEMINI_API_KEY` is absent — the rest of the app continues to work without it.

---

## Team

**Team Prompt3** — HackDataV2

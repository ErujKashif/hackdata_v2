<div align="center">

# Synthara
### Synthetic Data Platform — v2.0

**Generate realistic, privacy-safe data on demand.**  
Tabular · Relational · Invoices · Bank Statements · AI-Powered Schema Design

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Gemini_2.0_Flash-AI-4285F4?style=flat&logo=google&logoColor=white)](https://aistudio.google.com)

</div>

---

## Overview

Synthara is a local-first synthetic data workspace built for developers, QA engineers, and data scientists who need realistic test data — without touching real personal records.

Real data in test environments creates **privacy risk**, **compliance burden** (GDPR, Pakistan's PDPA), and **coordination overhead**. Synthara removes all of that: describe what you need, generate it instantly, export it.

Everything runs on your machine. Nothing leaves it unless you explicitly hit the AI endpoint.

---

## Features

| Module | What it generates | Status |
|---|---|:---:|
| **Tabular Studio** | Seeded, deterministic rows across 18 column types | ✅ |
| **Relational Engine** | Multi-table datasets with guaranteed FK integrity | ✅ |
| **Invoice Studio** | Print-ready HTML invoices with reconciling totals | ✅ |
| **Bank Statement** | Monthly statements with running balance & PK merchant data | ✅ |
| **CSV Inference** | Upload CSV → infer ColumnSpec + PII detection (local, no AI) | ✅ |
| **Validation Suite** | 7 automated statistical checks on any schema | ✅ |
| **AI Schema Generator** | Describe a table in English → Gemini designs the schema | ✅ `GEMINI_API_KEY` |

### Why Pakistan-native?

Synthara ships with a curated data pool for the `pk_PK` locale — no third-party locale library is involved:

- Authentic Pakistani first/last names (male & female pools)
- 30+ cities including tier-2 cities
- Correct CNIC format: `XXXXX-XXXXXXX-X`
- Pakistani IBAN format: `PK{check}{bank_code}{16 digits}` (HBL, MCB, UBL, Bank Alfalah)
- Pakistani phone format: `03XX-XXXXXXX`
- PKR currency ranges and Pakistani company names

---

## Tech Stack

**Backend** — Python 3.11 · FastAPI · Pydantic v2 · Pandas · NumPy · Faker · Jinja2 · google-genai

**Frontend** — React 19 · TypeScript 6 · Vite 8 · Vanilla CSS · lucide-react

**Deployment** — Render (Web Service + Static Site) · GitHub (CI/CD via render.yaml)

---

## Getting Started

### Prerequisites

| Tool | Minimum version |
|---|---|
| Python | 3.11 |
| Node.js | 18 |
| npm | 9 |

---

### 1 · Clone

```bash
git clone https://github.com/ErujKashif/hackdata_v2.git
cd hackdata_v2
```

---

### 2 · Backend

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env            # macOS / Linux
# copy .env.example .env        # Windows
```

Open `backend/.env` and add your Gemini API key to enable AI features:

```env
GEMINI_API_KEY=AIzaSy...        # paste your key here
```

> Get a free key at **[aistudio.google.com](https://aistudio.google.com)** — no billing required.  
> The rest of the app works fully without it.

```bash
# Start the server
uvicorn app.main:app --reload --port 8000
```

Backend is live at → **http://localhost:8000**  
Interactive API docs → **http://localhost:8000/docs**

---

### 3 · Frontend

Open a **new terminal** (keep the backend running):

```bash
cd frontend
npm install
npm run dev
```

App is live at → **http://localhost:5173**

---

### 4 · Verify

```bash
# Quick health check
curl http://localhost:8000/api/health
# → {"status":"ok"}
```

Open **http://localhost:5173**, click through each tab — Tabular, Relational, Invoice, Bank Statement, CSV Infer, Validate, AI Schema.

---

## Project Structure

```
.
├── backend/
│   ├── .env.example                   ← copy to .env, add your key
│   ├── requirements.txt
│   └── app/
│       ├── main.py                    ← FastAPI app + middleware + error handlers
│       ├── models/schemas.py          ← all Pydantic v2 models
│       ├── routers/
│       │   ├── generate.py            ← tabular / invoice / relational / bank-statement
│       │   ├── export.py              ← CSV + JSON download
│       │   ├── infer.py               ← CSV schema inference
│       │   ├── validate.py            ← 7-check validation suite
│       │   ├── ai.py                  ← Gemini AI schema generation
│       │   └── metadata.py            ← locales + presets
│       ├── engine/
│       │   ├── tabular.py             ← 18 column types, seeding, masking, edge cases
│       │   ├── invoice.py             ← invoice math + Jinja2 HTML
│       │   ├── relational.py          ← multi-table FK integrity
│       │   ├── bank_statement.py      ← running balance + PK merchants
│       │   ├── inference.py           ← pandas profiling + PII detection
│       │   └── validation.py          ← statistical test suite
│       └── data/
│           └── pakistan.py            ← curated PK names, cities, phones, banks
│
├── frontend/
│   └── src/
│       ├── App.tsx                    ← root component + global state
│       ├── components/                ← one file per studio / panel
│       ├── services/api.ts            ← all fetch calls
│       ├── types/api.ts               ← TypeScript interfaces
│       └── index.css                  ← full design system
│
├── render.yaml                        ← one-click Render deployment blueprint
└── README.md
```

---

## API Reference

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/locales` | Available locales |
| `GET` | `/api/presets` | 6 built-in schema presets |
| `POST` | `/api/generate/tabular?limit=N` | Generate N preview rows |
| `POST` | `/api/export/tabular?format=csv\|json` | Download full dataset |
| `POST` | `/api/infer-schema` | CSV upload → ColumnSpec + PII warnings |
| `POST` | `/api/validate` | Run 7 statistical checks |
| `POST` | `/api/generate/invoice` | Synthetic invoice + HTML |
| `GET` | `/api/generate/relational/schemas` | List relational schemas |
| `POST` | `/api/generate/relational` | Multi-table relational dataset |
| `POST` | `/api/generate/bank-statement` | Bank statement + HTML |
| `POST` | `/api/ai/schema-from-prompt` | Natural language → schema *(requires key)* |

Full interactive docs with request/response examples: **`/docs`**

---

## Column Types

`uuid` · `int` · `float` · `currency` · `string` · `boolean` · `date` · `datetime` · `category` · `name` · `email` · `phone` · `address` · `city` · `country` · `company` · `cnic` · `iban`

---

## Running Tests

```bash
cd backend
.venv\Scripts\activate

pytest                  # all tests
pytest -v               # verbose
pytest --tb=short       # compact tracebacks
```

Test coverage: seed determinism · null rate accuracy · invoice total reconciliation · column masking · schema inference · all 18 column types · validation endpoint.

---

## Deployment

Synthara ships with a **[Render Blueprint](https://render.com/docs/blueprint-spec)** (`render.yaml`) that deploys both services in one click:

1. Fork this repository
2. Connect it to [Render](https://render.com)
3. Select **New Blueprint** → point at your fork
4. Add `GEMINI_API_KEY` as a secret environment variable in the Render dashboard
5. Done — both services deploy automatically on every push to `main`

---

## Environment Variables

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `GEMINI_API_KEY` | No | — | Enables AI Schema Generator. Get free at [aistudio.google.com](https://aistudio.google.com) |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | Comma-separated CORS origins |
| `APP_ENV` | No | `development` | `development` or `production` |

---

## Design Principles

**Offline-first.** Schema inference, tabular generation, relational engine, invoices, and bank statements all run fully locally. No data ever leaves your machine (except the optional Gemini API call, which receives only your text prompt — never your data).

**Seeded determinism.** `random.Random(seed)` + `numpy.random.default_rng(seed)` ensure identical output for identical inputs. Same seed → same dataset, every time, on any machine.

**Privacy by architecture.** Column masking and SHA-256 hashing are applied in the engine *before* rows are assembled into the API response. The raw value is never present in the output when masking is enabled.

**Referential integrity.** The relational engine generates parent tables first, then samples from the parent ID pool for every foreign key — zero orphaned records by construction.

**Graceful AI degradation.** If `GEMINI_API_KEY` is absent, the `/api/ai/schema-from-prompt` endpoint returns `503 AI_NOT_CONFIGURED` with a clear message. Every other feature continues to work normally.

---

## Built With

- **[FastAPI](https://fastapi.tiangolo.com)** — REST framework
- **[Pydantic v2](https://docs.pydantic.dev)** — data validation
- **[Pandas](https://pandas.pydata.org)** — CSV inference
- **[Faker](https://faker.readthedocs.io)** — non-PK locale fallback
- **[Jinja2](https://jinja.palletsprojects.com)** — HTML templating
- **[google-genai](https://ai.google.dev/gemini-api/docs)** — Gemini 2.0 Flash API
- **[React](https://react.dev)** — frontend UI
- **[Vite](https://vite.dev)** — frontend build tool

---

<div align="center">

**Team Prompt3** · HackDataV2 · 2026

</div>

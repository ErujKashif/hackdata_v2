import type {
  TabularRequest,
  TabularResponse,
  InferSchemaResponse,
  ValidationReport,
  LocaleOption,
  PresetSchema,
  InvoiceRequest,
  InvoiceResponse,
} from '../types/api'

const API_BASE = '/api'

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`)
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`)
  return res.json()
}

export async function fetchLocales(): Promise<{ locales: LocaleOption[] }> {
  const res = await fetch(`${API_BASE}/locales`)
  if (!res.ok) throw new Error(`Failed to fetch locales: ${res.statusText}`)
  return res.json()
}

export async function fetchPresets(): Promise<{ presets: PresetSchema[] }> {
  const res = await fetch(`${API_BASE}/presets`)
  if (!res.ok) throw new Error(`Failed to fetch presets: ${res.statusText}`)
  return res.json()
}

export async function generateTabular(
  request: TabularRequest,
  limit: number = 50
): Promise<TabularResponse> {
  const res = await fetch(`${API_BASE}/generate/tabular?limit=${limit}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData?.detail?.message || errorData?.error?.message || `Generation failed: ${res.statusText}`)
  }
  return res.json()
}

export async function inferSchemaFromFile(file: File): Promise<InferSchemaResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/infer-schema`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData?.detail?.message || errorData?.error?.message || `Schema inference failed: ${res.statusText}`)
  }
  return res.json()
}

export async function runValidation(request: TabularRequest): Promise<ValidationReport> {
  const res = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData?.detail?.message || errorData?.error?.message || `Validation failed: ${res.statusText}`)
  }
  return res.json()
}

export async function generateInvoice(request: InvoiceRequest): Promise<InvoiceResponse> {
  const res = await fetch(`${API_BASE}/generate/invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData?.detail?.message || errorData?.error?.message || `Invoice generation failed: ${res.statusText}`)
  }
  return res.json()
}

export function getExportUrl(format: 'csv' | 'json'): string {
  return `${API_BASE}/export/tabular?format=${format}`
}

export async function downloadExport(format: 'csv' | 'json', request: TabularRequest): Promise<Blob> {
  const res = await fetch(`${API_BASE}/export/tabular?format=${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData?.detail?.message || errorData?.error?.message || `Export failed: ${res.statusText}`)
  }
  return res.blob()
}

// ── Relational ────────────────────────────────────────────────────────────────

export interface RelationalSchema {
  id: string
  label: string
  description: string
  tables: string[]
}

export interface RelationalResult {
  schema_id: string
  seed: number
  locale: string
  tables: Record<string, Record<string, unknown>[]>
  summary: Record<string, { row_count: number; columns: string[] }>
}

export async function fetchRelationalSchemas(): Promise<{ schemas: RelationalSchema[] }> {
  const res = await fetch(`${API_BASE}/generate/relational/schemas`)
  if (!res.ok) throw new Error(`Failed to fetch schemas: ${res.statusText}`)
  return res.json()
}

export async function generateRelational(
  schemaId: string,
  rowCount: number,
  seed: number,
  locale: string
): Promise<RelationalResult> {
  const res = await fetch(`${API_BASE}/generate/relational`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schema_id: schemaId, row_count: rowCount, seed, locale }),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData?.detail?.message || `Relational generation failed: ${res.statusText}`)
  }
  return res.json()
}

// ── Bank Statement ─────────────────────────────────────────────────────────────

export interface BankStatementRequest {
  account_holder?: string
  account_number?: string
  bank_name?: string
  num_transactions?: number
  opening_balance?: number
  currency?: string
  month?: number
  year?: number
  locale?: string
  seed?: number
}

export interface BankStatementResult {
  account_holder: string
  account_number: string
  iban: string
  bank_name: string
  currency: string
  month: number
  year: number
  opening_balance: number
  closing_balance: number
  total_credits: number
  total_debits: number
  transaction_count: number
  transactions: Array<{
    date: string
    description: string
    category: string
    debit: number | null
    credit: number | null
    balance: number
  }>
  document_html: string
  seed: number
}

export async function generateBankStatement(
  request: BankStatementRequest
): Promise<BankStatementResult> {
  const res = await fetch(`${API_BASE}/generate/bank-statement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData?.detail?.message || `Bank statement generation failed: ${res.statusText}`)
  }
  return res.json()
}

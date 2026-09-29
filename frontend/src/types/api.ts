export type ColumnType =
  | 'int'
  | 'float'
  | 'string'
  | 'email'
  | 'name'
  | 'phone'
  | 'cnic'
  | 'address'
  | 'city'
  | 'country'
  | 'company'
  | 'date'
  | 'datetime'
  | 'category'
  | 'boolean'
  | 'uuid'
  | 'currency'
  | 'iban'

export type MaskingStrategy = 'none' | 'mask' | 'hash'

export interface ColumnParams {
  min?: number | null
  max?: number | null
  step?: number | null
  pattern?: string | null
  categories?: string[] | null
  weights?: number[] | null
  date_start?: string | null
  date_end?: string | null
  date_format?: string | null
  precision?: number | null
}

export interface ColumnSpec {
  id?: string
  name: string
  type: ColumnType
  params?: ColumnParams
  null_rate?: number
  masking?: MaskingStrategy
}

export interface EdgeCaseConfig {
  enabled?: boolean
  extreme_values?: boolean
  empty_strings?: boolean
  boundary_dates?: boolean
}

export interface TabularRequest {
  row_count: number
  columns: ColumnSpec[]
  locale?: string
  seed?: number | null
  edge_cases?: boolean | EdgeCaseConfig
}

// Matches backend GenerateResponse exactly
export interface TabularResponse {
  columns: string[]
  rows: Record<string, unknown>[]
  returned_rows: number
  total_rows: number
  seed: number
  locale: string
}

export interface PIIWarning {
  column: string
  rule: string
  detail: string
  sample_value?: string
}

// Matches backend InferSchemaResponse exactly
export interface InferSchemaResponse {
  columns: ColumnSpec[]
  sampled_rows: number
  warnings: string[]
  pii_warnings?: PIIWarning[]
}

export interface CheckResult {
  check?: string
  name?: string
  status: 'pass' | 'warn' | 'fail'
  detail?: string
  expected?: unknown
  actual?: unknown
  metric_value?: number | null
  threshold?: number | null
}

export interface ValidationReport {
  overall_status?: 'pass' | 'warn' | 'fail'
  checks: CheckResult[]
  total_checks?: number
  passed_checks?: number
  warned_checks?: number
  failed_checks?: number
  summary?: string
}

export interface LocaleOption {
  code: string
  label: string
}

export interface PresetSchema {
  id: string
  label: string
  description: string
  request: TabularRequest
}

export interface LineItem {
  description: string
  quantity?: number
  qty?: number
  unit_price?: number
  price?: number
}

export interface InvoiceRequest {
  locale?: string
  seed?: number | null
  company_name?: string
  sender_name?: string
  sender_address?: string
  sender_tax_id?: string
  client_name?: string
  recipient_name?: string
  recipient_address?: string
  currency?: string
  tax_rate?: number
  line_items?: LineItem[]
  items?: LineItem[]
}

export interface InvoiceResponse {
  invoice_number: string
  issue_date: string
  due_date?: string
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  company_name?: string
  client_name?: string
  sender?: {
    name: string
    address?: string
    tax_id?: string
  }
  recipient?: {
    name: string
    address?: string
  }
  line_items?: Array<{
    description: string
    qty: number
    price: number
    amount: number
  }>
  items?: Array<{
    description: string
    quantity: number
    unit_price: number
    amount: number
  }>
  document_html?: string
  html_document?: string
  seed?: number
}

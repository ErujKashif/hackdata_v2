import React, { useState } from 'react'
import { Sparkles, Wand2, ChevronRight, AlertCircle, CheckCircle2, Loader2, Copy, Check } from 'lucide-react'
import type { ColumnSpec } from '../types/api'
import { API_BASE } from '../services/api'

interface AISchemaColumn {
  name: string
  type: string
  nullable: boolean
  null_rate: number
  masking: string
  params: Record<string, unknown>
  reason: string
}

interface AISchemaResponse {
  columns: AISchemaColumn[]
  suggested_row_count: number
  summary: string
}

interface AIPromptStudioProps {
  onApplySchema: (columns: ColumnSpec[], rowCount: number) => void
  onNavigateToStudio: () => void
  locale: string
}

const EXAMPLE_PROMPTS = [
  'E-commerce orders table for a Pakistani marketplace with product details, buyer info, and payment status',
  'Hospital patient records with demographics, diagnosis codes, admission dates, and billing amounts',
  'Employee payroll table for a tech company with salary, tax deductions, and bank account details',
  'Real estate listings with property details, location in Pakistan, price, and agent contact info',
  'Student enrollment data for a university with course info, grades, and CNIC numbers',
]

export const AIPromptStudio: React.FC<AIPromptStudioProps> = ({
  onApplySchema,
  onNavigateToStudio,
  locale,
}) => {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AISchemaResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    setApplied(false)

    try {
      const res = await fetch(`${API_BASE}/ai/schema-from-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), locale }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg =
          errData?.detail?.message ||
          errData?.detail ||
          `AI request failed (${res.status})`
        throw new Error(msg)
      }

      const data: AISchemaResponse = await res.json()
      setResult(data)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!result) return
    const cols: ColumnSpec[] = result.columns.map((c) => ({
      name: c.name,
      type: c.type as ColumnSpec['type'],
      null_rate: c.null_rate,
      masking: c.masking as ColumnSpec['masking'],
      params: Object.keys(c.params).length > 0 ? c.params as ColumnSpec['params'] : undefined,
    }))
    onApplySchema(cols, result.suggested_row_count)
    setApplied(true)
    setTimeout(() => onNavigateToStudio(), 800)
  }

  const handleCopyReason = (idx: number, reason: string) => {
    navigator.clipboard.writeText(reason).catch(() => {})
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  return (
    <div className="ai-studio-container">
      {/* Header */}
      <div className="ai-studio-header">
        <div className="ai-studio-header-icon">
          <Sparkles size={22} />
        </div>
        <div>
          <h2 className="ai-studio-title">AI Schema Generator</h2>
          <p className="ai-studio-subtitle">
            Describe your table in plain English — Gemini will design the full schema for you
          </p>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="ai-prompt-card">
        <label className="ai-prompt-label" htmlFor="ai-prompt-input">
          <Wand2 size={14} />
          Describe your dataset
        </label>
        <textarea
          id="ai-prompt-input"
          className="ai-prompt-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. &quot;Generate a table of Pakistani customers with names, CNICs, bank accounts, transaction history and city locations&quot;"
          rows={4}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate()
          }}
        />
        <div className="ai-prompt-footer">
          <span className="ai-prompt-hint">Ctrl+Enter to generate</span>
          <button
            id="ai-generate-btn"
            className="btn-primary ai-generate-btn"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="spin" />
                Thinking…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate Schema
              </>
            )}
          </button>
        </div>
      </div>

      {/* Example prompts */}
      {!result && !loading && (
        <div className="ai-examples-section">
          <p className="ai-examples-label">Try an example:</p>
          <div className="ai-examples-list">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                className="ai-example-chip"
                onClick={() => setPrompt(ex)}
              >
                <ChevronRight size={12} />
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="ai-error-banner">
          <AlertCircle size={16} />
          <div>
            <strong>
              {error.includes('AI_NOT_CONFIGURED') || error.includes('disabled')
                ? 'AI Not Configured'
                : 'Generation Failed'}
            </strong>
            <p>{error}</p>
            {(error.includes('AI_NOT_CONFIGURED') || error.includes('disabled')) && (
              <p className="ai-error-hint">
                Set the <code>GEMINI_API_KEY</code> environment variable on the backend to enable AI features.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="ai-loading-card">
          <div className="ai-loading-icon">
            <Sparkles size={24} className="pulse-glow" />
          </div>
          <p className="ai-loading-text">Gemini is designing your schema…</p>
          <div className="ai-skeleton-rows">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="ai-skeleton-row" style={{ width: `${70 + i * 5}%` }} />
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="ai-result-section">
          {/* Summary */}
          <div className="ai-result-summary">
            <CheckCircle2 size={15} className="ai-success-icon" />
            <span>{result.summary}</span>
            <span className="ai-result-badge">{result.columns.length} columns · {result.suggested_row_count.toLocaleString()} rows</span>
          </div>

          {/* Column table */}
          <div className="ai-columns-table-wrapper">
            <table className="ai-columns-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Nullable</th>
                  <th>Masking</th>
                  <th>AI Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {result.columns.map((col, idx) => (
                  <tr key={idx}>
                    <td className="ai-col-num">{idx + 1}</td>
                    <td className="ai-col-name">{col.name}</td>
                    <td>
                      <span className="ai-type-badge">{col.type}</span>
                    </td>
                    <td>
                      {col.nullable ? (
                        <span className="ai-nullable-yes">yes {col.null_rate > 0 ? `(${(col.null_rate * 100).toFixed(0)}%)` : ''}</span>
                      ) : (
                        <span className="ai-nullable-no">no</span>
                      )}
                    </td>
                    <td>
                      <span className={`ai-masking-badge masking-${col.masking}`}>{col.masking}</span>
                    </td>
                    <td className="ai-col-reason">
                      <span>{col.reason}</span>
                      {col.reason && (
                        <button
                          className="ai-copy-btn"
                          onClick={() => handleCopyReason(idx, col.reason)}
                          title="Copy reason"
                        >
                          {copiedIndex === idx ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Apply CTA */}
          <div className="ai-apply-row">
            <button
              id="ai-apply-schema-btn"
              className={`btn-primary ai-apply-btn ${applied ? 'applied' : ''}`}
              onClick={handleApply}
              disabled={applied}
            >
              {applied ? (
                <>
                  <CheckCircle2 size={14} />
                  Applied! Switching to Tabular Studio…
                </>
              ) : (
                <>
                  <ChevronRight size={14} />
                  Apply Schema to Tabular Studio
                </>
              )}
            </button>
            <button
              className="btn-ghost"
              onClick={() => { setResult(null); setApplied(false) }}
            >
              Try another prompt
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

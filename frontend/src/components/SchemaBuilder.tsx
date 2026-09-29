import React, { useState } from 'react'
import {
  Plus,
  Trash2,
  Settings2,
  ChevronUp,
  Sparkles,
  Layers,
  Copy,
  Sliders,
  Shield,
} from 'lucide-react'
import type { ColumnSpec, ColumnType, MaskingStrategy, PresetSchema } from '../types/api'

interface SchemaBuilderProps {
  columns: ColumnSpec[]
  setColumns: React.Dispatch<React.SetStateAction<ColumnSpec[]>>
  rowCount: number
  setRowCount: (count: number) => void
  onGenerate: () => void
  loading: boolean
  presets: PresetSchema[]
  onSelectPreset: (preset: PresetSchema) => void
}

const COLUMN_TYPES: { type: ColumnType; label: string; group: string }[] = [
  { type: 'uuid', label: 'UUID v4', group: 'Identifiers' },
  { type: 'int', label: 'Integer (Range)', group: 'Numbers' },
  { type: 'float', label: 'Float (Decimal)', group: 'Numbers' },
  { type: 'currency', label: 'Currency Amount', group: 'Financial' },
  { type: 'iban', label: 'Bank IBAN', group: 'Financial' },
  { type: 'name', label: 'Full Name', group: 'Personal' },
  { type: 'email', label: 'Email Address', group: 'Personal' },
  { type: 'phone', label: 'Phone Number', group: 'Personal' },
  { type: 'cnic', label: 'National ID / CNIC', group: 'Personal' },
  { type: 'company', label: 'Company Name', group: 'Business' },
  { type: 'address', label: 'Street Address', group: 'Location' },
  { type: 'city', label: 'City', group: 'Location' },
  { type: 'country', label: 'Country', group: 'Location' },
  { type: 'date', label: 'Date (YYYY-MM-DD)', group: 'Temporal' },
  { type: 'datetime', label: 'Datetime (ISO-8601)', group: 'Temporal' },
  { type: 'category', label: 'Categorical List', group: 'General' },
  { type: 'boolean', label: 'Boolean (True/False)', group: 'General' },
  { type: 'string', label: 'Alphanumeric String', group: 'General' },
]

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({
  columns,
  setColumns,
  rowCount,
  setRowCount,
  onGenerate,
  loading,
  presets,
  onSelectPreset,
}) => {
  const [expandedColIndex, setExpandedColIndex] = useState<number | null>(null)

  const addColumn = () => {
    const newCol: ColumnSpec = {
      name: `col_${columns.length + 1}`,
      type: 'string',
      null_rate: 0.0,
      masking: 'none',
      params: {},
    }
    setColumns([...columns, newCol])
    setExpandedColIndex(columns.length)
  }

  const removeColumn = (idx: number) => {
    setColumns(columns.filter((_, i) => i !== idx))
    if (expandedColIndex === idx) setExpandedColIndex(null)
  }

  const duplicateColumn = (idx: number) => {
    const col = columns[idx]
    const dup: ColumnSpec = {
      ...col,
      name: `${col.name}_copy`,
      params: { ...col.params },
    }
    const newCols = [...columns]
    newCols.splice(idx + 1, 0, dup)
    setColumns(newCols)
  }

  const updateColumn = (idx: number, updates: Partial<ColumnSpec>) => {
    const newCols = [...columns]
    newCols[idx] = { ...newCols[idx], ...updates }
    setColumns(newCols)
  }

  const updateParams = (idx: number, updates: Record<string, unknown>) => {
    const newCols = [...columns]
    newCols[idx] = {
      ...newCols[idx],
      params: { ...newCols[idx].params, ...updates },
    }
    setColumns(newCols)
  }

  return (
    <aside className="panel-card" style={{ height: 'fit-content' }}>
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-area">
          <Layers size={18} style={{ color: 'var(--primary)' }} />
          <h2 className="panel-title">Schema Designer</h2>
          <span className="type-pill">{columns.length} columns</span>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={addColumn}
          id="btn-add-column"
          title="Add new column to schema"
        >
          <Plus size={14} />
          <span>Add Column</span>
        </button>
      </div>

      <div className="panel-body">
        {/* Presets Quick Strip */}
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-dim)',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
            }}
          >
            Quick Templates
          </div>
          <div className="preset-bar">
            {presets.map((preset) => (
              <button
                key={preset.id}
                className="preset-chip"
                onClick={() => onSelectPreset(preset)}
                title={preset.description}
              >
                <span>✨</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Row Count Slider & Direct Input */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sliders size={14} style={{ color: 'var(--primary)' }} />
              <label
                htmlFor="row-count-input"
                style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)' }}
              >
                Total Generation Volume
              </label>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--primary)',
                fontSize: '0.95rem',
              }}
            >
              {rowCount.toLocaleString()} rows
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="range"
              min="10"
              max="10000"
              step="50"
              value={rowCount}
              onChange={(e) => setRowCount(parseInt(e.target.value, 10))}
              style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <input
              id="row-count-input"
              type="number"
              min="1"
              max="50000"
              value={rowCount}
              onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{
                width: '80px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.25rem 0.5rem',
                color: 'var(--text-main)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                textAlign: 'right',
              }}
            />
          </div>
        </div>

        {/* Columns List */}
        <div style={{ maxHeight: '480px', overflowY: 'auto', paddingRight: '0.2rem' }}>
          {columns.map((col, idx) => {
            const isExpanded = expandedColIndex === idx

            return (
              <div
                key={idx}
                className={`column-item ${isExpanded ? 'expanded' : ''}`}
                id={`column-row-${idx}`}
              >
                {/* Main column summary row */}
                <div className="column-main-row">
                  <input
                    type="text"
                    className="column-input"
                    value={col.name}
                    onChange={(e) => updateColumn(idx, { name: e.target.value })}
                    placeholder="Column name..."
                    title="Column field name"
                  />

                  <select
                    className="column-select"
                    value={col.type}
                    onChange={(e) => updateColumn(idx, { type: e.target.value as ColumnType })}
                    title="Field generator type"
                  >
                    {COLUMN_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.label}
                      </option>
                    ))}
                  </select>

                  {/* Actions */}
                  <button
                    className="btn-ghost"
                    onClick={() => setExpandedColIndex(isExpanded ? null : idx)}
                    style={{ padding: '0.3rem' }}
                    title="Configure parameters & privacy masking"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <Settings2 size={16} />}
                  </button>

                  <button
                    className="btn-ghost"
                    onClick={() => duplicateColumn(idx)}
                    style={{ padding: '0.3rem' }}
                    title="Duplicate column"
                  >
                    <Copy size={14} />
                  </button>

                  <button
                    className="btn-danger-ghost"
                    onClick={() => removeColumn(idx)}
                    disabled={columns.length <= 1}
                    style={{ padding: '0.3rem' }}
                    title="Remove column"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Expanded Column Fine-Tuning Drawer */}
                {isExpanded && (
                  <div className="column-params-grid">
                    {/* Null Rate */}
                    <div className="param-field">
                      <label className="param-label">
                        Null Rate: {Math.round((col.null_rate || 0) * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={col.null_rate || 0}
                        onChange={(e) =>
                          updateColumn(idx, { null_rate: parseFloat(e.target.value) })
                        }
                        style={{ accentColor: 'var(--accent-amber)' }}
                      />
                    </div>

                    {/* Masking / Privacy */}
                    <div className="param-field">
                      <label className="param-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Shield size={12} style={{ color: 'var(--accent-emerald)' }} />
                        Privacy Masking
                      </label>
                      <select
                        className="param-input"
                        value={col.masking || 'none'}
                        onChange={(e) =>
                          updateColumn(idx, { masking: e.target.value as MaskingStrategy })
                        }
                      >
                        <option value="none">None (Real Mock)</option>
                        <option value="mask">Redacted (J*** D**)</option>
                        <option value="hash">SHA-256 Hash</option>
                      </select>
                    </div>

                    {/* Type specific parameters: Numbers */}
                    {(col.type === 'int' || col.type === 'float' || col.type === 'currency') && (
                      <>
                        <div className="param-field">
                          <label className="param-label">Min Bound</label>
                          <input
                            type="number"
                            className="param-input"
                            value={col.params?.min ?? ''}
                            onChange={(e) =>
                              updateParams(idx, {
                                min: e.target.value === '' ? null : parseFloat(e.target.value),
                              })
                            }
                            placeholder="Default (0)"
                          />
                        </div>
                        <div className="param-field">
                          <label className="param-label">Max Bound</label>
                          <input
                            type="number"
                            className="param-input"
                            value={col.params?.max ?? ''}
                            onChange={(e) =>
                              updateParams(idx, {
                                max: e.target.value === '' ? null : parseFloat(e.target.value),
                              })
                            }
                            placeholder="Default (1000)"
                          />
                        </div>
                      </>
                    )}

                    {/* Type specific: Categorical */}
                    {col.type === 'category' && (
                      <div className="param-field" style={{ gridColumn: 'span 2' }}>
                        <label className="param-label">Categories (Comma separated)</label>
                        <input
                          type="text"
                          className="param-input"
                          value={col.params?.categories?.join(', ') || ''}
                          onChange={(e) =>
                            updateParams(idx, {
                              categories: e.target.value.split(',').map((s) => s.trim()),
                            })
                          }
                          placeholder="Standard, Premium, Enterprise, Starter"
                        />
                      </div>
                    )}

                    {/* Type specific: Date range */}
                    {(col.type === 'date' || col.type === 'datetime') && (
                      <>
                        <div className="param-field">
                          <label className="param-label">Start Date</label>
                          <input
                            type="date"
                            className="param-input"
                            value={col.params?.date_start || ''}
                            onChange={(e) => updateParams(idx, { date_start: e.target.value })}
                          />
                        </div>
                        <div className="param-field">
                          <label className="param-label">End Date</label>
                          <input
                            type="date"
                            className="param-input"
                            value={col.params?.date_end || ''}
                            onChange={(e) => updateParams(idx, { date_end: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Generate Trigger Action */}
        <div style={{ marginTop: '1.25rem' }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
            onClick={onGenerate}
            disabled={loading || columns.length === 0}
            id="btn-generate-preview"
          >
            <Sparkles size={18} className={loading ? 'spin-animation' : ''} />
            <span>{loading ? 'Generating...' : 'Generate Preview'}</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

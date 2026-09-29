import React, { useState, useEffect } from 'react'
import {
  Share2,
  Download,
  RefreshCw,
  ChevronRight,
  Table2,
  Key,
  Layers,
  Dices,
} from 'lucide-react'
import {
  fetchRelationalSchemas,
  generateRelational,
  type RelationalSchema,
  type RelationalResult,
} from '../services/api'

interface RelationalStudioProps {
  locale: string
  seed: number
  onRandomizeSeed: () => void
}

const SCHEMA_ICONS: Record<string, string> = {
  ecommerce: '🛒',
  hr: '🏢',
  banking: '🏦',
}

export const RelationalStudio: React.FC<RelationalStudioProps> = ({ locale, seed, onRandomizeSeed }) => {
  const [schemas, setSchemas] = useState<RelationalSchema[]>([])
  const [selectedSchema, setSelectedSchema] = useState<string>('ecommerce')
  const [rowCount, setRowCount] = useState(20)
  const [result, setResult] = useState<RelationalResult | null>(null)
  const [activeTable, setActiveTable] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRelationalSchemas()
      .then(r => {
        setSchemas(r.schemas)
        if (r.schemas.length > 0) setSelectedSchema(r.schemas[0].id)
      })
      .catch(() => {
        // Fallback schemas if API not running
        setSchemas([
          { id: 'ecommerce', label: 'E-Commerce', description: 'Customers → Orders → Items', tables: ['customers', 'orders', 'order_items'] },
          { id: 'hr', label: 'HR System', description: 'Departments → Employees → Payroll', tables: ['departments', 'employees', 'payroll'] },
          { id: 'banking', label: 'Banking', description: 'Accounts → Transactions', tables: ['accounts', 'transactions'] },
        ])
      })
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await generateRelational(selectedSchema, rowCount, seed, locale)
      setResult(data)
      setActiveTable(Object.keys(data.tables)[0] || '')
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const downloadTable = (tableName: string, format: 'csv' | 'json') => {
    if (!result) return
    const rows = result.tables[tableName]
    if (!rows || rows.length === 0) return

    let content: string
    let filename: string
    let mime: string

    if (format === 'json') {
      content = JSON.stringify(rows, null, 2)
      filename = `${selectedSchema}_${tableName}.json`
      mime = 'application/json'
    } else {
      const cols = Object.keys(rows[0])
      const header = cols.join(',')
      const lines = rows.map(row =>
        cols.map(c => {
          const v = row[c]
          if (v === null || v === undefined) return ''
          const s = String(v)
          return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
        }).join(',')
      )
      content = [header, ...lines].join('\n')
      filename = `${selectedSchema}_${tableName}.csv`
      mime = 'text/csv'
    }

    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }


  const activeRows = result?.tables[activeTable] ?? []
  const activeCols = activeRows.length > 0 ? Object.keys(activeRows[0]) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={22} style={{ color: 'var(--primary)' }} />
            Relational Data Studio
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '600px' }}>
            Generate multiple linked tables with foreign-key integrity maintained.
            Totals reconcile across parent/child tables. Export each table independently.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={onRandomizeSeed}
          title="Randomize seed"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Dices size={15} />
          <span>New Seed (#{seed})</span>
        </button>
      </div>

      {/* Config + Preview grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* Left: Config Panel */}
        <aside className="panel-card">
          <div className="panel-header">
            <div className="panel-title-area">
              <Layers size={17} style={{ color: 'var(--primary)' }} />
              <h3 className="panel-title">Schema Configuration</h3>
            </div>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Schema selector */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
                Relational Schema
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {schemas.map(schema => (
                  <button
                    key={schema.id}
                    onClick={() => setSelectedSchema(schema.id)}
                    style={{
                      background: selectedSchema === schema.id ? 'var(--primary-soft)' : 'var(--bg-surface)',
                      border: `1px solid ${selectedSchema === schema.id ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 0.9rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{SCHEMA_ICONS[schema.id] || '📊'}</span>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        color: selectedSchema === schema.id ? '#5eead4' : 'var(--text-main)',
                      }}>
                        {schema.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', paddingLeft: '1.6rem' }}>
                      {schema.description}
                    </div>
                    {schema.tables && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', paddingLeft: '1.6rem', marginTop: '0.4rem' }}>
                        {schema.tables.map((t, i) => (
                          <React.Fragment key={t}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>{t}</span>
                            {i < schema.tables.length - 1 && (
                              <ChevronRight size={10} style={{ color: 'var(--text-dim)', marginTop: '2px' }} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Row count */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Base Row Count
                </label>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem' }}>
                  {rowCount} rows
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={rowCount}
                onChange={e => setRowCount(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                Child tables will have proportionally more rows
              </p>
            </div>

            {/* FK Legend */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.75rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <Key size={12} style={{ color: 'var(--accent-amber)' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Integrity Guarantees
                </span>
              </div>
              <ul style={{ fontSize: '0.74rem', color: 'var(--text-muted)', paddingLeft: '0.9rem', lineHeight: 1.7 }}>
                <li>FK columns always reference valid PKs</li>
                <li>Order totals match summed line items</li>
                <li>Bank balances are sequential/running</li>
                <li>No orphaned child records</li>
              </ul>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
              onClick={handleGenerate}
              disabled={loading}
              id="btn-generate-relational"
            >
              {loading
                ? <><RefreshCw size={16} className="spin-animation" /><span>Generating...</span></>
                : <><Share2 size={16} /><span>Generate Relational Dataset</span></>
              }
            </button>
          </div>
        </aside>

        {/* Right: Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {error && (
            <div style={{ background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.3)', borderRadius: 'var(--radius-lg)', padding: '1rem', color: '#fb7185' }}>
              {error}
            </div>
          )}

          {!result && !loading && (
            <div className="panel-card" style={{ minHeight: '500px', alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
              <Share2 size={52} style={{ color: 'var(--border-medium)' }} />
              <div>
                <h3 style={{ marginBottom: '0.35rem' }}>No Relational Data Yet</h3>
                <p style={{ fontSize: '0.85rem', maxWidth: '360px' }}>Select a schema and click Generate to create linked tables with referential integrity.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="panel-card" style={{ minHeight: '400px', alignItems: 'center', justifyContent: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <RefreshCw size={36} className="spin-animation" style={{ color: 'var(--primary)' }} />
              <p style={{ color: 'var(--text-muted)' }}>Building relational dataset with FK integrity...</p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Summary cards */}
              <div className="stat-grid" style={{ gridTemplateColumns: `repeat(${Object.keys(result.summary).length}, 1fr)` }}>
                {Object.entries(result.summary).map(([name, info]) => (
                  <div key={name} className="stat-card" style={{ cursor: 'pointer', border: activeTable === name ? '1px solid var(--primary)' : undefined, background: activeTable === name ? 'var(--primary-soft)' : undefined }}
                    onClick={() => setActiveTable(name)}>
                    <span className="stat-card-label">{name}</span>
                    <span className="stat-card-value" style={{ fontSize: '1.75rem' }}>{info.row_count.toLocaleString()}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{info.columns.length} columns</span>
                  </div>
                ))}
              </div>

              {/* Table tabs + data */}
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title-area">
                    <Table2 size={16} style={{ color: 'var(--primary)' }} />
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {Object.keys(result.tables).map(name => (
                        <button
                          key={name}
                          className={`nav-tab-btn ${activeTable === name ? 'active' : ''}`}
                          style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                          onClick={() => setActiveTable(name)}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => downloadTable(activeTable, 'csv')}>
                      <Download size={13} /><span>CSV</span>
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => downloadTable(activeTable, 'json')}>
                      <Download size={13} /><span>JSON</span>
                    </button>
                  </div>
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                  <div className="table-container" style={{ maxHeight: '420px', border: 'none', borderRadius: 0 }}>
                    <table className="synth-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                          {activeCols.map(col => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeRows.slice(0, 50).map((row, i) => (
                          <tr key={i}>
                            <td style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{i + 1}</td>
                            {activeCols.map(col => {
                              const val = row[col]
                              const isId = col.endsWith('_id')
                              const isNull = val === null || val === undefined
                              const isFk = isId && col !== activeCols[0]
                              return (
                                <td key={col}
                                  className={isNull ? 'table-null-cell' : ''}
                                  style={isFk ? { color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem' } : undefined}
                                  title={isNull ? 'null' : String(val)}
                                >
                                  {isNull ? 'null' : String(val).length > 28 ? String(val).slice(0, 26) + '…' : String(val)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {activeRows.length > 50 && (
                    <div style={{ padding: '0.6rem 1rem', fontSize: '0.75rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)' }}>
                      Showing 50 of {activeRows.length} rows — download CSV/JSON for full dataset
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

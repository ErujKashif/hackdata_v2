import React, { useState, useMemo } from 'react'
import {
  Download,
  Search,
  Copy,
  Check,
  Hash,
  Database,
  Eye,
  FileSpreadsheet,
} from 'lucide-react'
import type { TabularResponse } from '../types/api'

interface PreviewTableProps {
  response: TabularResponse | null
  loading: boolean
  onOpenExport: () => void
}

export const PreviewTable: React.FC<PreviewTableProps> = ({
  response,
  loading,
  onOpenExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedType, setCopiedType] = useState<'json' | 'csv' | null>(null)

  const filteredRows = useMemo(() => {
    if (!response || !response.rows) return []
    if (!searchQuery.trim()) return response.rows

    const q = searchQuery.toLowerCase()
    return response.rows.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
    )
  }, [response, searchQuery])

  const copyToClipboard = async (type: 'json' | 'csv') => {
    if (!response || !response.rows || !response.rows.length || !response.columns) return

    let content = ''
    if (type === 'json') {
      content = JSON.stringify(response.rows, null, 2)
    } else {
      const headers = response.columns.join(',')
      const lines = response.rows.map((row) =>
        response.columns
          .map((col) => {
            const val = row[col]
            if (val === null || val === undefined) return ''
            const str = String(val)
            return str.includes(',') || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str
          })
          .join(',')
      )
      content = [headers, ...lines].join('\n')
    }

    await navigator.clipboard.writeText(content)
    setCopiedType(type)
    setTimeout(() => setCopiedType(null), 2000)
  }

  return (
    <section className="panel-card" style={{ minHeight: '620px' }}>
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title-area">
          <Eye size={18} style={{ color: 'var(--primary)' }} />
          <h2 className="panel-title">Live Preview Table</h2>
          {response && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
              }}
            >
              Showing {filteredRows.length} of {response.returned_rows} preview rows
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Quick Copy Buttons */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => copyToClipboard('json')}
            disabled={!response || !response.rows.length}
            title="Copy preview as JSON"
          >
            {copiedType === 'json' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>JSON</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => copyToClipboard('csv')}
            disabled={!response || !response.rows.length}
            title="Copy preview as CSV text"
          >
            {copiedType === 'csv' ? <Check size={14} color="#10b981" /> : <FileSpreadsheet size={14} />}
            <span>CSV</span>
          </button>

          {/* Export Dataset Button */}
          <button
            className="btn btn-primary btn-sm"
            onClick={onOpenExport}
            disabled={!response}
            id="btn-open-export"
            title="Export full dataset to CSV/JSON"
          >
            <Download size={14} />
            <span>Export Full Data</span>
          </button>
        </div>
      </div>

      <div className="panel-body">
        {/* Search & Metadata Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Input */}
          <div
            style={{
              position: 'relative',
              flex: '1',
              maxWidth: '380px',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-dim)',
              }}
            />
            <input
              type="text"
              placeholder="Search across preview records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!response}
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.45rem 0.75rem 0.45rem 2rem',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Performance & Seed Badges */}
          {response && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                className="badge"
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  color: '#38bdf8',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                }}
              >
                <Hash size={13} />
                <span>Seed #{response.seed}</span>
              </div>

              <div
                className="badge"
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <Database size={13} />
                <span>Total: {response.total_rows.toLocaleString()}</span>
              </div>

              <div
                className="badge"
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                }}
              >
                <span>{response.locale}</span>
              </div>
            </div>
          )}
        </div>

        {/* Table Viewport */}
        {loading ? (
          <div
            style={{
              height: '460px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              color: 'var(--text-muted)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid var(--border-subtle)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ fontSize: '0.9rem' }}>Generating rows...</p>
          </div>
        ) : !response || !response.rows || !response.columns || response.rows.length === 0 ? (
          <div
            style={{
              height: '460px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              textAlign: 'center',
              padding: '2rem',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(12, 18, 34, 0.4)',
            }}
          >
            <Database size={48} style={{ color: 'var(--border-medium)' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>No Dataset Generated Yet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '420px' }}>
                Select a schema template or customize fields on the left, then click{' '}
                <strong style={{ color: 'var(--primary)' }}>Generate Preview</strong> to see
                synthetic data.
              </p>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="synth-table">
              <thead>
                <tr>
                  <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                  {response.columns.map((colName) => (
                    <th key={colName}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{colName}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td
                      style={{
                        textAlign: 'center',
                        color: 'var(--text-dim)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                      }}
                    >
                      {rowIdx + 1}
                    </td>
                    {response.columns.map((colName) => {
                      const val = row[colName]

                      if (val === null || val === undefined) {
                        return (
                          <td key={colName} className="table-null-cell">
                            null
                          </td>
                        )
                      }

                      const valStr = String(val)
                      const isMasked = valStr.includes('***')

                      return (
                        <td
                          key={colName}
                          className={isMasked ? 'table-masked-cell' : ''}
                          title={valStr}
                        >
                          {valStr}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </section>
  )
}

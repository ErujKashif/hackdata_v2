import React, { useState } from 'react'
import { X, Download, FileSpreadsheet, FileJson, CheckCircle2 } from 'lucide-react'
import confetti from 'canvas-confetti'
import type { TabularRequest } from '../types/api'
import { downloadExport } from '../services/api'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  request: TabularRequest
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, request }) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [rowsToExport, setRowsToExport] = useState<number>(request.row_count || 1000)
  const [isExporting, setIsExporting] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleExport = async () => {
    setIsExporting(true)
    setSuccess(false)

    try {
      const exportReq: TabularRequest = {
        ...request,
        row_count: rowsToExport,
      }

      const blob = await downloadExport(format, exportReq)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `synthara_export_${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccess(true)
      // Confetti burst on successful synthetic export!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#06b6d4', '#10b981', '#a855f7'],
      })

      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1500)
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="panel-header">
          <div className="panel-title-area">
            <Download size={18} style={{ color: 'var(--primary)' }} />
            <h3 className="panel-title">Export Synthetic Dataset</h3>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '0.2rem' }}>
            <X size={18} />
          </button>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Format Selection */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
              }}
            >
              Export Format
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFormat('csv')}
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  borderColor: format === 'csv' ? 'var(--primary)' : 'var(--border-subtle)',
                  background: format === 'csv' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface)',
                  color: format === 'csv' ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                <FileSpreadsheet size={24} style={{ color: '#10b981' }} />
                <span style={{ fontWeight: 700 }}>Comma Separated (.csv)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Standard tabular export for Excel / Pandas
                </span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFormat('json')}
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  borderColor: format === 'json' ? 'var(--primary)' : 'var(--border-subtle)',
                  background: format === 'json' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface)',
                  color: format === 'json' ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                <FileJson size={24} style={{ color: '#06b6d4' }} />
                <span style={{ fontWeight: 700 }}>JSON Array (.json)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Structured JSON payload for API testing
                </span>
              </button>
            </div>
          </div>

          {/* Row Volume */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <label
                style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)' }}
              >
                Rows to Generate & Stream
              </label>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                }}
              >
                {rowsToExport.toLocaleString()} rows
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {[100, 1000, 5000, 10000].map((num) => (
                <button
                  key={num}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    flex: 1,
                    background: rowsToExport === num ? 'var(--bg-hover)' : 'var(--bg-surface)',
                    borderColor: rowsToExport === num ? 'var(--primary)' : 'var(--border-subtle)',
                  }}
                  onClick={() => setRowsToExport(num)}
                >
                  {num.toLocaleString()}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="50"
              max="25000"
              step="100"
              value={rowsToExport}
              onChange={(e) => setRowsToExport(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
          </div>

          {/* Export Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={isExporting}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleExport}
              disabled={isExporting}
              id="btn-confirm-export"
            >
              {success ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Export Downloaded!</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>{isExporting ? 'Streaming Export...' : `Download ${format.toUpperCase()}`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

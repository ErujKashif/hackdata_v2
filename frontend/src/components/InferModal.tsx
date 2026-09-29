import React, { useState } from 'react'
import {
  UploadCloud,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import type { ColumnSpec, InferSchemaResponse } from '../types/api'
import { inferSchemaFromFile } from '../services/api'

interface InferModalProps {
  onApplySchema: (columns: ColumnSpec[], inferredCount: number) => void
  onNavigateToStudio: () => void
}

export const InferModal: React.FC<InferModalProps> = ({
  onApplySchema,
  onNavigateToStudio,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<InferSchemaResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file')
      return
    }

    setFile(selectedFile)
    setError(null)
    setLoading(true)

    try {
      const response = await inferSchemaFromFile(selectedFile)
      setResult(response)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to infer schema from file')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const applyAndGo = () => {
    if (!result) return
    onApplySchema(result.columns, result.sampled_rows)
    onNavigateToStudio()
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Intro Header */}
      <div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>
          CSV Schema Inference & PII Auditor
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Upload any existing production or sample CSV. Synthara inspects headers and row samples
          locally using high-speed heuristics, detects personal identifiable data (PII), and
          constructs a synthetic-ready blueprint.
        </p>
      </div>

      {/* Dropzone */}
      <div
        className={`dropzone ${isDragOver ? 'active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.csv'
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files && files.length > 0) handleFile(files[0])
          }
          input.click()
        }}
      >
        <UploadCloud
          size={48}
          style={{ color: isDragOver ? 'var(--primary)' : 'var(--text-dim)', margin: '0 auto 1rem' }}
        />
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>
          {file ? file.name : 'Drag and drop your CSV here'}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Supports CSV files up to 5 MB • Analyzed 100% locally with zero cloud leakage
        </p>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '2rem' }}>
          <Loader2 size={24} className="spin-animation" style={{ color: 'var(--primary)' }} />
          <span>Analyzing column signatures, distributions, and PII footprints...</span>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            color: '#fb7185',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title-area">
              <FileCheck size={18} style={{ color: '#10b981' }} />
              <h3 className="panel-title">Inferred Schema Blueprint</h3>
              <span className="type-pill">
                {result.columns.length} columns • ~{result.sampled_rows} sample rows
              </span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={applyAndGo}>
              <span>Load Into Tabular Studio</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="panel-body">
            {/* PII Warnings Banner */}
            {result.warnings && result.warnings.length > 0 && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', marginBottom: '0.5rem' }}>
                  <ShieldAlert size={18} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    PII Risk Detected in Uploaded Dataset
                  </span>
                </div>
                <p style={{ color: '#fde68a', fontSize: '0.825rem', marginBottom: '0.5rem' }}>
                  The uploaded file contains columns that resemble sensitive personally identifiable information.
                  Synthara has flagged these columns so you can replace them with zero-leakage synthetic equivalents:
                </p>
                <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {result.warnings.map((warn, i) => (
                    <li key={i} style={{ marginBottom: '0.2rem' }}>
                      {warn}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inferred Columns Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
              {result.columns.map((col, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-contrast)' }}>
                      {col.name}
                    </span>
                    <span className="type-pill">{col.type}</span>
                  </div>

                  {col.null_rate !== undefined && col.null_rate > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)' }}>
                      Null rate: {Math.round(col.null_rate * 100)}%
                    </span>
                  )}

                  {col.params?.categories && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Values: {col.params.categories.slice(0, 4).join(', ')}...
                    </span>
                  )}

                  {col.params?.min !== undefined && col.params?.max !== undefined && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Range: [{col.params.min} → {col.params.max}]
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={applyAndGo}>
                <CheckCircle size={16} />
                <span>Confirm & Open In Tabular Studio</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

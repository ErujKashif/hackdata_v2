import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Gauge,
} from 'lucide-react'
import type { TabularRequest, ValidationReport } from '../types/api'
import { runValidation } from '../services/api'

interface ValidationViewProps {
  request: TabularRequest
}

export const ValidationView: React.FC<ValidationViewProps> = ({ request }) => {
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeValidation = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await runValidation(request)
      setReport(res)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to execute validation suite')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    executeValidation()
  }, [])

  const getStatusIcon = (status: 'pass' | 'warn' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle size={18} style={{ color: '#10b981' }} />
      case 'warn':
        return <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
      case 'fail':
        return <XCircle size={18} style={{ color: '#f43f5e' }} />
    }
  }

  const getStatusBadge = (status: 'pass' | 'warn' | 'fail') => {
    switch (status) {
      case 'pass':
        return <span className="badge badge-pass">PASSED</span>
      case 'warn':
        return <span className="badge badge-warn">WARNING</span>
      case 'fail':
        return <span className="badge badge-fail">FAILED</span>
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* View Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>
            Data Quality & Privacy Validation Suite
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Synthara runs 7 rigorous automated statistical tests ensuring determinism, null calibration,
            range conformance, and zero-leakage privacy guarantees.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={executeValidation}
          disabled={loading}
          id="btn-rerun-validation"
        >
          <RefreshCw size={14} className={loading ? 'spin-animation' : ''} />
          <span>{loading ? 'Evaluating...' : 'Re-Run Suite'}</span>
        </button>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            color: '#fb7185',
          }}
        >
          {error}
        </div>
      )}

      {/* Metrics Banner */}
      {report && (() => {
        const overallStatus = report.overall_status || (report.checks.some(c => c.status === 'fail') ? 'fail' : report.checks.some(c => c.status === 'warn') ? 'warn' : 'pass')
        const totalChecks = report.total_checks ?? report.checks.length
        const passedChecks = report.passed_checks ?? report.checks.filter(c => c.status === 'pass').length
        const warnedChecks = report.warned_checks ?? report.checks.filter(c => c.status === 'warn').length
        const failedChecks = report.failed_checks ?? report.checks.filter(c => c.status === 'fail').length

        return (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-card-label">Overall Readiness</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <span className="stat-card-value">
                    {overallStatus.toUpperCase()}
                  </span>
                  {getStatusBadge(overallStatus)}
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-card-label">Checks Passed</span>
                <span className="stat-card-value" style={{ color: '#10b981' }}>
                  {passedChecks} / {totalChecks}
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-card-label">Warnings</span>
                <span className="stat-card-value" style={{ color: '#f59e0b' }}>
                  {warnedChecks}
                </span>
              </div>

              <div className="stat-card">
                <span className="stat-card-label">Critical Failures</span>
                <span className="stat-card-value" style={{ color: '#f43f5e' }}>
                  {failedChecks}
                </span>
              </div>
            </div>

            {/* Validation Checks List */}
            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-title-area">
                  <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
                  <h3 className="panel-title">Audit Log & Verification Details</h3>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {report.summary || (failedChecks === 0 ? 'All validation checks passing cleanly' : 'Action required')}
                </span>
              </div>

              <div className="panel-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {report.checks.map((check, idx) => {
                    const checkTitle = check.name || check.check || `Verification Check #${idx + 1}`
                    const checkDetail = check.detail || (check.actual !== undefined ? `Actual: ${check.actual} (Expected: ${check.expected})` : 'Check passed')

                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '1.1rem 1.25rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                          <div style={{ marginTop: '0.15rem' }}>{getStatusIcon(check.status)}</div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-contrast)' }}>
                                {checkTitle}
                              </span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                              {checkDetail}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                          {getStatusBadge(check.status)}
                          {check.metric_value !== undefined && check.metric_value !== null && (
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                color: 'var(--text-dim)',
                              }}
                            >
                              Val: {check.metric_value} {check.threshold ? `(Thresh: ${check.threshold})` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )
      })()}

      {loading && !report && (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <Gauge size={36} className="spin-animation" style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Executing mathematical and privacy audits...</p>
        </div>
      )}
    </div>
  )
}

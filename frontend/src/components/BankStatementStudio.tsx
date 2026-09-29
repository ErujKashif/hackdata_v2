import React, { useState } from 'react'
import { Landmark, Download, Printer, RefreshCw, Dices } from 'lucide-react'
import { generateBankStatement, type BankStatementResult } from '../services/api'

interface BankStatementStudioProps {
  locale: string
  seed: number
  onRandomizeSeed: () => void
}

const BANKS = [
  'HBL – Habib Bank Limited',
  'MCB Bank Limited',
  'UBL – United Bank Limited',
  'Bank Alfalah',
  'Meezan Bank',
  'Allied Bank Limited',
  'Standard Chartered Pakistan',
  'Faysal Bank',
]

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export const BankStatementStudio: React.FC<BankStatementStudioProps> = ({ locale, seed, onRandomizeSeed }) => {
  const [accountHolder, setAccountHolder] = useState('')
  const [bankName, setBankName] = useState(BANKS[0])
  const [numTransactions, setNumTransactions] = useState(20)
  const [openingBalance, setOpeningBalance] = useState(75000)
  const [currency, setCurrency] = useState('PKR')
  const [month, setMonth] = useState(9)
  const [year, setYear] = useState(2025)

  const [result, setResult] = useState<BankStatementResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await generateBankStatement({
        account_holder: accountHolder,
        bank_name: bankName,
        num_transactions: numTransactions,
        opening_balance: openingBalance,
        currency,
        month,
        year,
        locale,
        seed,
      })
      setResult(data)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const downloadHtml = () => {
    if (!result) return
    const blob = new Blob([result.document_html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BankStatement_${result.account_holder.replace(/\s+/g, '_')}_${MONTHS[result.month - 1]}_${result.year}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printStatement = () => {
    const iframe = document.getElementById('bank-stmt-iframe') as HTMLIFrameElement
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    }
  }

  const fmt = (v: number) => `${currency} ${v.toLocaleString('en-PK', { minimumFractionDigits: 2 })}`

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.25rem', alignItems: 'start' }}>

      {/* Config Panel */}
      <aside className="panel-card">
        <div className="panel-header">
          <div className="panel-title-area">
            <Landmark size={17} style={{ color: 'var(--primary)' }} />
            <h3 className="panel-title">Bank Statement</h3>
          </div>
          <span className="type-pill">Synthetic</span>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

          {/* Account holder */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Account Holder (leave blank to auto-generate)
            </label>
            <input
              type="text"
              className="column-input"
              style={{ width: '100%' }}
              value={accountHolder}
              onChange={e => setAccountHolder(e.target.value)}
              placeholder="e.g. Ahmad Khan"
            />
          </div>

          {/* Bank name */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Bank
            </label>
            <select
              className="column-select"
              style={{ width: '100%' }}
              value={bankName}
              onChange={e => setBankName(e.target.value)}
            >
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Month / Year */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Month</label>
              <select className="column-select" style={{ width: '100%' }} value={month} onChange={e => setMonth(parseInt(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Year</label>
              <select className="column-select" style={{ width: '100%' }} value={year} onChange={e => setYear(parseInt(e.target.value))}>
                {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Currency */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Currency</label>
            <select className="column-select" style={{ width: '100%' }} value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="PKR">PKR – Pakistani Rupee</option>
              <option value="USD">USD – US Dollar</option>
              <option value="EUR">EUR – Euro</option>
              <option value="GBP">GBP – British Pound</option>
            </select>
          </div>

          {/* Opening balance */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Opening Balance</label>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>
                {openingBalance.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="5000"
              max="500000"
              step="5000"
              value={openingBalance}
              onChange={e => setOpeningBalance(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Transactions count */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Number of Transactions</label>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>{numTransactions}</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={numTransactions}
              onChange={e => setNumTransactions(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Seed */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRandomizeSeed}
            style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Dices size={13} />
            <span>Randomize (Seed #{seed})</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem' }}
            onClick={handleGenerate}
            disabled={loading}
            id="btn-generate-bank-statement"
          >
            {loading
              ? <><RefreshCw size={16} className="spin-animation" /><span>Generating...</span></>
              : <><Landmark size={16} /><span>Generate Statement</span></>
            }
          </button>
        </div>
      </aside>

      {/* Preview Panel */}
      <section className="panel-card" style={{ minHeight: '640px' }}>
        <div className="panel-header">
          <div className="panel-title-area">
            <Landmark size={17} style={{ color: 'var(--accent-emerald)' }} />
            <h3 className="panel-title">Statement Preview</h3>
            {result && (
              <span className="type-pill">{result.transaction_count} transactions</span>
            )}
          </div>
          {result && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={printStatement}>
                <Printer size={13} /><span>Print</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={downloadHtml}>
                <Download size={13} /><span>Download HTML</span>
              </button>
            </div>
          )}
        </div>

        {/* Summary badges */}
        {result && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.15)' }}>
            {[
              { label: 'Opening', value: fmt(result.opening_balance), color: 'var(--accent-sky)' },
              { label: 'Credits', value: fmt(result.total_credits), color: 'var(--accent-emerald)' },
              { label: 'Debits', value: fmt(result.total_debits), color: 'var(--accent-rose)' },
              { label: 'Closing', value: fmt(result.closing_balance), color: 'var(--primary)' },
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.88rem', color: item.color }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="panel-body" style={{ height: result ? '520px' : '560px', padding: 0 }}>
          {error && (
            <div style={{ padding: '1rem', color: '#fb7185', background: 'rgba(244,63,94,0.1)' }}>{error}</div>
          )}

          {!result && !loading && !error && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              <Landmark size={52} style={{ color: 'var(--border-medium)' }} />
              <div>
                <h3 style={{ marginBottom: '0.35rem', fontSize: '1rem' }}>No Statement Generated</h3>
                <p style={{ fontSize: '0.84rem', maxWidth: '320px' }}>
                  Configure options on the left and click <strong style={{ color: 'var(--primary)' }}>Generate Statement</strong>.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <RefreshCw size={36} className="spin-animation" style={{ color: 'var(--primary)' }} />
              <p style={{ color: 'var(--text-muted)' }}>Generating transactions...</p>
            </div>
          )}

          {result && !loading && (
            <iframe
              id="bank-stmt-iframe"
              srcDoc={result.document_html}
              title="Bank Statement Preview"
              style={{ width: '100%', height: '100%', border: 'none', background: '#fff', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)' }}
            />
          )}
        </div>
      </section>
    </div>
  )
}

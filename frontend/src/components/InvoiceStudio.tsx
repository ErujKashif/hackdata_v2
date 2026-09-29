import React, { useState } from 'react'
import {
  FileText,
  Sparkles,
  Download,
  Printer,
  Plus,
  Trash2,
  DollarSign,
  Building,
  User,
} from 'lucide-react'
import type { InvoiceRequest, InvoiceResponse, LineItem } from '../types/api'
import { generateInvoice } from '../services/api'

interface InvoiceStudioProps {
  locale: string
  seed: number
}

export const InvoiceStudio: React.FC<InvoiceStudioProps> = ({ locale, seed }) => {
  const [senderName, setSenderName] = useState('Apex Systems Ltd')
  const [senderAddress, setSenderAddress] = useState('Floor 4, Blue Area, Islamabad')
  const [senderTaxId, setSenderTaxId] = useState('PK-NTN-892341-7')

  const [recipientName, setRecipientName] = useState('Habib & Sons Enterprises')
  const [recipientAddress, setRecipientAddress] = useState('Shahrah-e-Faisal, Karachi')

  const [currency, setCurrency] = useState('PKR')
  const [taxRate, setTaxRate] = useState(0.18)

  const [items, setItems] = useState<LineItem[]>([
    { description: 'Cloud Infrastructure Migration & Setup', quantity: 1, unit_price: 350000 },
    { description: 'Managed Kubernetes Cluster Support (Monthly)', quantity: 2, unit_price: 85000 },
    { description: 'Security Hardening & Penetration Audit', quantity: 1, unit_price: 120000 },
  ])

  const [loading, setLoading] = useState(false)
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const addItem = () => {
    setItems([...items, { description: 'New Service Item', quantity: 1, unit_price: 10000 }])
  }

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, updates: Partial<LineItem>) => {
    const next = [...items]
    next[idx] = { ...next[idx], ...updates }
    setItems(next)
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const formattedItems = items.map((it) => ({
        description: it.description,
        qty: it.qty ?? it.quantity ?? 1,
        quantity: it.qty ?? it.quantity ?? 1,
        price: it.price ?? it.unit_price ?? 0,
        unit_price: it.price ?? it.unit_price ?? 0,
      }))

      const req: InvoiceRequest = {
        locale,
        seed,
        company_name: senderName,
        sender_name: senderName,
        sender_address: senderAddress,
        sender_tax_id: senderTaxId,
        client_name: recipientName,
        recipient_name: recipientName,
        recipient_address: recipientAddress,
        currency,
        tax_rate: taxRate,
        line_items: formattedItems,
        items: formattedItems,
      }
      const res = await generateInvoice(req)
      setInvoice(res)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to generate invoice')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    handleGenerate()
  }, [])

  const downloadHtml = () => {
    if (!invoice) return
    const content = invoice.document_html || invoice.html_document || ''
    const blob = new Blob([content], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Invoice_${invoice.invoice_number}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printInvoice = () => {
    if (!invoice) return
    const iframe = document.getElementById('invoice-preview-iframe') as HTMLIFrameElement
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '460px 1fr', gap: '1.5rem', alignItems: 'start' }}>
      {/* Parameters Panel */}
      <aside className="panel-card">
        <div className="panel-header">
          <div className="panel-title-area">
            <FileText size={18} style={{ color: 'var(--primary)' }} />
            <h2 className="panel-title">Document Generator</h2>
          </div>
          <span className="type-pill">Tax-Compliant</span>
        </div>

        <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Sender */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Building size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Issuer / Sender Details
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input
                type="text"
                className="column-input"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Company Name"
              />
              <input
                type="text"
                className="column-input"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                placeholder="Street & City Address"
              />
              <input
                type="text"
                className="column-input"
                value={senderTaxId}
                onChange={(e) => setSenderTaxId(e.target.value)}
                placeholder="Tax ID / NTN / VAT"
              />
            </div>
          </div>

          {/* Recipient */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <User size={14} style={{ color: 'var(--accent-violet)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Billed Client / Recipient
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <input
                type="text"
                className="column-input"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Client Name"
              />
              <input
                type="text"
                className="column-input"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Client Billing Address"
              />
            </div>
          </div>

          {/* Currency & Tax */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Currency
              </label>
              <select
                className="column-select"
                style={{ width: '100%' }}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="PKR">PKR (Pakistani Rupee)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="AED">AED (UAE Dirham)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Sales Tax Rate
              </label>
              <input
                type="number"
                className="column-input"
                step="0.01"
                min="0"
                max="0.5"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Billable Line Items
              </span>
              <button className="btn btn-secondary btn-sm" onClick={addItem}>
                <Plus size={12} />
                <span>Add Item</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
              {items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="column-input"
                    style={{ flex: 2 }}
                    value={it.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder="Description"
                  />
                  <input
                    type="number"
                    className="column-input"
                    style={{ width: '55px' }}
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                    min="1"
                  />
                  <input
                    type="number"
                    className="column-input"
                    style={{ width: '90px' }}
                    value={it.unit_price}
                    onChange={(e) => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                  />
                  <button className="btn-danger-ghost" onClick={() => removeItem(idx)} style={{ padding: '0.2rem' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
            onClick={handleGenerate}
            disabled={loading}
            id="btn-generate-invoice"
          >
            <Sparkles size={16} className={loading ? 'spin-animation' : ''} />
            <span>{loading ? 'Compiling Document...' : 'Generate Document'}</span>
          </button>
        </div>
      </aside>

      {/* Invoice Document Preview */}
      <section className="panel-card" style={{ minHeight: '620px' }}>
        <div className="panel-header">
          <div className="panel-title-area">
            <DollarSign size={18} style={{ color: '#10b981' }} />
            <h3 className="panel-title">Rendered Document Preview</h3>
            {invoice && <span className="type-pill">{invoice.invoice_number}</span>}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={printInvoice} disabled={!invoice}>
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={downloadHtml} disabled={!invoice}>
              <Download size={14} />
              <span>Download HTML</span>
            </button>
          </div>
        </div>

        <div className="panel-body" style={{ height: '580px', padding: 0 }}>
          {error && (
            <div style={{ padding: '1rem', color: '#fb7185', background: 'rgba(244, 63, 94, 0.1)' }}>
              {error}
            </div>
          )}

          {invoice ? (
            <iframe
              id="invoice-preview-iframe"
              srcDoc={invoice.document_html || invoice.html_document}
              title="Invoice HTML Preview"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#ffffff',
                borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
              }}
            />
          ) : (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                color: 'var(--text-muted)',
              }}
            >
              <FileText size={48} style={{ color: 'var(--border-medium)' }} />
              <p style={{ fontSize: '0.9rem' }}>
                Fill details on the left and click <strong>Generate Document</strong> to see a rendered,
                production-ready invoice.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

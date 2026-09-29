import React from 'react'
import {
  Sparkles,
  Database,
  FileText,
  UploadCloud,
  ShieldCheck,
  Dices,
  Globe2,
  AlertTriangle,
  Share2,
  Landmark,
} from 'lucide-react'
import type { LocaleOption } from '../types/api'

type ActiveTab = 'tabular' | 'relational' | 'invoice' | 'bank' | 'infer' | 'validation'

interface NavbarProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  isOnline: boolean
  locales: LocaleOption[]
  selectedLocale: string
  setSelectedLocale: (loc: string) => void
  seed: number
  setSeed: (s: number) => void
  edgeCasesEnabled: boolean
  setEdgeCasesEnabled: (enabled: boolean) => void
  onRandomizeSeed: () => void
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isOnline,
  locales,
  selectedLocale,
  setSelectedLocale,
  seed,
  setSeed,
  edgeCasesEnabled,
  setEdgeCasesEnabled,
  onRandomizeSeed,
}) => {
  return (
    <header className="header-bar">
      <div className="header-inner">
        {/* Brand */}
        <div className="brand-wrapper" onClick={() => setActiveTab('tabular')}>
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="brand-text">SYNTHARA</span>
              <span className="brand-tag">Studio v2.0</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            className={`nav-tab-btn ${activeTab === 'tabular' ? 'active' : ''}`}
            onClick={() => setActiveTab('tabular')}
            title="Tabular data generation"
          >
            <Database size={15} />
            <span>Tabular</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'relational' ? 'active' : ''}`}
            onClick={() => setActiveTab('relational')}
            title="Multi-table relational datasets"
          >
            <Share2 size={15} />
            <span>Relational</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'invoice' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoice')}
            title="Invoice & document generation"
          >
            <FileText size={15} />
            <span>Invoice</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('bank')}
            title="Bank statement generation"
          >
            <Landmark size={15} />
            <span>Bank Stmt</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'infer' ? 'active' : ''}`}
            onClick={() => setActiveTab('infer')}
            title="Infer schema from CSV & detect PII"
          >
            <UploadCloud size={15} />
            <span>CSV Infer</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'validation' ? 'active' : ''}`}
            onClick={() => setActiveTab('validation')}
            title="Data quality & privacy validation"
          >
            <ShieldCheck size={15} />
            <span>Validate</span>
          </button>
        </nav>

        {/* Global Controls & Status */}
        <div className="header-controls">
          {/* Locale Selector */}
          <div className="control-pill" title="Dataset Locale & Geography">
            <Globe2 size={14} style={{ color: '#14b8a6' }} />
            <select
              value={selectedLocale}
              onChange={(e) => setSelectedLocale(e.target.value)}
              aria-label="Select locale"
            >
              {locales.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          {/* Seed Input + Randomizer */}
          <div className="control-pill" title="Deterministic Random Seed">
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
              SEED
            </span>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
              style={{ width: '68px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
              aria-label="Random seed"
            />
            <button
              className="btn-ghost"
              style={{ padding: '0.1rem', cursor: 'pointer' }}
              onClick={onRandomizeSeed}
              title="Roll new seed"
            >
              <Dices size={15} style={{ color: 'var(--accent-violet)' }} />
            </button>
          </div>

          {/* Edge-Cases Toggle */}
          <button
            onClick={() => setEdgeCasesEnabled(!edgeCasesEnabled)}
            className="control-pill"
            style={{
              cursor: 'pointer',
              borderColor: edgeCasesEnabled ? 'var(--accent-amber)' : 'var(--border-subtle)',
              background: edgeCasesEnabled ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-card)',
              color: edgeCasesEnabled ? '#fbbf24' : 'var(--text-dim)',
            }}
            title="Inject boundary values, outliers, empty strings, and special characters"
          >
            <AlertTriangle size={14} />
            <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>Edge Cases</span>
          </button>

          {/* Status Indicator */}
          <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span>{isOnline ? 'API LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

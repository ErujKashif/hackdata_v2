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
  Sun,
  Moon,
  Bot,
} from 'lucide-react'
import type { LocaleOption } from '../types/api'

type ActiveTab = 'tabular' | 'relational' | 'invoice' | 'bank' | 'infer' | 'validation' | 'ai'

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
  theme: 'dark' | 'light'
  onToggleTheme: () => void
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
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="header-bar">
      <div className="header-inner">
        {/* Brand */}
        <div className="brand-wrapper" onClick={() => setActiveTab('tabular')} role="button" tabIndex={0}>
          <div className="brand-icon">
            <Sparkles size={17} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
            <span className="brand-text">SYNTHARA</span>
            <span className="brand-tag">v2.0</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            className={`nav-tab-btn ${activeTab === 'tabular' ? 'active' : ''}`}
            onClick={() => setActiveTab('tabular')}
            title="Tabular data generation"
          >
            <Database size={14} />
            <span>Tabular</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'relational' ? 'active' : ''}`}
            onClick={() => setActiveTab('relational')}
            title="Multi-table relational datasets"
          >
            <Share2 size={14} />
            <span>Relational</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'invoice' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoice')}
            title="Invoice & document generation"
          >
            <FileText size={14} />
            <span>Invoice</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('bank')}
            title="Bank statement generation"
          >
            <Landmark size={14} />
            <span>Bank Stmt</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'infer' ? 'active' : ''}`}
            onClick={() => setActiveTab('infer')}
            title="Infer schema from CSV & detect PII"
          >
            <UploadCloud size={14} />
            <span>CSV Infer</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'validation' ? 'active' : ''}`}
            onClick={() => setActiveTab('validation')}
            title="Data quality & privacy validation"
          >
            <ShieldCheck size={14} />
            <span>Validate</span>
          </button>

          <button
            className={`nav-tab-btn ai-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
            title="AI Schema Generator — describe your table in plain English"
          >
            <Bot size={14} />
            <span>AI Schema</span>
          </button>
        </nav>

        {/* Global Controls & Status */}
        <div className="header-controls">
          {/* Locale Selector */}
          <div className="control-pill" title="Dataset Locale & Geography">
            <Globe2 size={13} style={{ color: 'var(--primary)' }} />
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
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
              SEED
            </span>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
              style={{ width: '64px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
              aria-label="Random seed"
            />
            <button
              className="btn-ghost"
              style={{ padding: '0.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              onClick={onRandomizeSeed}
              title="Roll new seed"
            >
              <Dices size={14} style={{ color: 'var(--accent-violet)' }} />
            </button>
          </div>

          {/* Edge-Cases Toggle */}
          <button
            onClick={() => setEdgeCasesEnabled(!edgeCasesEnabled)}
            className="control-pill"
            style={{
              cursor: 'pointer',
              borderColor: edgeCasesEnabled ? 'var(--accent-amber)' : 'var(--border-subtle)',
              background: edgeCasesEnabled ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-elevated)',
              color: edgeCasesEnabled ? 'var(--accent-amber)' : 'var(--text-dim)',
            }}
            title="Inject boundary values, outliers, empty strings, and special characters"
          >
            <AlertTriangle size={13} />
            <span style={{ fontWeight: 600, fontSize: '0.73rem' }}>Edge Cases</span>
          </button>

          {/* Theme Toggle */}
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Status Indicator */}
          <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            <span>{isOnline ? 'API LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

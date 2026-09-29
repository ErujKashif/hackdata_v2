import './App.css'
import { useState, useEffect, useCallback } from 'react'
import { Navbar } from './components/Navbar'
import { SchemaBuilder } from './components/SchemaBuilder'
import { PreviewTable } from './components/PreviewTable'
import { ExportModal } from './components/ExportModal'
import { InferModal } from './components/InferModal'
import { ValidationView } from './components/ValidationView'
import { InvoiceStudio } from './components/InvoiceStudio'
import { RelationalStudio } from './components/RelationalStudio'
import { BankStatementStudio } from './components/BankStatementStudio'
import type {
  ColumnSpec,
  LocaleOption,
  PresetSchema,
  TabularRequest,
  TabularResponse,
} from './types/api'
import { fetchHealth, fetchLocales, fetchPresets, generateTabular } from './services/api'

type ActiveTab = 'tabular' | 'relational' | 'invoice' | 'bank' | 'infer' | 'validation'

const DEFAULT_COLUMNS: ColumnSpec[] = [
  { name: 'id', type: 'uuid' },
  { name: 'full_name', type: 'name' },
  { name: 'email', type: 'email' },
  { name: 'phone', type: 'phone' },
  { name: 'city', type: 'city' },
  { name: 'account_balance', type: 'currency', params: { min: 500, max: 250000 } },
  {
    name: 'plan_tier',
    type: 'category',
    params: { categories: ['Free', 'Starter', 'Professional', 'Enterprise'] },
  },
  { name: 'is_verified', type: 'boolean' },
  { name: 'signup_date', type: 'date', params: { date_start: '2023-01-01', date_end: '2026-09-01' } },
]

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tabular')
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [locales, setLocales] = useState<LocaleOption[]>([
    { code: 'pk_PK', label: 'Pakistan (PKR, Urdu names)' },
    { code: 'en_US', label: 'United States (USD)' },
  ])
  const [selectedLocale, setSelectedLocale] = useState<string>('pk_PK')
  const [seed, setSeed] = useState<number>(42)
  const [edgeCasesEnabled, setEdgeCasesEnabled] = useState<boolean>(false)

  const [columns, setColumns] = useState<ColumnSpec[]>(DEFAULT_COLUMNS)
  const [rowCount, setRowCount] = useState<number>(1000)
  const [presets, setPresets] = useState<PresetSchema[]>([])

  const [loading, setLoading] = useState<boolean>(false)
  const [response, setResponse] = useState<TabularResponse | null>(null)
  const [exportOpen, setExportOpen] = useState<boolean>(false)

  // Check health and metadata on load
  useEffect(() => {
    const initApp = async () => {
      try {
        const health = await fetchHealth()
        setIsOnline(health.status === 'ok')
      } catch {
        setIsOnline(false)
      }

      try {
        const locRes = await fetchLocales()
        if (locRes.locales && locRes.locales.length > 0) {
          setLocales(locRes.locales)
        }
      } catch (e) {
        console.warn('Could not load locales', e)
      }

      try {
        const presetRes = await fetchPresets()
        if (presetRes.presets && presetRes.presets.length > 0) {
          setPresets(presetRes.presets)
        }
      } catch (e) {
        console.warn('Could not load presets', e)
      }
    }

    initApp()
  }, [])

  const currentTabularRequest: TabularRequest = {
    row_count: rowCount,
    columns,
    locale: selectedLocale,
    seed,
    edge_cases: edgeCasesEnabled,
  }

  // Generation action
  const handleGenerate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await generateTabular(currentTabularRequest, 50)
      setResponse(res)
    } catch (err: unknown) {
      console.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [currentTabularRequest])

  // Re-generate when locale or seed changes (only if on tabular tab)
  useEffect(() => {
    if (activeTab === 'tabular') handleGenerate()
  }, [selectedLocale, seed])

  const randomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 900000) + 100000
    setSeed(newSeed)
  }

  const handleSelectPreset = (preset: PresetSchema) => {
    if (preset.request.columns) setColumns(preset.request.columns)
    if (preset.request.row_count) setRowCount(preset.request.row_count)
    if (preset.request.locale) setSelectedLocale(preset.request.locale)
    setTimeout(() => { handleGenerate() }, 50)
  }

  const handleApplyInferredSchema = (inferredCols: ColumnSpec[], inferredCount: number) => {
    setColumns(inferredCols)
    setRowCount(Math.max(100, Math.min(10000, inferredCount || 1000)))
    setTimeout(() => { handleGenerate() }, 50)
  }

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOnline={isOnline}
        locales={locales}
        selectedLocale={selectedLocale}
        setSelectedLocale={setSelectedLocale}
        seed={seed}
        setSeed={setSeed}
        edgeCasesEnabled={edgeCasesEnabled}
        setEdgeCasesEnabled={setEdgeCasesEnabled}
        onRandomizeSeed={randomizeSeed}
      />

      {/* Main Workspace Body */}
      <main className="main-content">

        {/* Tabular Studio */}
        {activeTab === 'tabular' && (
          <div className="studio-grid">
            <SchemaBuilder
              columns={columns}
              setColumns={setColumns}
              rowCount={rowCount}
              setRowCount={setRowCount}
              onGenerate={handleGenerate}
              loading={loading}
              presets={presets}
              onSelectPreset={handleSelectPreset}
            />
            <PreviewTable
              response={response}
              loading={loading}
              onOpenExport={() => setExportOpen(true)}
            />
          </div>
        )}

        {/* Relational Studio — NEW */}
        {activeTab === 'relational' && (
          <RelationalStudio
            locale={selectedLocale}
            seed={seed}
            onRandomizeSeed={randomizeSeed}
          />
        )}

        {/* Invoice / Document Studio */}
        {activeTab === 'invoice' && (
          <InvoiceStudio locale={selectedLocale} seed={seed} />
        )}

        {/* Bank Statement Studio — NEW */}
        {activeTab === 'bank' && (
          <BankStatementStudio
            locale={selectedLocale}
            seed={seed}
            onRandomizeSeed={randomizeSeed}
          />
        )}

        {/* CSV Infer & PII */}
        {activeTab === 'infer' && (
          <InferModal
            onApplySchema={handleApplyInferredSchema}
            onNavigateToStudio={() => setActiveTab('tabular')}
          />
        )}

        {/* Data Quality & Validation */}
        {activeTab === 'validation' && (
          <ValidationView request={currentTabularRequest} />
        )}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        request={currentTabularRequest}
      />
    </div>
  )
}

export default App

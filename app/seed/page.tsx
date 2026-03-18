'use client'

import { useState } from 'react'
import { seedApi, gatewayApi, onboardingApi } from '@/lib/api-client'
import Toaster, { useToast, ToastData } from '@/components/Toast'

interface SeedResult {
  entity: string
  created: number
  updated: number
  total: number
  details?: any[]
}

interface SeedCardProps {
  title: string
  description: string
  icon: string
  onRun: () => Promise<void>
  running: boolean
  result: SeedResult | null
  error: string
}

function SeedCard({ title, description, icon, onRun, running, result, error }: SeedCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start gap-4">
        <div className="text-3xl shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="text-sm text-muted mt-0.5">{description}</p>

          {result && (
            <div className="mt-3 p-3 rounded-lg bg-success/10 border border-success/20">
              <div className="text-sm text-success font-medium mb-1">✓ Completed</div>
              <div className="grid grid-cols-3 gap-3 text-xs text-muted">
                <div><span className="text-white font-medium">{result.created}</span> created</div>
                <div><span className="text-white font-medium">{result.updated}</span> updated</div>
                <div><span className="text-white font-medium">{result.total}</span> total</div>
              </div>
              {result.details && result.details.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted cursor-pointer hover:text-white">Show details</summary>
                  <div className="mt-1 space-y-0.5 max-h-36 overflow-y-auto">
                    {result.details.map((d: any, i: number) => (
                      <div key={i} className="text-xs text-muted flex items-center gap-2">
                        <span className={d.action === 'created' ? 'text-success' : 'text-amber-400'}>
                          {d.action === 'created' ? '+' : '↻'}
                        </span>
                        <span>{d.name || d.title || d.message || JSON.stringify(d)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
              {error}
            </div>
          )}
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="shrink-0 px-4 py-2 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {running ? 'Running...' : 'Run'}
        </button>
      </div>
    </div>
  )
}

// ── Bulk Import Section ────────────────────────────────────────────────────────
function BulkImportSection({ toast }: { toast: (type: any, msg: string) => void }) {
  const [target, setTarget] = useState<'gateways' | 'onboarding'>('gateways')
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string>('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImportText(ev.target?.result as string)
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!importText.trim()) return
    setImporting(true)
    setResult('')
    try {
      // Support JS object literal syntax (unquoted keys, trailing commas)
      const normalized = importText
        .replace(/\/\/[^\n]*/g, '')                          // strip // comments
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":') // quote unquoted keys
        .replace(/,(\s*[}\]])/g, '$1')                      // remove trailing commas
      const items = JSON.parse(normalized)
      const arr = Array.isArray(items) ? items : [items]
      let created = 0
      let updated = 0

      if (target === 'gateways') {
        for (const item of arr) {
          try {
            await gatewayApi.update(item.code, item)
            updated++
          } catch {
            try { await gatewayApi.create(item); created++ } catch { /* skip */ }
          }
        }
      } else {
        for (const item of arr) {
          try {
            await onboardingApi.update(item.stepNumber, item)
            updated++
          } catch {
            try { await onboardingApi.create(item); created++ } catch { /* skip */ }
          }
        }
      }

      const msg = `Imported ${arr.length} item(s): ${created} created, ${updated} updated`
      setResult(msg)
      toast('success', msg)
      setImportText('')
    } catch (e: any) {
      toast('error', `Import failed: ${e.message}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-base font-semibold text-white mb-1">Bulk Import from File</h3>
      <p className="text-sm text-muted mb-4">
        Import payment gateways or onboarding steps from a JSON file (e.g. exported from another environment).
      </p>
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['gateways', 'onboarding'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-all capitalize ${
                target === t ? 'bg-accent text-white' : 'bg-surface border border-border text-muted hover:text-white'
              }`}
            >
              {t === 'gateways' ? 'Payment Gateways' : 'Onboarding Steps'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".json"
            onChange={handleFile}
            className="text-sm text-muted file:mr-4 file:py-1.5 file:px-3 file:border file:border-border file:rounded-lg file:text-xs file:text-white file:bg-surface file:cursor-pointer hover:file:border-accent/50"
          />
          <span className="text-xs text-muted">or paste JSON below</span>
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={8}
          placeholder={target === 'gateways'
            ? `[\n  {\n    "name": "Stripe",\n    "code": "stripe",\n    "isActive": true\n  }\n]`
            : `[\n  {\n    "stepNumber": 1,\n    "title": "User Type",\n    "type": "SINGLE_SELECT"\n  }\n]`}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-muted focus:outline-none focus:border-accent resize-y"
        />
        {result && (
          <div className="px-3 py-2 rounded-lg bg-success/10 border border-success/20 text-sm text-success">{result}</div>
        )}
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={importing || !importText.trim()}
            className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SeedPage() {
  const { toasts, toast, dismiss } = useToast() as any

  type RunState = { running: boolean; result: SeedResult | null; error: string }
  const init: RunState = { running: false, result: null, error: '' }

  const [gwState, setGwState] = useState<RunState>(init)
  const [obState, setObState] = useState<RunState>(init)
  const [allState, setAllState] = useState<RunState>(init)
  const [allTenantId, setAllTenantId] = useState('')

  async function runWith(
    setState: React.Dispatch<React.SetStateAction<RunState>>,
    fn: () => Promise<any>,
    label: string,
  ) {
    setState({ running: true, result: null, error: '' })
    try {
      const res = await fn() as any
      const data = res.data
      // 'seed all' returns array; individual returns object
      const result = Array.isArray(data)
        ? { entity: 'all', created: data.reduce((s: number, r: any) => s + r.created, 0), updated: data.reduce((s: number, r: any) => s + r.updated, 0), total: data.reduce((s: number, r: any) => s + r.total, 0), details: data }
        : data
      setState({ running: false, result, error: '' })
      toast('success', `${label} completed`)
    } catch (e: any) {
      setState({ running: false, result: null, error: e.message })
      toast('error', `${label} failed: ${e.message}`)
    }
  }

  return (
    <div className="p-8">
      <Toaster toasts={toasts as ToastData[]} onDismiss={dismiss} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Seed & Import</h1>
        <p className="text-muted text-sm mt-1">
          Populate database with reference data or import from files. Safe to run multiple times — uses upsert.
        </p>
        <div className="mt-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs inline-block">
          ⚠️ Seed endpoints are disabled in production environments
        </div>
      </div>

      <div className="space-y-4">
        {/* Individual Seeds */}
        <SeedCard
          title="Seed Payment Gateways"
          description="Populates payment_gateways table from the bundled data file (Airwallex, Stripe, Paystack, PesaPal, etc). Safe to re-run — uses upsert."
          icon="💳"
          running={gwState.running}
          result={gwState.result}
          error={gwState.error}
          onRun={() => runWith(setGwState, seedApi.gateways, 'Payment Gateways Seed')}
        />

        <SeedCard
          title="Seed Onboarding Steps"
          description="Populates onboarding_steps and onboarding_options tables from the bundled data file. Safe to re-run."
          icon="🪜"
          running={obState.running}
          result={obState.result}
          error={obState.error}
          onRun={() => runWith(setObState, seedApi.onboarding, 'Onboarding Steps Seed')}
        />

        {/* Seed All */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="text-3xl shrink-0">🌱</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white">Seed All</h3>
              <p className="text-sm text-muted mt-0.5 mb-3">
                Runs all seed operations (gateways + onboarding + webhooks). Optionally pass a tenant ID to also seed webhooks for that tenant.
              </p>
              <input
                type="text"
                value={allTenantId}
                onChange={(e) => setAllTenantId(e.target.value)}
                placeholder="Tenant ID (optional, for webhook seeding)"
                className="w-64 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
              />
              {allState.result && (
                <div className="mt-3 p-3 rounded-lg bg-success/10 border border-success/20">
                  <div className="text-sm text-success font-medium mb-2">✓ All seeding completed</div>
                  {Array.isArray(allState.result.details) && allState.result.details.map((r: any, i: number) => (
                    <div key={i} className="text-xs text-muted flex gap-4">
                      <span className="text-white w-40">{r.entity}</span>
                      <span>{r.created} created</span>
                      <span>{r.updated} updated</span>
                    </div>
                  ))}
                </div>
              )}
              {allState.error && (
                <div className="mt-3 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{allState.error}</div>
              )}
            </div>
            <button
              onClick={() => runWith(setAllState, () => seedApi.all(allTenantId || undefined), 'Seed All')}
              disabled={allState.running}
              className="shrink-0 px-4 py-2 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {allState.running ? 'Running...' : 'Run All'}
            </button>
          </div>
        </div>

        {/* Bulk Import from file */}
        <BulkImportSection toast={toast} />
      </div>
    </div>
  )
}

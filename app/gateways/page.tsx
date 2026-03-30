'use client'

import { useEffect, useState, useCallback } from 'react'
import { gatewayApi } from '@/lib/api-client'
import Modal from '@/components/Modal'
import Toaster, { useToast, ToastData } from '@/components/Toast'

// ── Domain types ──────────────────────────────────────────────────────────────
interface Gateway {
  id: string
  name: string
  code: string
  description?: string
  logoUrl?: string
  bannerUrl?: string
  isActive: boolean
  supportedCurrencies?: unknown
  configSchema?: unknown
  validationEndpoint?: unknown
  createdAt: string
  updatedAt: string
}

interface VaultField {
  key: string
  label: string
  isMasked: boolean
}

interface PaymentMethod {
  key: string
  label: string
  logo: string
  isActive: boolean
}

interface ConfigSchemaForm {
  hasWebhookUrl: boolean
  webhookUrlDescription: string
  webhookUrlRequired: boolean
  vaultFieldsLive: VaultField[]
  vaultFieldsTest: VaultField[]
  webhookFields: VaultField[]
  paymentMethods: PaymentMethod[]
}

interface ValidationEndpointForm {
  test: string
  live: string
}

interface GatewayForm {
  name: string
  code: string
  description: string
  logoUrl: string
  bannerUrl: string
  isActive: boolean
  supportedCurrencies: string
  configSchema: ConfigSchemaForm
  validationEndpoint: ValidationEndpointForm
}

// ── Parse helpers ─────────────────────────────────────────────────────────────
function safeJson(val: unknown): any {
  if (!val) return null
  if (typeof val === 'string') { try { return JSON.parse(val) } catch { return null } }
  return val
}

function parseConfigSchema(raw: unknown): ConfigSchemaForm {
  const parsed = safeJson(raw) || {}
  const props = parsed?.properties || {}
  const vault = parsed?.vaultFields || {}
  return {
    hasWebhookUrl: !!props.webhookUrl,
    webhookUrlDescription: props.webhookUrl?.description || '',
    webhookUrlRequired: props.webhookUrl?.isRequired ?? true,
    vaultFieldsLive: vault.live || [],
    vaultFieldsTest: vault.test || [],
    webhookFields: parsed?.webhookFields || [],
    paymentMethods: Array.isArray(props.paymentMethods) ? props.paymentMethods : [],
  }
}

function parseValidationEndpoint(raw: unknown): ValidationEndpointForm {
  const parsed = safeJson(raw)
  if (!parsed) return { test: '', live: '' }
  if (typeof parsed === 'string') return { test: parsed, live: parsed }
  return { test: parsed?.test || '', live: parsed?.live || '' }
}

function buildConfigSchemaPayload(cs: ConfigSchemaForm): object {
  const properties: Record<string, unknown> = {}
  if (cs.hasWebhookUrl) {
    properties.webhookUrl = {
      type: 'string',
      description: cs.webhookUrlDescription || 'Webhook URL',
      isRequired: cs.webhookUrlRequired,
    }
  }
  if (cs.paymentMethods.length > 0) properties.paymentMethods = cs.paymentMethods
  return {
    properties,
    vaultFields: { live: cs.vaultFieldsLive, test: cs.vaultFieldsTest },
    ...(cs.webhookFields.length > 0 ? { webhookFields: cs.webhookFields } : {}),
  }
}

function buildValidationEndpointPayload(ve: ValidationEndpointForm): unknown {
  if (!ve.test && !ve.live) return undefined
  return { test: ve.test || undefined, live: ve.live || undefined }
}

function currencyDisplay(val: unknown): string {
  if (!val) return ''
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'string') {
    try { const a = JSON.parse(val); return Array.isArray(a) ? a.join(', ') : val } catch { return val }
  }
  return String(val)
}

// ── Default empty form ────────────────────────────────────────────────────────
const EMPTY_FORM: GatewayForm = {
  name: '', code: '', description: '', logoUrl: '', bannerUrl: '',
  isActive: true, supportedCurrencies: '',
  configSchema: {
    hasWebhookUrl: false, webhookUrlDescription: '', webhookUrlRequired: true,
    vaultFieldsLive: [], vaultFieldsTest: [], webhookFields: [], paymentMethods: [],
  },
  validationEndpoint: { test: '', live: '' },
}

const EMPTY_VAULT_FIELD: VaultField = { key: '', label: '', isMasked: false }
const EMPTY_PAYMENT_METHOD: PaymentMethod = { key: '', label: '', logo: '', isActive: true }

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GatewaysPage() {
  const [gateways, setGateways] = useState<Gateway[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editGateway, setEditGateway] = useState<Gateway | null>(null)
  const [form, setForm] = useState<GatewayForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Gateway | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('vault-live')

  const { toasts, toast, dismiss } = useToast() as any

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const res = await gatewayApi.list() as any; setGateways(res.data || []) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditGateway(null)
    setForm(EMPTY_FORM)
    setActiveSection('vault-live')
    setShowModal(true)
  }

  function openEdit(gw: Gateway) {
    setEditGateway(gw)
    setForm({
      name: gw.name || '',
      code: gw.code || '',
      description: gw.description || '',
      logoUrl: gw.logoUrl || '',
      bannerUrl: gw.bannerUrl || '',
      isActive: gw.isActive,
      supportedCurrencies: currencyDisplay(gw.supportedCurrencies),
      configSchema: parseConfigSchema(gw.configSchema),
      validationEndpoint: parseValidationEndpoint(gw.validationEndpoint),
    })
    setActiveSection('vault-live')
    setShowModal(true)
  }

  function setBasic(k: keyof Omit<GatewayForm, 'configSchema' | 'validationEndpoint'>, v: unknown) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function setCS(k: keyof ConfigSchemaForm, v: unknown) {
    setForm((f) => ({ ...f, configSchema: { ...f.configSchema, [k]: v } }))
  }

  function setVE(k: keyof ValidationEndpointForm, v: string) {
    setForm((f) => ({ ...f, validationEndpoint: { ...f.validationEndpoint, [k]: v } }))
  }

  // Vault field helpers
  function addVaultField(field: 'vaultFieldsLive' | 'vaultFieldsTest' | 'webhookFields') {
    setCS(field, [...(form.configSchema[field] as VaultField[]), { ...EMPTY_VAULT_FIELD }])
  }
  function removeVaultField(field: 'vaultFieldsLive' | 'vaultFieldsTest' | 'webhookFields', idx: number) {
    setCS(field, (form.configSchema[field] as VaultField[]).filter((_, i) => i !== idx))
  }
  function updateVaultField(field: 'vaultFieldsLive' | 'vaultFieldsTest' | 'webhookFields', idx: number, k: keyof VaultField, v: unknown) {
    const arr = [...(form.configSchema[field] as VaultField[])]
    arr[idx] = { ...arr[idx], [k]: v }
    setCS(field, arr)
  }

  // Payment method helpers
  function addPaymentMethod() {
    setCS('paymentMethods', [...form.configSchema.paymentMethods, { ...EMPTY_PAYMENT_METHOD }])
  }
  function removePaymentMethod(idx: number) {
    setCS('paymentMethods', form.configSchema.paymentMethods.filter((_, i) => i !== idx))
  }
  function updatePaymentMethod(idx: number, k: keyof PaymentMethod, v: unknown) {
    const arr = [...form.configSchema.paymentMethods]
    arr[idx] = { ...arr[idx], [k]: v }
    setCS('paymentMethods', arr)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const currencies = form.supportedCurrencies
        ? form.supportedCurrencies.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined

      const payload = {
        name: form.name,
        ...(editGateway ? {} : { code: form.code }),
        description: form.description || undefined,
        logoUrl: form.logoUrl || undefined,
        bannerUrl: form.bannerUrl || undefined,
        isActive: form.isActive,
        supportedCurrencies: currencies,
        configSchema: buildConfigSchemaPayload(form.configSchema),
        validationEndpoint: buildValidationEndpointPayload(form.validationEndpoint),
      }

      if (editGateway) {
        await gatewayApi.update(editGateway.code, payload)
        toast('success', `Gateway "${form.name}" updated`)
      } else {
        await gatewayApi.create(payload)
        toast('success', `Gateway "${form.name}" created`)
      }
      setShowModal(false); load()
    } catch (e: any) {
      toast('error', e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await gatewayApi.delete(deleteTarget.code)
      toast('success', `Gateway "${deleteTarget.name}" deleted`)
      setDeleteTarget(null); load()
    } catch (e: any) { toast('error', e.message) }
    finally { setDeleting(false) }
  }

  async function handleImport() {
    setImporting(true)
    try {
      const arr = Array.isArray(JSON.parse(importText)) ? JSON.parse(importText) : [JSON.parse(importText)]
      let created = 0, updated = 0
      for (const item of arr) {
        try {
          gateways.find((g) => g.code === item.code)
            ? (await gatewayApi.update(item.code, item), updated++)
            : (await gatewayApi.create(item), created++)
        } catch { /* skip */ }
      }
      toast('success', `Import done: ${created} created, ${updated} updated`)
      setShowImport(false); setImportText(''); load()
    } catch (e: any) { toast('error', `Import failed: ${e.message}`) }
    finally { setImporting(false) }
  }

  function exportGateways() {
    const blob = new Blob([JSON.stringify(gateways, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: 'payment-gateways.json' }).click()
    URL.revokeObjectURL(url)
  }

  const filtered = gateways.filter(
    (g) => g.name.toLowerCase().includes(search.toLowerCase()) || g.code.toLowerCase().includes(search.toLowerCase()),
  )

  const cs = form.configSchema
  const ve = form.validationEndpoint

  const CONFIG_SECTIONS = [
    { id: 'vault-live', label: 'Vault Fields — Live', count: cs.vaultFieldsLive.length },
    { id: 'vault-test', label: 'Vault Fields — Test', count: cs.vaultFieldsTest.length },
    { id: 'webhook-fields', label: 'Webhook Fields', count: cs.webhookFields.length },
    { id: 'payment-methods', label: 'Payment Methods', count: cs.paymentMethods.length },
    { id: 'webhook-url', label: 'Webhook URL Prop', count: cs.hasWebhookUrl ? 1 : 0 },
  ]

  return (
    <div className="p-8">
      <Toaster toasts={toasts as ToastData[]} onDismiss={dismiss} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Gateways</h1>
          <p className="text-muted text-sm mt-0.5">{gateways.length} gateway(s) configured</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="px-3 py-2 text-sm text-muted border border-border rounded-lg hover:border-accent/50 hover:text-white transition-all">↑ Import JSON</button>
          <button onClick={exportGateways} className="px-3 py-2 text-sm text-muted border border-border rounded-lg hover:border-accent/50 hover:text-white transition-all">↓ Export</button>
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors">+ Add Gateway</button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input type="text" placeholder="Search by name or code..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm bg-surface border border-border rounded-lg px-4 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent" />
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {['SN', 'Name', 'Code', 'Status', 'Currencies', 'Actions'].map((h) => (
                <th key={h} className={`px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider${h === 'Actions' ? ' text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">{search ? 'No gateways match.' : 'No gateways found.'}</td></tr>
            ) : filtered.map((gw, idx) => (
              <tr key={gw.id} className="border-b border-border/50 hover:bg-white/2">
                <td className="px-4 py-3 text-xs text-muted w-10">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {gw.logoUrl && <img src={gw.logoUrl as string} alt="" className="w-5 h-5 rounded object-contain" />}
                    <span className="text-white font-medium">{gw.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{gw.code}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gw.isActive ? 'bg-success/15 text-success' : 'bg-muted/15 text-muted'}`}>
                    {gw.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted text-xs max-w-[200px] truncate">{currencyDisplay(gw.supportedCurrencies)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(gw)} className="px-3 py-1 text-xs text-muted hover:text-white border border-border hover:border-accent/50 rounded-md transition-all">Edit</button>
                    <button onClick={() => setDeleteTarget(gw)} className="px-3 py-1 text-xs text-danger/70 hover:text-danger border border-danger/20 hover:border-danger/50 rounded-md transition-all">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editGateway ? `Edit Gateway: ${editGateway.name}` : 'Add Payment Gateway'} size="xl">
        <div className="p-5 space-y-5">

          {/* Basic info */}
          <Section title="Basic Info">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name *" value={form.name} onChange={(v) => setBasic('name', v)} placeholder="Stripe" />
              <Field label="Code *" value={form.code} onChange={(v) => setBasic('code', v.toLowerCase())}
                placeholder="stripe" disabled={!!editGateway}
                hint={editGateway ? 'Cannot be changed' : 'Lowercase, no spaces'} />
            </div>
            <Field label="Description" value={form.description} onChange={(v) => setBasic('description', v)} placeholder="Online payment processing for..." />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Logo URL" value={form.logoUrl} onChange={(v) => setBasic('logoUrl', v)} placeholder="https://..." />
              <Field label="Banner URL" value={form.bannerUrl} onChange={(v) => setBasic('bannerUrl', v)} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Supported Currencies" value={form.supportedCurrencies}
                onChange={(v) => setBasic('supportedCurrencies', v)} placeholder="USD, EUR, GBP" hint="Comma-separated" />
              <div className="flex flex-col justify-end">
                <label className="text-xs text-muted mb-1.5">Status</label>
                <div className="flex items-center gap-2">
                  <ToggleBtn value={form.isActive} onChange={(v) => setBasic('isActive', v)} />
                  <span className="text-sm text-white">{form.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
          </Section>

          {/* Validation Endpoints */}
          <Section title="Validation Endpoints">
            <p className="text-xs text-muted -mt-1 mb-2">API endpoint used to validate tenant credentials for this gateway.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Test / Sandbox URL" value={ve.test} onChange={(v) => setVE('test', v)} placeholder="https://sandbox.api.com/validate" />
              <Field label="Live / Production URL" value={ve.live} onChange={(v) => setVE('live', v)} placeholder="https://api.com/validate" />
            </div>
          </Section>

          {/* Config Schema — tabbed */}
          <Section title="Config Schema">
            <p className="text-xs text-muted -mt-1 mb-3">
              Define the credential fields tenants fill in, payment methods offered, and any webhook config.
            </p>

            {/* Tab pills */}
            <div className="flex flex-wrap gap-1 mb-4">
              {CONFIG_SECTIONS.map((s) => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${activeSection === s.id ? 'bg-accent text-white' : 'bg-surface border border-border text-muted hover:text-white'}`}>
                  {s.label}
                  {s.count > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/10 text-white text-xs">{s.count}</span>}
                </button>
              ))}
            </div>

            {/* Vault Fields – Live */}
            {activeSection === 'vault-live' && (
              <VaultFieldList
                label="Vault Fields — Live (production credentials)"
                fields={cs.vaultFieldsLive}
                onAdd={() => addVaultField('vaultFieldsLive')}
                onRemove={(i) => removeVaultField('vaultFieldsLive', i)}
                onUpdate={(i, k, v) => updateVaultField('vaultFieldsLive', i, k, v)}
              />
            )}

            {/* Vault Fields – Test */}
            {activeSection === 'vault-test' && (
              <VaultFieldList
                label="Vault Fields — Test / Sandbox credentials"
                fields={cs.vaultFieldsTest}
                onAdd={() => addVaultField('vaultFieldsTest')}
                onRemove={(i) => removeVaultField('vaultFieldsTest', i)}
                onUpdate={(i, k, v) => updateVaultField('vaultFieldsTest', i, k, v)}
              />
            )}

            {/* Webhook Fields */}
            {activeSection === 'webhook-fields' && (
              <VaultFieldList
                label="Webhook Fields (e.g. webhookSecret — stored in Vault, not environment-specific)"
                fields={cs.webhookFields}
                onAdd={() => addVaultField('webhookFields')}
                onRemove={(i) => removeVaultField('webhookFields', i)}
                onUpdate={(i, k, v) => updateVaultField('webhookFields', i, k, v)}
              />
            )}

            {/* Payment Methods */}
            {activeSection === 'payment-methods' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted">Payment methods shown in the checkout UI (card, google_pay, apple_pay, etc.)</p>
                  <button onClick={addPaymentMethod}
                    className="px-3 py-1 text-xs bg-accent/15 text-accent hover:bg-accent/25 rounded-md transition-colors">
                    + Add Method
                  </button>
                </div>
                {cs.paymentMethods.length === 0 ? (
                  <EmptyState label="No payment methods. Click + Add Method to add one." />
                ) : (
                  <div className="space-y-2">
                    {cs.paymentMethods.map((pm, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto_auto] gap-2 items-center p-3 bg-surface border border-border rounded-lg">
                        <SmallField placeholder="key e.g. card" value={pm.key} onChange={(v) => updatePaymentMethod(i, 'key', v)} />
                        <SmallField placeholder="Label e.g. Card" value={pm.label} onChange={(v) => updatePaymentMethod(i, 'label', v)} />
                        <SmallField placeholder="Logo URL" value={pm.logo} onChange={(v) => updatePaymentMethod(i, 'logo', v)} />
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted whitespace-nowrap">Active</span>
                          <ToggleBtn value={pm.isActive} onChange={(v) => updatePaymentMethod(i, 'isActive', v)} size="sm" />
                        </div>
                        <button onClick={() => removePaymentMethod(i)} className="text-danger/60 hover:text-danger text-sm">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Webhook URL Property */}
            {activeSection === 'webhook-url' && (
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-surface border border-border rounded-lg">
                  <ToggleBtn value={cs.hasWebhookUrl} onChange={(v) => setCS('hasWebhookUrl', v)} />
                  <div>
                    <div className="text-sm text-white">Include Webhook URL property</div>
                    <div className="text-xs text-muted">Shows a webhookUrl field in the tenant gateway config form</div>
                  </div>
                </label>
                {cs.hasWebhookUrl && (
                  <div className="grid grid-cols-2 gap-3 pl-1">
                    <Field label="Description" value={cs.webhookUrlDescription}
                      onChange={(v) => setCS('webhookUrlDescription', v)} placeholder="Webhook URL for receiving events" />
                    <div className="flex flex-col justify-end">
                      <label className="text-xs text-muted mb-1.5">Required</label>
                      <div className="flex items-center gap-2">
                        <ToggleBtn value={cs.webhookUrlRequired} onChange={(v) => setCS('webhookUrlRequired', v)} />
                        <span className="text-sm text-white">{cs.webhookUrlRequired ? 'Required' : 'Optional'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name || !form.code}
            className="px-5 py-2 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors">
            {saving ? 'Saving...' : editGateway ? 'Update Gateway' : 'Create Gateway'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Gateway" size="sm">
        <div className="p-5">
          <p className="text-sm text-slate-300">Delete <span className="font-semibold text-white">{deleteTarget?.name}</span>?</p>
          <p className="text-xs text-danger mt-2">⚠️ This will affect all tenants that have this gateway configured.</p>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
          <button onClick={handleDelete} disabled={deleting}
            className="px-4 py-2 text-sm bg-danger hover:bg-red-500 disabled:opacity-50 text-white rounded-lg">
            {deleting ? 'Deleting...' : 'Delete Gateway'}
          </button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import Gateways from JSON" size="lg">
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted mb-2 block">Upload JSON file or paste below</label>
            <input type="file" accept=".json"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = (ev) => setImportText(ev.target?.result as string); r.readAsText(f) } }}
              className="text-sm text-muted file:mr-4 file:py-1.5 file:px-3 file:border file:border-border file:rounded-lg file:text-xs file:text-white file:bg-surface file:cursor-pointer hover:file:border-accent/50" />
          </div>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={12}
            placeholder={`[\n  {\n    "name": "Stripe",\n    "code": "stripe",\n    "isActive": true\n  }\n]`}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-muted focus:outline-none focus:border-accent resize-y" />
          <p className="text-xs text-muted">Accepts a JSON array of gateway objects. Existing gateways (matched by code) will be updated.</p>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
          <button onClick={handleImport} disabled={importing || !importText.trim()}
            className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg">
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-surface/60">
        <span className="text-xs font-semibold text-white uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, disabled, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted mb-1 block">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed" />
      {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
    </div>
  )
}

function SmallField({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-white placeholder:text-muted focus:outline-none focus:border-accent" />
  )
}

function ToggleBtn({ value, onChange, size = 'md' }: { value: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }) {
  const w = size === 'sm' ? 'w-8 h-4' : 'w-10 h-6'
  const dot = size === 'sm' ? 'w-3 h-3 top-0.5' : 'w-4 h-4 top-1'
  const on = size === 'sm' ? 'translate-x-4' : 'translate-x-5'
  const off = size === 'sm' ? 'translate-x-0.5' : 'translate-x-1'
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative ${w} rounded-full transition-colors shrink-0 ${value ? 'bg-success' : 'bg-border'}`}>
      <span className={`absolute ${dot} rounded-full bg-white transition-transform ${value ? on : off}`} />
    </button>
  )
}

function EmptyState({ label }: { label: string }) {
  return <div className="py-6 text-center text-xs text-muted border border-dashed border-border rounded-lg">{label}</div>
}

function VaultFieldList({ label, fields, onAdd, onRemove, onUpdate }: {
  label: string
  fields: VaultField[]
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, k: keyof VaultField, v: unknown) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted">{label}</p>
        <button onClick={onAdd} className="px-3 py-1 text-xs bg-accent/15 text-accent hover:bg-accent/25 rounded-md transition-colors">
          + Add Field
        </button>
      </div>
      {fields.length === 0 ? (
        <EmptyState label="No fields yet. Click + Add Field to define a credential." />
      ) : (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_80px_24px] gap-2 px-3">
            {['Key (camelCase)', 'Label (display name)', 'Masked?', ''].map((h) => (
              <span key={h} className="text-xs text-muted">{h}</span>
            ))}
          </div>
          {fields.map((f, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_80px_24px] gap-2 items-center p-3 bg-surface border border-border rounded-lg">
              <SmallField placeholder="e.g. apiKeyLive" value={f.key} onChange={(v) => onUpdate(i, 'key', v)} />
              <SmallField placeholder="e.g. API Key" value={f.label} onChange={(v) => onUpdate(i, 'label', v)} />
              <div className="flex items-center gap-2">
                <ToggleBtn value={f.isMasked} onChange={(v) => onUpdate(i, 'isMasked', v)} size="sm" />
                <span className="text-xs text-muted">{f.isMasked ? 'Yes' : 'No'}</span>
              </div>
              <button onClick={() => onRemove(i)} className="text-danger/60 hover:text-danger text-sm">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

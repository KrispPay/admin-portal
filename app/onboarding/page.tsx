'use client'

import { useEffect, useState, useCallback } from 'react'
import { onboardingApi } from '@/lib/api-client'
import Modal from '@/components/Modal'
import Toaster, { useToast, ToastData } from '@/components/Toast'

interface OnboardingOption {
  optionId: string
  title: string
  subtitle?: string
  icon?: string
  order: number
  isReady: boolean
  hasTextInput?: boolean
  textInputLabel?: string
  isParent?: boolean
  childQuestion?: string
}

interface OnboardingStep {
  id: string
  stepNumber: number
  title: string
  question: string
  type: 'SINGLE_SELECT' | 'MULTI_SELECT' | 'COUNTRY_SELECT'
  isRequired: boolean
  isActive: boolean
  options: OnboardingOption[]
  createdAt: string
}

type StepType = 'SINGLE_SELECT' | 'MULTI_SELECT' | 'COUNTRY_SELECT'

interface StepForm {
  stepNumber: number
  title: string
  question: string
  type: StepType
  isRequired: boolean
  isActive: boolean
  options: OnboardingOption[]
}

const EMPTY_STEP: StepForm = {
  stepNumber: 1,
  title: '',
  question: '',
  type: 'SINGLE_SELECT',
  isRequired: true,
  isActive: true,
  options: [],
}

const EMPTY_OPTION: OnboardingOption = {
  optionId: '',
  title: '',
  subtitle: '',
  icon: '',
  order: 0,
  isReady: true,
}

export default function OnboardingPage() {
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editStep, setEditStep] = useState<OnboardingStep | null>(null)
  const [form, setForm] = useState<StepForm>(EMPTY_STEP)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<OnboardingStep | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  const { toasts, toast, dismiss } = useToast() as any

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await onboardingApi.list() as any
      setSteps((res.data || []).sort((a: OnboardingStep, b: OnboardingStep) => a.stepNumber - b.stepNumber))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditStep(null)
    const nextNum = steps.length > 0 ? Math.max(...steps.map((s) => s.stepNumber)) + 1 : 1
    setForm({ ...EMPTY_STEP, stepNumber: nextNum })
    setShowModal(true)
  }

  function openEdit(step: OnboardingStep) {
    setEditStep(step)
    setForm({
      stepNumber: step.stepNumber,
      title: step.title,
      question: step.question,
      type: step.type,
      isRequired: step.isRequired,
      isActive: step.isActive,
      options: step.options?.map((o) => ({ ...o })) || [],
    })
    setShowModal(true)
  }

  function addOption() {
    const nextOrder = form.options.length
    setForm((f) => ({
      ...f,
      options: [
        ...f.options,
        { ...EMPTY_OPTION, order: nextOrder, optionId: `option_${Date.now()}` },
      ],
    }))
  }

  function removeOption(idx: number) {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))
  }

  function updateOption(idx: number, field: keyof OnboardingOption, value: unknown) {
    setForm((f) => {
      const opts = [...f.options]
      opts[idx] = { ...opts[idx], [field]: value }
      return { ...f, options: opts }
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        stepNumber: form.stepNumber,
        title: form.title,
        question: form.question,
        type: form.type,
        isRequired: form.isRequired,
        isActive: form.isActive,
        options: form.options.map((o, i) => ({ ...o, order: i })),
      }
      if (editStep) {
        await onboardingApi.update(editStep.stepNumber, payload)
        toast('success', `Step ${form.stepNumber} updated`)
      } else {
        await onboardingApi.create(payload)
        toast('success', `Step ${form.stepNumber} created`)
      }
      setShowModal(false)
      load()
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
      await onboardingApi.delete(deleteTarget.stepNumber)
      toast('success', `Step ${deleteTarget.stepNumber} deleted`)
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      toast('error', e.message)
    } finally {
      setDeleting(false)
    }
  }

  async function handleImport() {
    setImporting(true)
    try {
      const items = JSON.parse(importText)
      const arr = Array.isArray(items) ? items : [items]
      let created = 0
      let updated = 0
      for (const item of arr) {
        const existing = steps.find((s) => s.stepNumber === item.stepNumber)
        try {
          if (existing) {
            await onboardingApi.update(item.stepNumber, item)
            updated++
          } else {
            await onboardingApi.create(item)
            created++
          }
        } catch {
          // continue
        }
      }
      toast('success', `Import done: ${created} created, ${updated} updated`)
      setShowImport(false)
      setImportText('')
      load()
    } catch (e: any) {
      toast('error', `Import failed: ${e.message}`)
    } finally {
      setImporting(false)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImportText(ev.target?.result as string)
    reader.readAsText(file)
  }

  function exportSteps() {
    const blob = new Blob([JSON.stringify(steps, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'onboarding-steps.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const TYPE_COLORS: Record<string, string> = {
    SINGLE_SELECT: 'bg-blue-500/15 text-blue-400',
    MULTI_SELECT: 'bg-purple-500/15 text-purple-400',
    COUNTRY_SELECT: 'bg-emerald-500/15 text-emerald-400',
  }

  return (
    <div className="p-8">
      <Toaster toasts={toasts as ToastData[]} onDismiss={dismiss} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Onboarding Steps</h1>
          <p className="text-muted text-sm mt-0.5">{steps.length} step(s) configured</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="px-3 py-2 text-sm text-muted border border-border rounded-lg hover:border-accent/50 hover:text-white transition-all">
            ↑ Import JSON
          </button>
          <button onClick={exportSteps} className="px-3 py-2 text-sm text-muted border border-border rounded-lg hover:border-accent/50 hover:text-white transition-all">
            ↓ Export
          </button>
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors">
            + Add Step
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-16" />
          ))}
        </div>
      ) : steps.length === 0 ? (
        <div className="text-center py-16 text-muted">No onboarding steps found. Create one to get started.</div>
      ) : (
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Step Header */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/15 text-accent font-bold text-sm shrink-0">
                  {step.stepNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{step.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[step.type] || 'bg-muted/15 text-muted'}`}>
                      {step.type}
                    </span>
                    {!step.isActive && (
                      <span className="px-2 py-0.5 rounded text-xs bg-muted/15 text-muted">Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5 truncate">{step.question}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted">{step.options?.length || 0} options</span>
                  <button
                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    className="text-xs text-muted hover:text-white px-2 py-1 border border-border rounded-md hover:border-accent/50 transition-all"
                  >
                    {expandedStep === step.id ? '▲ Hide' : '▼ Options'}
                  </button>
                  <button onClick={() => openEdit(step)} className="text-xs text-muted hover:text-white px-2 py-1 border border-border rounded-md hover:border-accent/50 transition-all">
                    Edit
                  </button>
                  <button onClick={() => setDeleteTarget(step)} className="text-xs text-danger/70 hover:text-danger px-2 py-1 border border-danger/20 hover:border-danger/50 rounded-md transition-all">
                    Delete
                  </button>
                </div>
              </div>

              {/* Options Expand */}
              {expandedStep === step.id && (
                <div className="border-t border-border px-5 py-3">
                  {!step.options?.length ? (
                    <p className="text-xs text-muted">No options</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {step.options.map((opt) => (
                        <div key={opt.optionId} className="flex items-center gap-2 px-3 py-2 bg-surface rounded-lg border border-border">
                          {opt.icon && <span className="text-base">{opt.icon}</span>}
                          <div className="min-w-0">
                            <div className="text-xs text-white truncate">{opt.title}</div>
                            {opt.subtitle && <div className="text-xs text-muted truncate">{opt.subtitle}</div>}
                          </div>
                          {!opt.isReady && (
                            <span className="text-xs text-amber-400 ml-auto shrink-0">Soon</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editStep ? `Edit Step ${editStep.stepNumber}` : 'Add Onboarding Step'} size="xl">
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted mb-1 block">Step Number *</label>
              <input
                type="number"
                value={form.stepNumber}
                onChange={(e) => setForm((f) => ({ ...f, stepNumber: parseInt(e.target.value) || 1 }))}
                disabled={!!editStep}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              >
                <option value="SINGLE_SELECT">Single Select</option>
                <option value="MULTI_SELECT">Multi Select</option>
                <option value="COUNTRY_SELECT">Country Select</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="User Type"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Question *</label>
            <input
              type="text"
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="Which best describes you?"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-6">
            <Toggle label="Required" value={form.isRequired} onChange={(v) => setForm((f) => ({ ...f, isRequired: v }))} />
            <Toggle label="Active" value={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-muted uppercase tracking-wider">Options ({form.options.length})</label>
              <button onClick={addOption} className="text-xs px-3 py-1 bg-accent/15 text-accent hover:bg-accent/25 rounded-md transition-colors">
                + Add Option
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {form.options.map((opt, i) => (
                <div key={i} className="bg-surface border border-border rounded-lg p-3">
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="text-xs text-muted block mb-1">Option ID</label>
                      <input
                        type="text"
                        value={opt.optionId}
                        onChange={(e) => updateOption(i, 'optionId', e.target.value)}
                        placeholder="travelBusiness"
                        className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-white placeholder:text-muted focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted block mb-1">Title *</label>
                      <input
                        type="text"
                        value={opt.title}
                        onChange={(e) => updateOption(i, 'title', e.target.value)}
                        placeholder="Travel Business"
                        className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-white placeholder:text-muted focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted block mb-1">Icon (emoji)</label>
                      <input
                        type="text"
                        value={opt.icon || ''}
                        onChange={(e) => updateOption(i, 'icon', e.target.value)}
                        placeholder="✈️"
                        className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-white placeholder:text-muted focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-muted block mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={opt.subtitle || ''}
                        onChange={(e) => updateOption(i, 'subtitle', e.target.value)}
                        placeholder="Tours, trips..."
                        className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-white placeholder:text-muted focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mb-0.5">
                      <label className="text-xs text-muted">Ready</label>
                      <button
                        type="button"
                        onClick={() => updateOption(i, 'isReady', !opt.isReady)}
                        className={`relative w-8 h-4 rounded-full transition-colors ${opt.isReady ? 'bg-success' : 'bg-border'}`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${opt.isReady ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <button onClick={() => removeOption(i)} className="text-danger/70 hover:text-danger text-sm ml-1">✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title || !form.question}
            className="px-5 py-2 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg"
          >
            {saving ? 'Saving...' : editStep ? 'Update Step' : 'Create Step'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Step" size="sm">
        <div className="p-5">
          <p className="text-sm text-slate-300">
            Delete Step {deleteTarget?.stepNumber}: <span className="font-semibold text-white">{deleteTarget?.title}</span>?
          </p>
          <p className="text-xs text-danger mt-2">⚠️ This will permanently delete the step and all its options.</p>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm bg-danger hover:bg-red-500 disabled:opacity-50 text-white rounded-lg">
            {deleting ? 'Deleting...' : 'Delete Step'}
          </button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import Onboarding Steps" size="lg">
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-muted mb-2 block">Upload JSON file or paste below</label>
            <input type="file" accept=".json" onChange={handleFileUpload} className="text-sm text-muted file:mr-4 file:py-1.5 file:px-3 file:border file:border-border file:rounded-lg file:text-xs file:text-white file:bg-surface file:cursor-pointer hover:file:border-accent/50" />
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={12}
            placeholder={`[\n  {\n    "stepNumber": 1,\n    "title": "User Type",\n    "question": "Which best describes you?",\n    "type": "SINGLE_SELECT",\n    "isRequired": true,\n    "options": []\n  }\n]`}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-white placeholder:text-muted focus:outline-none focus:border-accent resize-y"
          />
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-border">
          <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
          <button onClick={handleImport} disabled={importing || !importText.trim()} className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg">
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">{label}</span>
      <button type="button" onClick={() => onChange(!value)} className={`relative w-10 h-6 rounded-full transition-colors ${value ? 'bg-success' : 'bg-border'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

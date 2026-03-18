'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  loadEnvs,
  saveEnvs,
  loadActiveEnvIndex,
  saveActiveEnvIndex,
  EnvConfig,
  DEFAULT_ENVS,
} from '@/lib/env-store'

const NAV = [
  { href: '/', label: 'Dashboard', icon: '⚡' },
  { href: '/gateways', label: 'Payment Gateways', icon: '💳' },
  { href: '/onboarding', label: 'Onboarding Steps', icon: '🪜' },
  { href: '/seed', label: 'Seed & Import', icon: '🌱' },
]

const ENV_COLORS: Record<string, string> = {
  Local: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  Dev: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  Staging: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  Live: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
}

export default function Sidebar() {
  const pathname = usePathname()
  const [envs, setEnvs] = useState<EnvConfig[]>(DEFAULT_ENVS)
  const [activeIdx, setActiveIdx] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [editEnvs, setEditEnvs] = useState<EnvConfig[]>(DEFAULT_ENVS)

  useEffect(() => {
    setEnvs(loadEnvs())
    setActiveIdx(loadActiveEnvIndex())
  }, [])

  const activeEnv = envs[activeIdx] || envs[0]

  function switchEnv(idx: number) {
    setActiveIdx(idx)
    saveActiveEnvIndex(idx)
    window.location.reload()
  }

  function openSettings() {
    setEditEnvs(JSON.parse(JSON.stringify(envs)))
    setShowSettings(true)
  }

  function saveSettings() {
    setEnvs(editEnvs)
    saveEnvs(editEnvs)
    setShowSettings(false)
    window.location.reload()
  }

  function updateEditEnv(idx: number, field: keyof EnvConfig, value: string) {
    setEditEnvs((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  return (
    <>
      <aside className="flex flex-col w-60 min-h-screen bg-surface border-r border-border">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white text-xs font-bold">
              K
            </div>
            <div>
              <div className="text-sm font-semibold text-white">KrispPay</div>
              <div className="text-xs text-muted">Super Admin</div>
            </div>
          </div>
        </div>

        {/* Active Environment Badge */}
        <div className="px-4 pt-4 pb-2">
          <div className="text-xs text-muted mb-2 uppercase tracking-wider">Environment</div>
          <div className="flex flex-wrap gap-1">
            {envs.map((e, i) => (
              <button
                key={i}
                onClick={() => switchEnv(i)}
                title={e.url || 'Not configured'}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                  i === activeIdx
                    ? ENV_COLORS[e.label] || 'bg-accent/20 text-accent border border-accent/30'
                    : 'text-muted hover:text-white'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
          {activeEnv && (
            <div className="mt-2 text-xs text-muted truncate" title={activeEnv.url}>
              {activeEnv.url || <span className="text-amber-400">URL not set</span>}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {NAV.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-accent/15 text-white font-medium'
                    : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Settings */}
        <div className="px-3 py-3 border-t border-border">
          <button
            onClick={openSettings}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-muted hover:text-white hover:bg-white/5 transition-all"
          >
            <span>⚙️</span> Settings
          </button>
        </div>
      </aside>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-white">Environment Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-muted hover:text-white text-xl">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-6">
              {editEnvs.map((env, i) => (
                <div key={i} className="space-y-3">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        ENV_COLORS[env.label] || 'bg-accent/20 text-accent'
                      }`}
                    >
                      {env.label}
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted mb-1 block">API Base URL</label>
                      <input
                        type="text"
                        value={env.url}
                        onChange={(e) => updateEditEnv(i, 'url', e.target.value)}
                        placeholder="http://localhost:3030"
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted mb-1 block">Super Admin API Key</label>
                      <input
                        type="password"
                        value={env.adminKey}
                        onChange={(e) => updateEditEnv(i, 'adminKey', e.target.value)}
                        placeholder="sa_your-secret-key"
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-border">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-muted hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
              >
                Save & Reload
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

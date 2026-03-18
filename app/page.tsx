'use client'

import { useEffect, useState } from 'react'
import { gatewayApi, onboardingApi } from '@/lib/api-client'
import { getActiveEnv } from '@/lib/env-store'
import Link from 'next/link'

interface Stats {
  gateways: { total: number; active: number }
  onboardingSteps: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [env, setEnv] = useState({ label: '', url: '' })

  useEffect(() => {
    const e = getActiveEnv()
    setEnv({ label: e.label, url: e.url })
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    setError('')
    try {
      const [gw, ob] = await Promise.allSettled([
        gatewayApi.list(),
        onboardingApi.list(),
      ])

      const gwData = gw.status === 'fulfilled' ? (gw.value as any).data || [] : []
      const obData = ob.status === 'fulfilled' ? (ob.value as any).data || [] : []

      setStats({
        gateways: {
          total: gwData.length,
          active: gwData.filter((g: any) => g.isActive).length,
        },
        onboardingSteps: obData.length,
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const statCards = stats
    ? [
        {
          label: 'Payment Gateways',
          value: stats.gateways.total,
          sub: `${stats.gateways.active} active`,
          href: '/gateways',
          color: 'text-indigo-400',
          icon: '💳',
        },
        {
          label: 'Onboarding Steps',
          value: stats.onboardingSteps,
          sub: 'configured',
          href: '/onboarding',
          color: 'text-amber-400',
          icon: '🪜',
        },
      ]
    : []

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-muted text-sm mt-1">
            KrispPay Super Admin — connected to{' '}
            <span className="text-white font-medium">{env.label || '...'}</span>
            {env.url && <span className="text-muted ml-1">({env.url})</span>}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="px-3 py-1.5 text-sm text-muted hover:text-white border border-border rounded-lg hover:border-accent/50 transition-all"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg border border-danger/30 bg-danger/10 text-danger text-sm">
          {error.includes('URL not configured') || error.includes('API key')
            ? '⚠️ ' + error + ' — click Settings in the sidebar to configure.'
            : '⚠️ ' + error}
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-3 bg-border rounded w-2/3 mb-4" />
              <div className="h-8 bg-border rounded w-1/3 mb-2" />
              <div className="h-3 bg-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 mb-10">
          {statCards.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="bg-card border border-border rounded-xl p-5 hover:border-accent/40 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.icon}</span>
              </div>
              <div className={`text-3xl font-bold mb-1 ${s.color}`}>{s.value}</div>
              <div className="text-sm text-white">{s.label}</div>
              <div className="text-xs text-muted mt-0.5">{s.sub}</div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/gateways', label: 'Manage Gateways', icon: '💳' },
            { href: '/onboarding', label: 'Edit Onboarding', icon: '🪜' },
            { href: '/seed', label: 'Seed / Import', icon: '🌱' },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl text-sm text-muted hover:text-white hover:border-accent/40 transition-all"
            >
              <span className="text-lg">{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* API Endpoints Reference */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Super Admin API Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {[
            ['GET',    'gw-list',   '/api/v1/admin/payment-gateways',     'List all gateways'],
            ['POST',   'gw-create', '/api/v1/admin/payment-gateways',     'Create gateway'],
            ['PUT',    'gw-update', '/api/v1/admin/payment-gateways/:id', 'Update gateway'],
            ['DELETE', 'gw-delete', '/api/v1/admin/payment-gateways/:id', 'Delete gateway'],
            ['GET',    'ob-list',   '/api/v1/admin/onboarding',           'List onboarding steps'],
            ['POST',   'ob-create', '/api/v1/admin/onboarding',           'Create step'],
            ['PUT',    'ob-update', '/api/v1/admin/onboarding/:id',       'Update step'],
            ['DELETE', 'ob-delete', '/api/v1/admin/onboarding/:id',       'Delete step'],
            ['POST',   'seed-gw',   '/api/v1/seed/payment-gateways',      'Seed gateways from file'],
            ['POST',   'seed-all',  '/api/v1/seed/all',                   'Seed all data'],
          ].map(([method, key, path, desc]) => (
            <div key={key} className="flex items-center gap-2 text-muted">
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-bold shrink-0 ${
                  method === 'GET'
                    ? 'bg-blue-500/20 text-blue-400'
                    : method === 'POST'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : method === 'PUT'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {method}
              </span>
              <span className="text-white/70 truncate" title={desc}>
                {path}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

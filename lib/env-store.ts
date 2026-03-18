'use client'

export interface EnvConfig {
  label: string
  url: string
  adminKey: string
}

export const DEFAULT_ENVS: EnvConfig[] = [
  { label: 'Local', url: 'http://localhost:3030', adminKey: '' },
  { label: 'Dev', url: '', adminKey: '' },
  { label: 'Staging', url: '', adminKey: '' },
  { label: 'Live', url: '', adminKey: '' },
]

const STORAGE_KEY = 'kp_admin_envs'
const ACTIVE_KEY = 'kp_admin_active_env'

export function loadEnvs(): EnvConfig[] {
  if (typeof window === 'undefined') return DEFAULT_ENVS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_ENVS
  } catch {
    return DEFAULT_ENVS
  }
}

export function saveEnvs(envs: EnvConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(envs))
}

export function loadActiveEnvIndex(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(ACTIVE_KEY) || '0', 10)
}

export function saveActiveEnvIndex(idx: number) {
  localStorage.setItem(ACTIVE_KEY, String(idx))
}

export function getActiveEnv(): EnvConfig {
  const envs = loadEnvs()
  const idx = loadActiveEnvIndex()
  return envs[idx] || envs[0]
}

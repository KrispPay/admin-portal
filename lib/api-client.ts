'use client'

import { getActiveEnv } from './env-store'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  queryParams?: Record<string, string>,
): Promise<T> {
  const env = getActiveEnv()

  if (!env.url) throw new ApiError(0, 'No environment URL configured. Check Settings.')
  if (!env.adminKey) throw new ApiError(0, 'No Admin API key configured. Check Settings.')

  let proxyPath = path.startsWith('/') ? path.slice(1) : path
  const qs = queryParams
    ? '?' + new URLSearchParams(queryParams).toString()
    : ''

  const res = await fetch(`/api/proxy/${proxyPath}${qs}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-target-url': env.url,
      'x-admin-key': env.adminKey,
      ...(options.headers as Record<string, string> | undefined),
    },
  })

  const data = await res.json().catch(() => ({ error: 'Non-JSON response' }))

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`
    throw new ApiError(res.status, msg, data)
  }

  return data as T
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>(path, { method: 'GET' }, params),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(path: string, params?: Record<string, string>) =>
    request<T>(path, { method: 'DELETE' }, params),
}

// ── Payment Gateways ──────────────────────────────────────────────────────────
export const gatewayApi = {
  list: () => api.get<any>('api/v1/admin/payment-gateways'),
  get: (id: string) => api.get<any>(`api/v1/admin/payment-gateways/${id}`),
  create: (body: unknown) => api.post<any>('api/v1/admin/payment-gateways', body),
  update: (id: string, body: unknown) =>
    api.put<any>(`api/v1/admin/payment-gateways/${id}`, body),
  delete: (id: string) => api.delete<any>(`api/v1/admin/payment-gateways/${id}`),
}

// ── Onboarding Steps ──────────────────────────────────────────────────────────
export const onboardingApi = {
  list: () => api.get<any>('api/v1/admin/onboarding'),
  get: (stepNumber: number) => api.get<any>(`api/v1/admin/onboarding/${stepNumber}`),
  create: (body: unknown) => api.post<any>('api/v1/admin/onboarding', body),
  update: (stepNumber: number, body: unknown) =>
    api.put<any>(`api/v1/admin/onboarding/${stepNumber}`, body),
  delete: (stepNumber: number) => api.delete<any>(`api/v1/admin/onboarding/${stepNumber}`),
}

// ── Seed ──────────────────────────────────────────────────────────────────────
export const seedApi = {
  gateways: () => api.post<any>('api/v1/seed/payment-gateways', {}),
  onboarding: () => api.post<any>('api/v1/seed/onboarding-steps', {}),
  all: (tenantId?: string) =>
    api.post<any>('api/v1/seed/all', tenantId ? { tenantId } : {}),
}

'use client'

import { useEffect, useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastData {
  id: string
  type: ToastType
  message: string
}

interface Props {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const STYLES: Record<ToastType, string> = {
  success: 'border-success/30 bg-success/10',
  error: 'border-danger/30 bg-danger/10',
  info: 'border-accent/30 bg-accent/10',
}

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm shadow-xl max-w-sm ${STYLES[toast.type]}`}
    >
      <span className={`font-bold mt-0.5 ${ICON_STYLES[toast.type]}`}>{ICONS[toast.type]}</span>
      <span className="text-white flex-1">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="text-muted hover:text-white ml-2 shrink-0">
        ✕
      </button>
    </div>
  )
}

export default function Toaster({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}

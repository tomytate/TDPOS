'use client'

import { useState } from 'react'
import { createClientOperationId } from '@tdpos/shared'

import { getBrowserSupabase } from '@/lib/supabase/client'

type ExportStatus =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

interface TenantExportPayload {
  ok: true
  generated_at: string
  business_id: string
  data: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTenantExportPayload(value: unknown): value is TenantExportPayload {
  return (
    isRecord(value) &&
    value.ok === true &&
    typeof value.generated_at === 'string' &&
    typeof value.business_id === 'string' &&
    isRecord(value.data)
  )
}

function safeDateStamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)

  return date.toISOString().slice(0, 10)
}

function knownFailureMessage(value: unknown): string {
  const errorCode = isRecord(value) && typeof value.error === 'string' ? value.error : null

  if (errorCode === 'forbidden') return 'Only an owner can export all tenant data.'
  if (errorCode === 'unauthenticated') return 'Sign in again before exporting tenant data.'
  if (errorCode === 'account_not_provisioned') {
    return 'Your account is signed in but is not connected to a business yet.'
  }
  if (errorCode === 'invalid_payload') {
    return 'The export request could not be prepared. Refresh the page and try again.'
  }

  return 'Tenant export failed. Confirm the Edge Function is deployed, then try again.'
}

function downloadJson(payload: TenantExportPayload): void {
  const filename = `tdpos-tenant-export-${safeDateStamp(payload.generated_at)}.json`
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function TenantDataExportButton() {
  const [status, setStatus] = useState<ExportStatus>({ kind: 'idle' })

  async function handleExport() {
    setStatus({ kind: 'running' })

    try {
      const supabase = getBrowserSupabase()
      const { data, error } = await supabase.functions.invoke('tenant-data-export', {
        body: { client_operation_id: createClientOperationId() },
      })

      if (error) {
        setStatus({ kind: 'error', message: knownFailureMessage(data) })
        return
      }

      if (!isTenantExportPayload(data)) {
        setStatus({
          kind: 'error',
          message: 'Tenant export returned an unexpected shape. Refresh the page and try again.',
        })
        return
      }

      downloadJson(data)
      setStatus({ kind: 'success', message: 'Tenant JSON export downloaded.' })
    } catch {
      setStatus({
        kind: 'error',
        message: 'Tenant export could not start. Check the Supabase environment and try again.',
      })
    }
  }

  const isRunning = status.kind === 'running'

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg border border-ink-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-700 shadow-sm transition-colors hover:bg-ink-50 disabled:cursor-wait disabled:opacity-70"
        disabled={isRunning}
        onClick={handleExport}
        title="Owner-only JSON export for tenant data portability"
      >
        <span aria-hidden>↓</span>
        {isRunning ? 'Preparing tenant data' : 'Export tenant data'}
      </button>
      {status.kind === 'success' || status.kind === 'error' ? (
        <p
          aria-live="polite"
          className={`m-0 max-w-[18rem] text-[11px] ${
            status.kind === 'success' ? 'text-success-600' : 'text-danger-600'
          }`}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  )
}

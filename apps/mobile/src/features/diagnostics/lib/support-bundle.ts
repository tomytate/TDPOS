import type { AsyncSqliteLike } from '@/db/async-sqlite'

import type { DiagnosticsMetadata } from './diagnostics-metadata'
import type { SyncHealth } from './sync-health'

const DEFAULT_ERROR_LIMIT = 10

interface SyncErrorRow {
  id: number
  client_operation_id: string
  table_name: string
  operation: string
  retry_count: number
  last_error: string | null
  created_at: number
}

export interface SyncErrorSummary {
  queueId: number
  operationRef: string
  tableName: string
  operation: string
  retryCount: number
  lastError: string
  createdAt: number
}

export interface SupportBundleInput {
  metadata: DiagnosticsMetadata
  health: SyncHealth
  recentErrors: SyncErrorSummary[]
  generatedAt: Date
}

export async function getRecentSyncErrors(
  db: AsyncSqliteLike,
  limit = DEFAULT_ERROR_LIMIT,
): Promise<SyncErrorSummary[]> {
  const rows = await db.getAllAsync<SyncErrorRow>(
    `
      SELECT
        id,
        client_operation_id,
        table_name,
        operation,
        retry_count,
        last_error,
        created_at
      FROM sync_queue
      WHERE last_error IS NOT NULL
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [limit],
  )

  return rows.map((row) => ({
    queueId: row.id,
    operationRef: tailRef(row.client_operation_id),
    tableName: row.table_name,
    operation: row.operation,
    retryCount: row.retry_count,
    lastError: sanitizeDiagnosticText(row.last_error ?? 'unknown_error'),
    createdAt: row.created_at,
  }))
}

export function buildSupportBundle(input: SupportBundleInput): string {
  const { metadata, health, recentErrors, generatedAt } = input
  const lines = [
    'TD POS Support Bundle',
    `Generated: ${generatedAt.toISOString()}`,
    '',
    '[App]',
    `Version: ${metadata.appVersion}`,
    `Schema: ${metadata.schemaVersion ?? 'unknown'}`,
    `Install ID: ${metadata.installId}`,
    `Role: ${metadata.role ?? 'unknown'}`,
    `Branch: ${metadata.branchCode ?? 'unknown'}`,
    `Cashier: ${metadata.cashierCode ?? 'unknown'}`,
    `MMKV: ${metadata.mmkvSizeBytes} bytes / ${metadata.mmkvKeyCount} keys`,
    '',
    '[Sync]',
    `Total rows: ${health.totalRows}`,
    `Synced rows: ${health.syncedRows}`,
    `Unsynced rows: ${health.unsyncedRows}`,
    `Pending rows: ${health.pendingRows}`,
    `Retrying rows: ${health.failedRows}`,
    `Review rows: ${health.reviewableRows}`,
    `Max retry count: ${health.maxRetryCount}`,
    `Last successful sync: ${formatEpochSeconds(health.lastSuccessfulSyncAt)}`,
    `Oldest pending row: ${formatEpochSeconds(health.oldestPendingCreatedAt)}`,
    `Latest error: ${sanitizeDiagnosticText(health.latestError ?? 'none')}`,
    '',
    '[Recent Sync Errors]',
  ]

  if (recentErrors.length === 0) {
    lines.push('none')
  } else {
    for (const error of recentErrors) {
      lines.push(
        [
          `#${error.queueId}`,
          error.operationRef,
          error.tableName,
          error.operation,
          `retry=${error.retryCount}`,
          formatEpochSeconds(error.createdAt),
          error.lastError,
        ].join(' | '),
      )
    }
  }

  return `${lines.join('\n')}\n`
}

export function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\+?63\d{10}\b/g, '[phone]')
    .replace(/\b09\d{9}\b/g, '[phone]')
}

function formatEpochSeconds(value: number | null): string {
  if (!value) return 'never'
  return new Date(value * 1000).toISOString()
}

function tailRef(value: string): string {
  return value.length > 8 ? `...${value.slice(-8)}` : value
}

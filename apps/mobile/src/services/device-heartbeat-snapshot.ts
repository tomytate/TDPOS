import type { AsyncSqliteLike } from '@/db/async-sqlite'
import { getSyncHealth, type SyncHealth } from '@/features/diagnostics/lib/sync-health'

export interface ReceiptSequenceSnapshot {
  branch_code: string
  cashier_code: string
  date: string
  last_sequence: number
}

async function getReceiptSequenceSnapshot(db: AsyncSqliteLike): Promise<ReceiptSequenceSnapshot[]> {
  const rows = await db.getAllAsync<ReceiptSequenceSnapshot>(
    `SELECT branch_code, cashier_code, date, last_sequence
       FROM receipt_sequence
      ORDER BY date DESC, branch_code ASC, cashier_code ASC
      LIMIT 20`,
    [],
  )

  return rows.map((row) => ({
    branch_code: row.branch_code,
    cashier_code: row.cashier_code,
    date: row.date,
    last_sequence: row.last_sequence,
  }))
}

export async function buildDeviceSyncSnapshot(db?: AsyncSqliteLike) {
  let health: SyncHealth | null = null
  let receiptSequences: ReceiptSequenceSnapshot[] = []

  if (db) {
    const snapshotParts = await Promise.all([getSyncHealth(db), getReceiptSequenceSnapshot(db)])
    health = snapshotParts[0]
    receiptSequences = snapshotParts[1]
  }

  if (!health) {
    return {
      available: false,
      reason: 'local_sqlite_unavailable',
      receipt_sequences: receiptSequences,
    }
  }

  return {
    available: true,
    total_rows: health.totalRows,
    synced_rows: health.syncedRows,
    unsynced_rows: health.unsyncedRows,
    pending_rows: health.pendingRows,
    failed_rows: health.failedRows,
    reviewable_rows: health.reviewableRows,
    max_retry_count: health.maxRetryCount,
    last_successful_sync_at: health.lastSuccessfulSyncAt,
    oldest_pending_created_at: health.oldestPendingCreatedAt,
    latest_error_at: health.latestErrorAt,
    receipt_sequences: receiptSequences,
  }
}

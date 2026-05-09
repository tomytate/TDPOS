import type { AsyncSqliteLike } from '@/db/async-sqlite'

const REVIEW_SENTINEL = 999

interface SyncHealthSummaryRow {
  total_rows: number | null
  synced_rows: number | null
  unsynced_rows: number | null
  pending_rows: number | null
  failed_rows: number | null
  reviewable_rows: number | null
  max_retry_count: number | null
  last_successful_sync_at: number | null
  oldest_pending_created_at: number | null
}

interface SyncHealthLatestErrorRow {
  last_error: string
  created_at: number
}

export interface SyncHealth {
  totalRows: number
  syncedRows: number
  unsyncedRows: number
  pendingRows: number
  failedRows: number
  reviewableRows: number
  maxRetryCount: number
  lastSuccessfulSyncAt: number | null
  oldestPendingCreatedAt: number | null
  latestError: string | null
  latestErrorAt: number | null
}

export async function getSyncHealth(db: AsyncSqliteLike): Promise<SyncHealth> {
  const summary = await db.getFirstAsync<SyncHealthSummaryRow>(
    `
      SELECT
        COUNT(*) AS total_rows,
        SUM(CASE WHEN synced_at IS NOT NULL THEN 1 ELSE 0 END) AS synced_rows,
        SUM(CASE WHEN synced_at IS NULL THEN 1 ELSE 0 END) AS unsynced_rows,
        SUM(CASE WHEN synced_at IS NULL AND retry_count = 0 THEN 1 ELSE 0 END) AS pending_rows,
        SUM(CASE
          WHEN synced_at IS NULL AND retry_count > 0 AND retry_count < ? THEN 1
          ELSE 0
        END) AS failed_rows,
        SUM(CASE
          WHEN synced_at IS NULL AND retry_count >= ? THEN 1
          ELSE 0
        END) AS reviewable_rows,
        COALESCE(MAX(retry_count), 0) AS max_retry_count,
        MAX(synced_at) AS last_successful_sync_at,
        MIN(CASE WHEN synced_at IS NULL THEN created_at ELSE NULL END) AS oldest_pending_created_at
      FROM sync_queue
    `,
    [REVIEW_SENTINEL, REVIEW_SENTINEL],
  )

  const latestError = await db.getFirstAsync<SyncHealthLatestErrorRow>(
    `
      SELECT last_error, created_at
      FROM sync_queue
      WHERE last_error IS NOT NULL
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [],
  )

  return {
    totalRows: toNumber(summary?.total_rows),
    syncedRows: toNumber(summary?.synced_rows),
    unsyncedRows: toNumber(summary?.unsynced_rows),
    pendingRows: toNumber(summary?.pending_rows),
    failedRows: toNumber(summary?.failed_rows),
    reviewableRows: toNumber(summary?.reviewable_rows),
    maxRetryCount: toNumber(summary?.max_retry_count),
    lastSuccessfulSyncAt: summary?.last_successful_sync_at ?? null,
    oldestPendingCreatedAt: summary?.oldest_pending_created_at ?? null,
    latestError: latestError?.last_error ?? null,
    latestErrorAt: latestError?.created_at ?? null,
  }
}

function toNumber(value: number | null | undefined): number {
  return Number(value ?? 0)
}

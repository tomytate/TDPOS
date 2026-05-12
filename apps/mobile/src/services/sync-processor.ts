/**
 * Foreground sync processor.
 *
 * Reads unsynced rows from the local `sync_queue`, validates each row's payload
 * against the discriminated `syncQueueEnvelopeSchema` from `@tdpos/shared`, and
 * dispatches DELTA rows to the `apply_inventory_delta` RPC and INSERT-sales
 * rows to the `create-sale` Edge Function.
 *
 * The processor is platform-agnostic: it accepts an `AsyncSqliteLike` and a
 * `SyncCallables` shape that hides the concrete Supabase client. That keeps it
 * unit-testable under bun:sqlite + a mocked client and lets the same code run
 * against the real `supabase-js` client at runtime.
 *
 * Concurrency / retry semantics:
 *   - Success                → `synced_at = now`, counted as `synced`.
 *   - `concurrent_in_progress` (server says retry) → row is left untouched,
 *     counted as `deferred`. retry_count is NOT incremented.
 *   - Server says `ok: false` (negative stock, tenant violation, etc.)
 *     → row is bumped to a sentinel `retry_count = 999` with a
 *       `pending_sync_review:<reason>` error so support can find it. No more
 *       auto-retries.
 *   - Transport / unknown error → retry_count + 1. The processor will retry
 *     on the next cycle until `maxRetries` is reached.
 *   - Invalid payload (Zod or JSON parse failure) → bumped to sentinel
 *     `retry_count = 999` with a `invalid_envelope:` error. Auto-retry stops.
 */

import { syncQueueEnvelopeSchema, type SyncSalePayload } from '@tdpos/shared'

import type { AsyncSqliteLike } from '@/db/async-sqlite'

interface SyncQueueRow {
  id: number
  client_operation_id: string
  table_name: string
  record_id: string
  operation: string
  payload: string
  retry_count: number
  synced_at: number | null
}

export interface SyncRpcResponse {
  ok?: boolean
  reason?: string
  retry_after_ms?: number
  replayed?: boolean
  new_stock_pieces?: number
  receipt_number?: string
}

export interface SyncCallables {
  applyInventoryDelta(params: {
    p_client_operation_id: string
    p_product_id: string
    p_branch_id: string
    p_delta: number
    p_reason: string
    p_log_type?: string
    p_reason_note?: string
    p_sale_id?: string
  }): Promise<{ data: SyncRpcResponse | null; error: { message: string } | null }>
  createSale(
    payload: SyncSalePayload,
  ): Promise<{ data: SyncRpcResponse | null; error: { message: string } | null }>
}

export interface SyncProcessorParams {
  db: AsyncSqliteLike
  callables: SyncCallables
  batchSize?: number
  maxRetries?: number
  now?: () => number
}

export interface SyncProcessorResult {
  total: number
  synced: number
  failed: number
  deferred: number
  reviewable: number
}

export const DEFAULT_SYNC_BATCH_SIZE = 50
export const MAX_SYNC_BATCH_SIZE = 50

const REVIEW_SENTINEL = 999

export async function processSyncQueue(params: SyncProcessorParams): Promise<SyncProcessorResult> {
  const {
    db,
    callables,
    batchSize = DEFAULT_SYNC_BATCH_SIZE,
    maxRetries = 10,
    now = () => Math.floor(Date.now() / 1000),
  } = params
  const effectiveBatchSize = normaliseBatchSize(batchSize)

  const rows = await db.getAllAsync<SyncQueueRow>(
    `SELECT id, client_operation_id, table_name, record_id, operation, payload, retry_count, synced_at
     FROM sync_queue
     WHERE synced_at IS NULL AND retry_count < ?
     ORDER BY created_at ASC, id ASC
     LIMIT ?`,
    [maxRetries, effectiveBatchSize],
  )

  let synced = 0
  let failed = 0
  let deferred = 0
  let reviewable = 0

  for (const row of rows) {
    let parsedPayload: unknown
    try {
      parsedPayload = JSON.parse(row.payload)
    } catch (err) {
      await markReviewable(db, row.id, `invalid_payload_json:${stringifyError(err)}`)
      reviewable += 1
      continue
    }

    const envelope = syncQueueEnvelopeSchema.safeParse({
      operation: row.operation,
      table_name: row.table_name,
      record_id: row.record_id,
      payload: parsedPayload,
    })

    if (!envelope.success) {
      await markReviewable(db, row.id, `invalid_envelope:${envelope.error.message}`)
      reviewable += 1
      continue
    }

    let response: { data: SyncRpcResponse | null; error: { message: string } | null }
    try {
      if (envelope.data.operation === 'DELTA') {
        const payload = envelope.data.payload
        response = await callables.applyInventoryDelta({
          p_client_operation_id: payload.client_operation_id,
          p_product_id: payload.product_id,
          p_branch_id: payload.branch_id,
          p_delta: payload.delta,
          p_reason: payload.reason,
          p_log_type: payload.log_type,
          p_reason_note: payload.reason_note,
          p_sale_id: payload.sale_id,
        })
      } else {
        response = await callables.createSale(envelope.data.payload)
      }
    } catch (err) {
      await incrementRetry(db, row.id, stringifyError(err))
      failed += 1
      continue
    }

    if (response.error) {
      await incrementRetry(db, row.id, response.error.message)
      failed += 1
      continue
    }

    if (response.data?.reason === 'concurrent_in_progress') {
      deferred += 1
      continue
    }

    if (response.data?.ok === false) {
      const reason = response.data.reason ?? 'unknown_failure'
      await markReviewable(db, row.id, `pending_sync_review:${reason}`)
      reviewable += 1
      continue
    }

    await db.runAsync(`UPDATE sync_queue SET synced_at = ?, last_error = NULL WHERE id = ?`, [
      now(),
      row.id,
    ])
    synced += 1
  }

  return { total: rows.length, synced, failed, deferred, reviewable }
}

async function incrementRetry(db: AsyncSqliteLike, id: number, error: string) {
  await db.runAsync(
    `UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
    [error, id],
  )
}

async function markReviewable(db: AsyncSqliteLike, id: number, error: string) {
  await db.runAsync(`UPDATE sync_queue SET retry_count = ?, last_error = ? WHERE id = ?`, [
    REVIEW_SENTINEL,
    error,
    id,
  ])
}

function stringifyError(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

function normaliseBatchSize(batchSize: number): number {
  if (!Number.isFinite(batchSize) || batchSize < 1) return DEFAULT_SYNC_BATCH_SIZE
  return Math.min(Math.floor(batchSize), MAX_SYNC_BATCH_SIZE)
}

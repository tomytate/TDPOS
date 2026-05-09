import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteLike } from '@/db/async-sqlite'
import { LOCAL_SCHEMA_SQL } from '@/db/schema'

import { getSyncHealth } from './sync-health'

function makeAdapter(sqlite: Database): AsyncSqliteLike {
  return {
    async runAsync(sql, params) {
      sqlite.prepare(sql).run(...(params as never[]))
    },
    async getFirstAsync<T>(sql: string, params: unknown[]) {
      const row = sqlite.prepare(sql).get(...(params as never[]))
      return (row ?? null) as T | null
    },
    async getAllAsync<T>(sql: string, params: unknown[]) {
      return sqlite.prepare(sql).all(...(params as never[])) as T[]
    },
    async withTransactionAsync(fn) {
      sqlite.exec('BEGIN')
      try {
        await fn()
        sqlite.exec('COMMIT')
      } catch (err) {
        sqlite.exec('ROLLBACK')
        throw err
      }
    },
  }
}

function freshDb(): { sqlite: Database; db: AsyncSqliteLike } {
  const sqlite = new Database(':memory:')
  sqlite.exec(LOCAL_SCHEMA_SQL)
  return { sqlite, db: makeAdapter(sqlite) }
}

function insertQueueRow(
  sqlite: Database,
  row: {
    opId: string
    createdAt: number
    syncedAt?: number | null
    retryCount?: number
    lastError?: string | null
  },
) {
  sqlite
    .prepare(
      `INSERT INTO sync_queue (
         client_operation_id, table_name, record_id, operation, payload,
         created_at, synced_at, retry_count, last_error
       ) VALUES (?, 'products', ?, 'DELTA', ?, ?, ?, ?, ?)`,
    )
    .run(
      row.opId,
      '11111111-1111-4111-8111-111111111111',
      JSON.stringify({
        client_operation_id: row.opId,
        product_id: '11111111-1111-4111-8111-111111111111',
        branch_id: '22222222-2222-4222-8222-222222222222',
        delta: -1,
        reason: 'sale',
      }),
      row.createdAt,
      row.syncedAt ?? null,
      row.retryCount ?? 0,
      row.lastError ?? null,
    )
}

describe('getSyncHealth', () => {
  test('returns zeroed health for an empty queue', async () => {
    const { db } = freshDb()

    await expect(getSyncHealth(db)).resolves.toEqual({
      totalRows: 0,
      syncedRows: 0,
      unsyncedRows: 0,
      pendingRows: 0,
      failedRows: 0,
      reviewableRows: 0,
      maxRetryCount: 0,
      lastSuccessfulSyncAt: null,
      oldestPendingCreatedAt: null,
      latestError: null,
      latestErrorAt: null,
    })
  })

  test('summarizes pending, failed, reviewable, and synced queue rows', async () => {
    const { sqlite, db } = freshDb()

    insertQueueRow(sqlite, {
      opId: '00000000-0000-4000-8000-000000000101',
      createdAt: 100,
      syncedAt: 120,
    })
    insertQueueRow(sqlite, {
      opId: '00000000-0000-4000-8000-000000000102',
      createdAt: 200,
    })
    insertQueueRow(sqlite, {
      opId: '00000000-0000-4000-8000-000000000103',
      createdAt: 210,
      retryCount: 2,
      lastError: 'network timeout',
    })
    insertQueueRow(sqlite, {
      opId: '00000000-0000-4000-8000-000000000104',
      createdAt: 220,
      retryCount: 999,
      lastError: 'pending_sync_review:insufficient_stock_or_not_found',
    })
    insertQueueRow(sqlite, {
      opId: '00000000-0000-4000-8000-000000000105',
      createdAt: 230,
      retryCount: 999,
      lastError: 'invalid_envelope:payload',
    })

    await expect(getSyncHealth(db)).resolves.toEqual({
      totalRows: 5,
      syncedRows: 1,
      unsyncedRows: 4,
      pendingRows: 1,
      failedRows: 1,
      reviewableRows: 2,
      maxRetryCount: 999,
      lastSuccessfulSyncAt: 120,
      oldestPendingCreatedAt: 200,
      latestError: 'invalid_envelope:payload',
      latestErrorAt: 230,
    })
  })
})

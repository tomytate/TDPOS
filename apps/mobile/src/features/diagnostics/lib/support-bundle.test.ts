import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteLike } from '@/db/async-sqlite'
import { LOCAL_SCHEMA_SQL } from '@/db/schema'

import { buildSupportBundle, getRecentSyncErrors, sanitizeDiagnosticText } from './support-bundle'

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

function insertError(sqlite: Database, opId: string, lastError: string, createdAt: number) {
  sqlite
    .prepare(
      `INSERT INTO sync_queue (
         client_operation_id, table_name, record_id, operation, payload,
         created_at, retry_count, last_error
       ) VALUES (?, 'products', ?, 'DELTA', ?, ?, 2, ?)`,
    )
    .run(
      opId,
      '11111111-1111-4111-8111-111111111111',
      JSON.stringify({
        client_operation_id: opId,
        product_id: '11111111-1111-4111-8111-111111111111',
        branch_id: '22222222-2222-4222-8222-222222222222',
        delta: -1,
        reason: 'sale',
      }),
      createdAt,
      lastError,
    )
}

describe('support bundle diagnostics', () => {
  test('sanitizes obvious contact data from diagnostic strings', () => {
    expect(sanitizeDiagnosticText('owner@example.com +639171234567 09171234567')).toBe(
      '[email] [phone] [phone]',
    )
  })

  test('loads recent sync errors without raw payload or full operation ids', async () => {
    const { sqlite, db } = freshDb()
    insertError(sqlite, '00000000-0000-4000-8000-00000000aaaa', 'first error', 100)
    insertError(sqlite, '00000000-0000-4000-8000-00000000bbbb', 'call +639171234567', 200)

    const errors = await getRecentSyncErrors(db, 1)

    expect(errors).toEqual([
      {
        queueId: 2,
        operationRef: '...0000bbbb',
        tableName: 'products',
        operation: 'DELTA',
        retryCount: 2,
        lastError: 'call [phone]',
        createdAt: 200,
      },
    ])
  })

  test('builds a readable support bundle without queue payload contents', () => {
    const bundle = buildSupportBundle({
      generatedAt: new Date('2026-05-09T12:00:00.000Z'),
      metadata: {
        appVersion: '0.1.0',
        schemaVersion: 1,
        installId: 'install-1',
        role: 'owner',
        branchCode: 'QC01',
        branchName: 'Demo branch',
        cashierCode: 'C01',
        mmkvSizeBytes: 128,
        mmkvKeyCount: 2,
        availableDiskBytes: 2_048,
        totalDiskBytes: 4_096,
      },
      health: {
        totalRows: 3,
        syncedRows: 1,
        unsyncedRows: 2,
        pendingRows: 0,
        failedRows: 1,
        reviewableRows: 1,
        maxRetryCount: 999,
        lastSuccessfulSyncAt: 1_777_980_000,
        oldestPendingCreatedAt: 1_777_980_100,
        latestError: 'owner@example.com failed',
        latestErrorAt: 1_777_980_200,
      },
      recentErrors: [
        {
          queueId: 7,
          operationRef: '...00abc123',
          tableName: 'sales',
          operation: 'INSERT',
          retryCount: 999,
          lastError: 'pending_sync_review',
          createdAt: 1_777_980_200,
        },
      ],
    })

    expect(bundle).toContain('TD POS Support Bundle')
    expect(bundle).toContain('Install ID: install-1')
    expect(bundle).toContain('Disk: 2048 bytes available / 4096 bytes total')
    expect(bundle).toContain('Latest error: [email] failed')
    expect(bundle).toContain('#7 | ...00abc123 | sales | INSERT')
    expect(bundle).not.toContain('payload')
  })
})

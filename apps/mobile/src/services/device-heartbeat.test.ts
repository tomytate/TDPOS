import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { runLocalMigrations, type LocalMigrationDb } from '@/db/migrations'

import { buildDeviceSyncSnapshot } from './device-heartbeat-snapshot'

function makeAdapter(sqlite: Database): LocalMigrationDb {
  return {
    async execAsync(sql) {
      sqlite.exec(sql)
    },
    async runAsync(sql, params = []) {
      sqlite.prepare(sql).run(...(params as never[]))
    },
    async getFirstAsync<T>(sql: string, params: unknown[] = []) {
      const row = sqlite.prepare(sql).get(...(params as never[]))
      return (row ?? null) as T | null
    },
    async getAllAsync<T>(sql: string, params: unknown[] = []) {
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

async function freshDb(): Promise<{ sqlite: Database; db: LocalMigrationDb }> {
  const sqlite = new Database(':memory:')
  const db = makeAdapter(sqlite)
  await runLocalMigrations(db)
  return { sqlite, db }
}

describe('buildDeviceSyncSnapshot', () => {
  test('includes local queue counts and receipt sequence reservations', async () => {
    const { sqlite, db } = await freshDb()

    sqlite
      .prepare(
        `INSERT INTO receipt_sequence (branch_code, cashier_code, date, last_sequence)
         VALUES ('QC01', 'C01', '20260513', 12)`,
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO sync_queue (
           client_operation_id, table_name, record_id, operation, payload, retry_count
         ) VALUES (
           '00000000-0000-4000-8000-000000000701', 'sales', 'sale-1', 'INSERT', '{}', 0
         )`,
      )
      .run()

    const snapshot = await buildDeviceSyncSnapshot(db)

    expect(snapshot.available).toBe(true)
    expect(snapshot.unsynced_rows).toBe(1)
    expect(snapshot.receipt_sequences).toEqual([
      {
        branch_code: 'QC01',
        cashier_code: 'C01',
        date: '20260513',
        last_sequence: 12,
      },
    ])
  })
})

import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteLike } from '@/db/async-sqlite'
import { LOCAL_SCHEMA_SQL } from '@/db/schema'

import { getDiagnosticsMetadata, type DiagnosticsStorage } from './diagnostics-metadata'

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

function memoryStorage(): DiagnosticsStorage {
  const values = new Map<string, string>()
  return {
    get size() {
      return Array.from(values.values()).reduce((sum, value) => sum + value.length, 0)
    },
    getString: (key) => values.get(key),
    set: (key, value) => {
      values.set(key, value)
    },
    getAllKeys: () => Array.from(values.keys()),
  }
}

describe('getDiagnosticsMetadata', () => {
  test('summarizes app, schema, install, device, and MMKV metadata', async () => {
    const sqlite = new Database(':memory:')
    sqlite.exec(LOCAL_SCHEMA_SQL)
    const storage = memoryStorage()
    storage.set('auth-storage', '{"state":{}}')

    const metadata = await getDiagnosticsMetadata(
      makeAdapter(sqlite),
      {
        role: 'owner',
        branchCode: 'QC01',
        branchName: 'Demo branch',
        cashierCode: 'C01',
      },
      storage,
    )

    expect(metadata).toMatchObject({
      appVersion: '0.1.0',
      schemaVersion: 1,
      role: 'owner',
      branchCode: 'QC01',
      branchName: 'Demo branch',
      cashierCode: 'C01',
      mmkvKeyCount: 2,
      availableDiskBytes: null,
      totalDiskBytes: null,
    })
    expect(metadata.installId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(metadata.mmkvSizeBytes).toBeGreaterThan(0)
  })

  test('includes optional device storage totals when provided by the native layer', async () => {
    const sqlite = new Database(':memory:')
    sqlite.exec(LOCAL_SCHEMA_SQL)
    const storage = memoryStorage()

    const metadata = await getDiagnosticsMetadata(
      makeAdapter(sqlite),
      {
        role: 'manager',
        branchCode: 'QC01',
        branchName: 'Demo branch',
        cashierCode: 'M01',
      },
      storage,
      {
        availableDiskBytes: 2_048,
        totalDiskBytes: 4_096,
      },
    )

    expect(metadata.availableDiskBytes).toBe(2_048)
    expect(metadata.totalDiskBytes).toBe(4_096)
  })
})

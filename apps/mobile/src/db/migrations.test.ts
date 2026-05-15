import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteBindParams } from './async-sqlite'
import { runLocalMigrations, type LocalMigrationDb } from './migrations'
import { LOCAL_SCHEMA_SQL } from './schema'

function makeAdapter(sqlite: Database): LocalMigrationDb {
  return {
    async execAsync(sql) {
      sqlite.exec(sql)
    },
    async runAsync(sql, params) {
      sqlite.prepare(sql).run(...(params as never[]))
    },
    async getFirstAsync<T>(sql: string, params: AsyncSqliteBindParams) {
      const row = sqlite.prepare(sql).get(...(params as never[]))
      return (row ?? null) as T | null
    },
    async getAllAsync<T>(sql: string, params: AsyncSqliteBindParams) {
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

function freshDb() {
  return new Database(':memory:')
}

describe('runLocalMigrations', () => {
  test('applies the current local schema to a fresh database', async () => {
    const sqlite = freshDb()
    await runLocalMigrations(makeAdapter(sqlite))

    const table = sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'products'`)
      .get() as { name: string } | null
    expect(table?.name).toBe('products')

    const version = sqlite.prepare(`SELECT MAX(version) AS version FROM schema_version`).get() as {
      version: number
    }
    expect(version.version).toBe(10)

    const customerColumns = sqlite.prepare(`PRAGMA table_info(customers)`).all() as Array<{
      name: string
    }>
    expect(customerColumns.map((column) => column.name)).toContain('pii_erased')
    expect(customerColumns.map((column) => column.name)).toContain('erased_at')

    const saleColumns = sqlite.prepare(`PRAGMA table_info(sales)`).all() as Array<{
      name: string
    }>
    expect(saleColumns.map((column) => column.name)).toContain('device_timezone')
    expect(saleColumns.map((column) => column.name)).toContain(
      'synced_server_time_at_last_handshake',
    )

    const stockTakeTable = sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'stock_take_counts'`)
      .get() as { name: string } | null
    expect(stockTakeTable?.name).toBe('stock_take_counts')

    const voidTable = sqlite
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sale_voids'`)
      .get() as { name: string } | null
    expect(voidTable?.name).toBe('sale_voids')

    const productColumns = sqlite.prepare(`PRAGMA table_info(products)`).all() as Array<{
      name: string
    }>
    expect(productColumns.map((column) => column.name)).toContain('image_uri')
  })

  test('does not re-run an already applied schema version', async () => {
    const sqlite = freshDb()
    const db = makeAdapter(sqlite)
    await runLocalMigrations(db)

    sqlite
      .prepare(
        `INSERT INTO settings (key, value)
         VALUES ('migration-idempotency-check', 'kept')`,
      )
      .run()

    await runLocalMigrations(db)

    const settings = sqlite
      .prepare(`SELECT value FROM settings WHERE key = 'migration-idempotency-check'`)
      .get() as { value: string } | null
    expect(settings?.value).toBe('kept')

    const versions = sqlite
      .prepare(`SELECT version FROM schema_version ORDER BY version`)
      .all() as Array<{ version: number }>
    expect(versions.map((row) => row.version)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  test('preserves a database that was already created from the v1 schema', async () => {
    const sqlite = freshDb()
    sqlite.exec(LOCAL_SCHEMA_SQL)
    sqlite
      .prepare(
        `INSERT INTO settings (key, value)
         VALUES ('existing-device-setting', 'kept')`,
      )
      .run()

    await runLocalMigrations(makeAdapter(sqlite))

    const settings = sqlite
      .prepare(`SELECT value FROM settings WHERE key = 'existing-device-setting'`)
      .get() as { value: string } | null
    expect(settings?.value).toBe('kept')

    const versions = sqlite
      .prepare(`SELECT version FROM schema_version ORDER BY version`)
      .all() as Array<{ version: number }>
    expect(versions.map((row) => row.version)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  test('applies missing future migrations in version order exactly once', async () => {
    const sqlite = freshDb()
    const db = makeAdapter(sqlite)

    const migrations = [
      {
        version: 3,
        sql: `INSERT INTO migration_order (marker) VALUES ('three');`,
      },
      {
        version: 2,
        sql: `
CREATE TABLE migration_order (marker TEXT NOT NULL);
INSERT INTO migration_order (marker) VALUES ('two');
`,
      },
    ]

    await runLocalMigrations(db, migrations)
    await runLocalMigrations(db, migrations)

    const markers = sqlite
      .prepare(`SELECT marker FROM migration_order ORDER BY rowid`)
      .all() as Array<{ marker: string }>
    expect(markers.map((row) => row.marker)).toEqual(['two', 'three'])

    const versions = sqlite
      .prepare(`SELECT version FROM schema_version ORDER BY version`)
      .all() as Array<{ version: number }>
    expect(versions.map((row) => row.version)).toEqual([2, 3])
  })
})

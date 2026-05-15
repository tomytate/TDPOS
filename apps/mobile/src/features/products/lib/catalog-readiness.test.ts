import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteLike } from '@/db/async-sqlite'
import { LOCAL_SCHEMA_SQL } from '@/db/schema'

import { getCatalogReadiness } from './catalog-readiness'

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

describe('getCatalogReadiness', () => {
  test('is not ready until at least one active product is local', async () => {
    const sqlite = new Database(':memory:')
    sqlite.exec(LOCAL_SCHEMA_SQL)

    const empty = await getCatalogReadiness(makeAdapter(sqlite))
    expect(empty).toEqual({
      ready: false,
      activeProducts: 0,
      activeCategories: 0,
      newestProductUpdate: null,
    })

    sqlite
      .prepare(
        `INSERT INTO categories (id, business_id, name)
         VALUES ('cat-1', 'biz-1', 'Snacks')`,
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO products (
           id, business_id, name, stock_pieces, pieces_per_pack, price_per_piece, is_active, updated_at
         ) VALUES ('prod-1', 'biz-1', 'Test Chips', 8, 1, 7, 1, 1778710000)`,
      )
      .run()

    const ready = await getCatalogReadiness(makeAdapter(sqlite))
    expect(ready).toEqual({
      ready: true,
      activeProducts: 1,
      activeCategories: 1,
      newestProductUpdate: 1778710000,
    })
  })
})

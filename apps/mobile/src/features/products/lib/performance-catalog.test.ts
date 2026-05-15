import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteBindParams } from '@/db/async-sqlite'
import { runLocalMigrations, type LocalMigrationDb } from '@/db/migrations'

import {
  buildPerformanceCatalogFixture,
  PERFORMANCE_CATALOG_PRODUCT_COUNT,
  seedPerformanceCatalog,
} from './performance-catalog'

const BUSINESS_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

function makeAdapter(sqlite: Database): LocalMigrationDb {
  return {
    async execAsync(sql) {
      sqlite.exec(sql)
    },
    async runAsync(sql, params: AsyncSqliteBindParams = []) {
      sqlite.prepare(sql).run(...(params as never[]))
    },
    async getFirstAsync<T>(sql: string, params: AsyncSqliteBindParams = []) {
      const row = sqlite.prepare(sql).get(...(params as never[]))
      return (row ?? null) as T | null
    },
    async getAllAsync<T>(sql: string, params: AsyncSqliteBindParams = []) {
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

async function freshDb() {
  const sqlite = new Database(':memory:')
  const db = makeAdapter(sqlite)
  await runLocalMigrations(db)
  return { sqlite, db }
}

describe('performance catalog fixture', () => {
  test('builds a deterministic 500-SKU catalog for product-grid profiling', () => {
    const fixture = buildPerformanceCatalogFixture(BUSINESS_ID)

    expect(fixture.categories).toHaveLength(10)
    expect(fixture.products).toHaveLength(PERFORMANCE_CATALOG_PRODUCT_COUNT)
    expect(new Set(fixture.products.map((product) => product.id)).size).toBe(
      PERFORMANCE_CATALOG_PRODUCT_COUNT,
    )
    expect(fixture.products[0]).toMatchObject({
      sku: 'PERF-0001',
      name: 'Sachet SKU 0001',
      piecesPerPack: 12,
      isTingi: true,
    })
    expect(fixture.products[499]).toMatchObject({
      sku: 'PERF-0500',
      name: 'Candy SKU 0500',
    })
  })

  test('seeds products and categories without touching the sync queue', async () => {
    const { sqlite, db } = await freshDb()

    await seedPerformanceCatalog(db, BUSINESS_ID)
    await seedPerformanceCatalog(db, BUSINESS_ID)

    const productCount = sqlite
      .prepare(`SELECT COUNT(*) AS count FROM products WHERE business_id = ?`)
      .get(BUSINESS_ID) as { count: number }
    const categoryCount = sqlite
      .prepare(`SELECT COUNT(*) AS count FROM categories WHERE business_id = ?`)
      .get(BUSINESS_ID) as { count: number }
    const syncRows = sqlite.prepare(`SELECT COUNT(*) AS count FROM sync_queue`).get() as {
      count: number
    }
    const firstPage = sqlite
      .prepare(
        `SELECT sku
         FROM products
         WHERE business_id = ? AND is_active = 1
         ORDER BY name COLLATE NOCASE
         LIMIT 5`,
      )
      .all(BUSINESS_ID) as Array<{ sku: string }>

    expect(productCount.count).toBe(500)
    expect(categoryCount.count).toBe(10)
    expect(syncRows.count).toBe(0)
    expect(firstPage.map((row) => row.sku)).toEqual([
      'PERF-0010',
      'PERF-0020',
      'PERF-0030',
      'PERF-0040',
      'PERF-0050',
    ])
  })
})

import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { runLocalMigrations, type LocalMigrationDb } from '@/db/migrations'

import { executeStockTake } from './execute-stock-take'
import { getStockAccuracySnapshot } from './stock-accuracy'

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

async function freshDb(): Promise<Database> {
  const sqlite = new Database(':memory:')
  await runLocalMigrations(makeAdapter(sqlite))
  sqlite.exec(`
    INSERT INTO products (id, business_id, name, stock_pieces, pieces_per_pack,
      price_per_piece, is_active, is_tingi)
    VALUES
      ('11111111-1111-1111-1111-111111111111', 'biz-1', 'Accurate Sachet', 10, 12, 7, 1, 1),
      ('22222222-2222-4222-8222-222222222222', 'biz-1', 'Damaged Pack', 20, 12, 70, 1, 1),
      ('33333333-3333-4333-8333-333333333333', 'biz-1', 'Uncounted', 5, 1, 5, 1, 1);
  `)
  return sqlite
}

describe('getStockAccuracySnapshot', () => {
  test('summarizes latest stock-take accuracy and uncounted products', async () => {
    const sqlite = await freshDb()
    const db = makeAdapter(sqlite)

    await executeStockTake({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000201',
      productId: '11111111-1111-1111-1111-111111111111',
      branchId: 'branch-1',
      countedStockPieces: 11,
      reason: 'count_correction',
      now: () => 100,
    })
    await executeStockTake({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000202',
      productId: '22222222-2222-4222-8222-222222222222',
      branchId: 'branch-1',
      countedStockPieces: 15,
      reason: 'damage',
      now: () => 101,
    })

    const snapshot = await getStockAccuracySnapshot(db)

    expect(snapshot.productCount).toBe(3)
    expect(snapshot.countedProductCount).toBe(2)
    expect(snapshot.uncountedProductCount).toBe(1)
    expect(snapshot.averageAccuracyPercent).toBeCloseTo((10 / 11 + 15 / 20) * 50, 5)
    expect(snapshot.products.find((product) => product.name === 'Uncounted')).toMatchObject({
      accuracyPercent: null,
      countedAt: null,
    })
  })

  test('uses the latest count when the same product is counted twice', async () => {
    const sqlite = await freshDb()
    const db = makeAdapter(sqlite)

    await executeStockTake({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000203',
      productId: '11111111-1111-1111-1111-111111111111',
      branchId: 'branch-1',
      countedStockPieces: 8,
      reason: 'count_correction',
      now: () => 100,
    })
    await executeStockTake({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000204',
      productId: '11111111-1111-1111-1111-111111111111',
      branchId: 'branch-1',
      countedStockPieces: 8,
      reason: 'count_correction',
      now: () => 101,
    })

    const product = (await getStockAccuracySnapshot(db)).products.find(
      (entry) => entry.productId === '11111111-1111-1111-1111-111111111111',
    )

    expect(product).toMatchObject({
      countedStockPieces: 8,
      systemStockPiecesBefore: 8,
      adjustmentDelta: 0,
      accuracyPercent: 100,
      countedAt: 101,
    })
  })
})

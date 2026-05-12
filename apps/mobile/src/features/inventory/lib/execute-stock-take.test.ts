import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { runLocalMigrations, type LocalMigrationDb } from '@/db/migrations'

import { executeStockTake } from './execute-stock-take'

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
  sqlite
    .prepare(
      `INSERT INTO products (id, business_id, name, stock_pieces, pieces_per_pack,
         price_per_piece, is_active, is_tingi)
       VALUES ('11111111-1111-1111-1111-111111111111', 'biz-1', 'Test Sachet',
         10, 12, 7, 1, 1)`,
    )
    .run()
  return sqlite
}

describe('executeStockTake', () => {
  test('writes an adjustment log and queues a positive inventory delta', async () => {
    const sqlite = await freshDb()
    const result = await executeStockTake({
      db: makeAdapter(sqlite),
      clientOperationId: '00000000-0000-4000-8000-000000000101',
      productId: '11111111-1111-1111-1111-111111111111',
      branchId: 'branch-1',
      countedStockPieces: 12,
      reason: 'count_correction',
      userId: 'user-1',
      now: () => 1_777_980_000,
    })

    expect(result).toMatchObject({
      ok: true,
      previousStockPieces: 10,
      countedStockPieces: 12,
      delta: 2,
      replayed: false,
    })

    const product = sqlite
      .prepare(`SELECT stock_pieces FROM products WHERE id = ?`)
      .get('11111111-1111-1111-1111-111111111111') as { stock_pieces: number }
    expect(product.stock_pieces).toBe(12)

    const log = sqlite.prepare(`SELECT type, pieces_delta, reason FROM inventory_logs`).get() as {
      type: string
      pieces_delta: number
      reason: string
    }
    expect(log).toEqual({
      type: 'adjustment',
      pieces_delta: 2,
      reason: 'count_correction',
    })

    const queue = sqlite.prepare(`SELECT operation, payload FROM sync_queue`).get() as {
      operation: string
      payload: string
    }
    const payload = JSON.parse(queue.payload) as {
      delta: number
      reason: string
      log_type: string
    }
    expect(queue.operation).toBe('DELTA')
    expect(payload).toMatchObject({
      delta: 2,
      reason: 'count_correction',
      log_type: 'adjustment',
    })

    const count = sqlite
      .prepare(
        `SELECT counted_stock_pieces, system_stock_pieces_before, pieces_delta, reason
         FROM stock_take_counts`,
      )
      .get() as {
      counted_stock_pieces: number
      system_stock_pieces_before: number
      pieces_delta: number
      reason: string
    }
    expect(count).toEqual({
      counted_stock_pieces: 12,
      system_stock_pieces_before: 10,
      pieces_delta: 2,
      reason: 'count_correction',
    })
  })

  test('writes a negative delta with the manager note sanitized to trimmed text', async () => {
    const sqlite = await freshDb()
    const result = await executeStockTake({
      db: makeAdapter(sqlite),
      clientOperationId: '00000000-0000-4000-8000-000000000102',
      productId: '11111111-1111-1111-1111-111111111111',
      branchId: 'branch-1',
      countedStockPieces: 7,
      reason: 'damage',
      reasonNote: '  broken display pack  ',
      now: () => 1_777_980_001,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.delta).toBe(-3)

    const log = sqlite.prepare(`SELECT pieces_delta, reason FROM inventory_logs`).get() as {
      pieces_delta: number
      reason: string
    }
    expect(log.pieces_delta).toBe(-3)
    expect(log.reason).toBe('damage: broken display pack')
  })

  test('records a no-delta count without queueing an adjustment', async () => {
    const sqlite = await freshDb()
    const db = makeAdapter(sqlite)

    const result = await executeStockTake({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000103',
      productId: '11111111-1111-1111-1111-111111111111',
      branchId: 'branch-1',
      countedStockPieces: 10,
      reason: 'count_correction',
    })
    expect(result).toMatchObject({ ok: true, delta: 0, replayed: false })

    expect(sqlite.prepare(`SELECT id FROM inventory_logs`).all()).toHaveLength(0)
    expect(sqlite.prepare(`SELECT id FROM sync_queue`).all()).toHaveLength(0)
    expect(sqlite.prepare(`SELECT id FROM stock_take_counts`).all()).toHaveLength(1)
  })

  test('refuses invalid and unknown-product stock takes without writes', async () => {
    const sqlite = await freshDb()
    const db = makeAdapter(sqlite)

    const invalid = await executeStockTake({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000107',
      productId: '11111111-1111-1111-1111-111111111111',
      branchId: 'branch-1',
      countedStockPieces: -1,
      reason: 'count_correction',
    })
    expect(invalid.ok).toBe(false)
    if (invalid.ok) return
    expect(invalid.reason).toBe('invalid_count')

    const missing = await executeStockTake({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000108',
      productId: '22222222-2222-4222-8222-222222222222',
      branchId: 'branch-1',
      countedStockPieces: 1,
      reason: 'count_correction',
    })
    expect(missing.ok).toBe(false)
    if (missing.ok) return
    expect(missing.reason).toBe('product_not_found')

    expect(sqlite.prepare(`SELECT id FROM inventory_logs`).all()).toHaveLength(0)
    expect(sqlite.prepare(`SELECT id FROM stock_take_counts`).all()).toHaveLength(0)
    expect(sqlite.prepare(`SELECT id FROM sync_queue`).all()).toHaveLength(0)
  })

  test('replays an existing stock-take operation without writing twice', async () => {
    const sqlite = await freshDb()
    const db = makeAdapter(sqlite)
    const opId = '00000000-0000-4000-8000-000000000106'

    const first = await executeStockTake({
      db,
      clientOperationId: opId,
      productId: '11111111-1111-1111-1111-111111111111',
      branchId: 'branch-1',
      countedStockPieces: 13,
      reason: 'count_correction',
    })
    expect(first.ok).toBe(true)

    const replay = await executeStockTake({
      db,
      clientOperationId: opId,
      productId: '11111111-1111-1111-1111-111111111111',
      branchId: 'branch-1',
      countedStockPieces: 99,
      reason: 'theft',
    })

    expect(replay).toMatchObject({ ok: true, delta: 3, replayed: true })
    expect(sqlite.prepare(`SELECT id FROM inventory_logs`).all()).toHaveLength(1)
    expect(sqlite.prepare(`SELECT id FROM stock_take_counts`).all()).toHaveLength(1)
    expect(sqlite.prepare(`SELECT id FROM sync_queue`).all()).toHaveLength(1)
  })
})

import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { runLocalMigrations, type LocalMigrationDb } from '@/db/migrations'

import { executeCheckout, type ExecuteCheckoutCart } from './execute-checkout'
import { executeVoidSale } from './execute-void-sale'

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
         price_per_piece, price_per_pack, is_active, is_tingi)
       VALUES ('11111111-1111-1111-1111-111111111111', 'biz-1', 'Test Sachet',
         20, 12, 7, 75, 1, 1)`,
    )
    .run()
  return sqlite
}

const device = {
  branchId: 'branch-1',
  branchCode: 'QC01',
  cashierCode: 'C01',
  userId: 'user-1',
}

const cart: ExecuteCheckoutCart = {
  items: [
    {
      productId: '11111111-1111-1111-1111-111111111111',
      name: 'Test Sachet',
      qty: 3,
      unitPrice: 7,
      wasSoldAs: 'piece',
      piecesPerPack: 12,
      lineTotal: 21,
    },
  ],
  total: 21,
  tendered: 25,
  paymentMethod: 'cash',
  isUtang: false,
}

async function seedCompletedSale(sqlite: Database) {
  const db = makeAdapter(sqlite)
  const sale = await executeCheckout({
    db,
    clientOperationId: '00000000-0000-4000-8000-000000000201',
    cart,
    device,
    now: () => new Date(2026, 4, 12, 10, 0, 0),
  })
  expect(sale.ok).toBe(true)
  if (!sale.ok) throw new Error('seed sale failed')
  return { db, sale }
}

describe('executeVoidSale', () => {
  test('writes a compensating sale, restores stock, and queues a positive void delta', async () => {
    const sqlite = await freshDb()
    const { db, sale } = await seedCompletedSale(sqlite)

    const result = await executeVoidSale({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000202',
      originalSaleId: sale.saleId,
      branchId: device.branchId,
      branchCode: device.branchCode,
      cashierCode: device.cashierCode,
      userId: device.userId,
      reason: 'customer_cancelled',
      now: () => new Date(2026, 4, 12, 10, 2, 0),
    })

    expect(result).toMatchObject({
      ok: true,
      saleId: '00000000-0000-4000-8000-000000000202',
      originalSaleId: sale.saleId,
      total: -21,
      replayed: false,
    })
    if (!result.ok) return
    expect(result.receiptNumber).not.toBe(sale.receiptNumber)

    const sales = sqlite
      .prepare(`SELECT id, total_amount, status FROM sales ORDER BY created_at, id`)
      .all() as Array<{ id: string; total_amount: number; status: string }>
    expect(sales).toEqual([
      { id: sale.saleId, total_amount: 21, status: 'completed' },
      {
        id: '00000000-0000-4000-8000-000000000202',
        total_amount: -21,
        status: 'voided',
      },
    ])

    const product = sqlite.prepare(`SELECT stock_pieces FROM products`).get() as {
      stock_pieces: number
    }
    expect(product.stock_pieces).toBe(20)

    const voidRow = sqlite.prepare(`SELECT reason FROM sale_voids`).get() as { reason: string }
    expect(voidRow.reason).toBe('customer_cancelled')

    const itemRows = sqlite
      .prepare(`SELECT pieces_sold, subtotal FROM sale_items ORDER BY rowid`)
      .all() as Array<{ pieces_sold: number; subtotal: number }>
    expect(itemRows).toEqual([
      { pieces_sold: 3, subtotal: 21 },
      { pieces_sold: -3, subtotal: -21 },
    ])

    const log = sqlite
      .prepare(`SELECT type, pieces_delta, reason FROM inventory_logs ORDER BY rowid DESC LIMIT 1`)
      .get() as { type: string; pieces_delta: number; reason: string }
    expect(log).toEqual({
      type: 'adjustment',
      pieces_delta: 3,
      reason: 'void: customer_cancelled',
    })

    const queueRows = sqlite
      .prepare(`SELECT table_name, operation, payload FROM sync_queue ORDER BY id`)
      .all() as Array<{ table_name: string; operation: string; payload: string }>
    expect(queueRows).toHaveLength(3)
    const voidQueueRow = queueRows[2]
    expect(voidQueueRow).toBeDefined()
    if (!voidQueueRow) return
    const voidPayload = JSON.parse(voidQueueRow.payload) as {
      delta: number
      reason: string
      log_type: string
      sale_id: string
    }
    expect(voidQueueRow).toMatchObject({ table_name: 'products', operation: 'DELTA' })
    expect(voidPayload).toMatchObject({
      delta: 3,
      reason: 'void',
      log_type: 'adjustment',
      sale_id: '00000000-0000-4000-8000-000000000202',
    })
  })

  test('replays the same void operation without duplicating rows', async () => {
    const sqlite = await freshDb()
    const { db, sale } = await seedCompletedSale(sqlite)
    const opId = '00000000-0000-4000-8000-000000000203'

    const first = await executeVoidSale({
      db,
      clientOperationId: opId,
      originalSaleId: sale.saleId,
      branchId: device.branchId,
      branchCode: device.branchCode,
      cashierCode: device.cashierCode,
      reason: 'duplicate_sale',
      now: () => new Date(2026, 4, 12, 11, 0, 0),
    })
    expect(first.ok).toBe(true)

    const replay = await executeVoidSale({
      db,
      clientOperationId: opId,
      originalSaleId: sale.saleId,
      branchId: device.branchId,
      branchCode: device.branchCode,
      cashierCode: device.cashierCode,
      reason: 'wrong_item',
      now: () => new Date(2026, 4, 12, 11, 5, 0),
    })

    expect(replay).toMatchObject({ ok: true, replayed: true, saleId: opId })
    expect(sqlite.prepare(`SELECT id FROM sale_voids`).all()).toHaveLength(1)
    expect(sqlite.prepare(`SELECT id FROM sales`).all()).toHaveLength(2)
    expect(sqlite.prepare(`SELECT id FROM sync_queue`).all()).toHaveLength(3)
  })

  test('rejects same-day window misses and already-voided original rows without writes', async () => {
    const sqlite = await freshDb()
    const { db, sale } = await seedCompletedSale(sqlite)

    const late = await executeVoidSale({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000204',
      originalSaleId: sale.saleId,
      branchId: device.branchId,
      branchCode: device.branchCode,
      cashierCode: device.cashierCode,
      reason: 'customer_cancelled',
      now: () => new Date(2026, 4, 13, 0, 1, 0),
    })
    expect(late).toMatchObject({ ok: false, reason: 'void_window_closed' })
    expect(sqlite.prepare(`SELECT id FROM sale_voids`).all()).toHaveLength(0)

    sqlite.prepare(`UPDATE sales SET status = 'voided' WHERE id = ?`).run(sale.saleId)
    const already = await executeVoidSale({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000205',
      originalSaleId: sale.saleId,
      branchId: device.branchId,
      branchCode: device.branchCode,
      cashierCode: device.cashierCode,
      reason: 'cashier_error',
      now: () => new Date(2026, 4, 12, 12, 0, 0),
    })
    expect(already).toMatchObject({ ok: false, reason: 'already_voided' })
    expect(sqlite.prepare(`SELECT id FROM sale_voids`).all()).toHaveLength(0)
  })
})

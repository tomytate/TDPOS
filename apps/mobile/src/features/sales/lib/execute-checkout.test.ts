import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { runLocalMigrations, type LocalMigrationDb } from '@/db/migrations'

import { executeCheckout, type ExecuteCheckoutCart } from './execute-checkout'

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
  return sqlite
}

function seedShampoo(sqlite: Database, overrides?: { stock?: number; pieces_per_pack?: number }) {
  const stock = overrides?.stock ?? 12
  const piecesPerPack = overrides?.pieces_per_pack ?? 12
  sqlite
    .prepare(
      `INSERT INTO products (id, business_id, name, stock_pieces, pieces_per_pack,
         price_per_piece, price_per_pack, is_active, is_tingi)
       VALUES ('11111111-1111-1111-1111-111111111111', 'biz-1', 'Palmolive Sachet',
         ?, ?, 7, 75, 1, 1)`,
    )
    .run(stock, piecesPerPack)
}

const cashCart = (qty: number): ExecuteCheckoutCart => ({
  items: [
    {
      productId: '11111111-1111-1111-1111-111111111111',
      name: 'Palmolive Sachet',
      qty,
      unitPrice: 7,
      wasSoldAs: 'piece',
      piecesPerPack: 12,
      lineTotal: qty * 7,
    },
  ],
  total: qty * 7,
  tendered: qty * 7 + 1,
  paymentMethod: 'cash',
  isUtang: false,
})

const device = {
  branchId: 'branch-1',
  branchCode: 'QC01',
  cashierCode: 'C01',
}

interface SyncQueueOperationRow {
  operation: string
  table_name: string
}

describe('executeCheckout — required §14 tests (local-only subset)', () => {
  test('#1 tingi math: sell 7 from a 12-sachet pack leaves stock_pieces = 5', async () => {
    const sqlite = await freshDb()
    seedShampoo(sqlite)
    const db = makeAdapter(sqlite)

    const result = await executeCheckout({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000001',
      cart: cashCart(7),
      device,
      now: () => new Date(2026, 4, 9, 10, 0, 0),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const stock = sqlite
      .prepare('SELECT stock_pieces FROM products WHERE id = ?')
      .get('11111111-1111-1111-1111-111111111111') as { stock_pieces: number }
    expect(stock.stock_pieces).toBe(5)

    const log = sqlite
      .prepare(`SELECT pieces_delta, type FROM inventory_logs WHERE product_id = ?`)
      .get('11111111-1111-1111-1111-111111111111') as { pieces_delta: number; type: string }
    expect(log.pieces_delta).toBe(-7)
    expect(log.type).toBe('sale')

    const queue = sqlite
      .prepare(`SELECT operation, table_name FROM sync_queue ORDER BY created_at ASC, id ASC`)
      .all() as SyncQueueOperationRow[]
    expect(queue).toHaveLength(2)
    expect(queue[0]).toEqual({ operation: 'INSERT', table_name: 'sales' })
    expect(queue[1]).toEqual({ operation: 'DELTA', table_name: 'products' })
  })

  test('local idempotency: same client_operation_id twice produces ONE sale', async () => {
    const sqlite = await freshDb()
    seedShampoo(sqlite, { stock: 24 })
    const db = makeAdapter(sqlite)
    const opId = '00000000-0000-4000-8000-000000000002'

    const first = await executeCheckout({
      db,
      clientOperationId: opId,
      cart: cashCart(3),
      device,
      now: () => new Date(2026, 4, 9, 10, 0, 0),
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.replayed).toBe(false)

    const second = await executeCheckout({
      db,
      clientOperationId: opId,
      cart: cashCart(3),
      device,
      now: () => new Date(2026, 4, 9, 10, 0, 5),
    })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.replayed).toBe(true)
    expect(second.receiptNumber).toBe(first.receiptNumber)

    const saleRows = sqlite.prepare(`SELECT id FROM sales`).all() as Array<{ id: string }>
    expect(saleRows).toHaveLength(1)

    const stock = sqlite
      .prepare(`SELECT stock_pieces FROM products WHERE id = ?`)
      .get('11111111-1111-1111-1111-111111111111') as { stock_pieces: number }
    expect(stock.stock_pieces).toBe(21)

    const queue = sqlite.prepare(`SELECT id FROM sync_queue`).all() as Array<{ id: number }>
    expect(queue).toHaveLength(2) // 1 sale insert + 1 inventory delta
  })

  test('#5 receipt collision: two cashiers, 5 sales each, all 10 receipts unique', async () => {
    const sqlite = await freshDb()
    seedShampoo(sqlite, { stock: 1000 })
    const db = makeAdapter(sqlite)
    const numbers = new Set<string>()

    for (const cashier of ['C01', 'C02']) {
      for (let i = 0; i < 5; i += 1) {
        const result = await executeCheckout({
          db,
          clientOperationId: `00000000-0000-4000-8000-${cashier}${String(i).padStart(8, '0')}`,
          cart: cashCart(1),
          device: { ...device, cashierCode: cashier },
          now: () => new Date(2026, 4, 9, 10, i, 0),
        })

        expect(result.ok).toBe(true)
        if (!result.ok) continue
        numbers.add(result.receiptNumber)
        expect(result.receiptNumber).toMatch(/^[A-Z0-9]{3,5}-[A-Z0-9]{2,5}-\d{8}-\d{6}$/)
      }
    }

    expect(numbers.size).toBe(10)
  })

  test('insufficient stock: refuses to mutate when delta would push below zero', async () => {
    const sqlite = await freshDb()
    seedShampoo(sqlite, { stock: 3 })
    const db = makeAdapter(sqlite)

    const result = await executeCheckout({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000003',
      cart: cashCart(7),
      device,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('insufficient_stock')

    const stock = sqlite
      .prepare(`SELECT stock_pieces FROM products WHERE id = ?`)
      .get('11111111-1111-1111-1111-111111111111') as { stock_pieces: number }
    expect(stock.stock_pieces).toBe(3)

    const sales = sqlite.prepare(`SELECT id FROM sales`).all()
    expect(sales).toHaveLength(0)
  })

  test('rejects brand-new receipt when device clock is outside the handshake window', async () => {
    const sqlite = await freshDb()
    seedShampoo(sqlite)
    const db = makeAdapter(sqlite)

    const result = await executeCheckout({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000006',
      cart: cashCart(1),
      device,
      lastServerHandshakeAt: '2026-05-09T10:00:00.000Z',
      now: () => new Date('2026-05-11T10:01:00.000Z'),
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('clock_skew_detected')

    const sales = sqlite.prepare(`SELECT id FROM sales`).all()
    expect(sales).toHaveLength(0)
  })

  test('stores last server handshake metadata in sale and sync payload', async () => {
    const sqlite = await freshDb()
    seedShampoo(sqlite)
    const db = makeAdapter(sqlite)
    const lastServerHandshakeAt = '2026-05-09T09:30:00.000Z'

    const result = await executeCheckout({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000007',
      cart: cashCart(1),
      device,
      lastServerHandshakeAt,
      now: () => new Date('2026-05-09T10:00:00.000Z'),
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const sale = sqlite
      .prepare(
        `SELECT synced_server_time_at_last_handshake
         FROM sales
         WHERE id = ?`,
      )
      .get('00000000-0000-4000-8000-000000000007') as {
      synced_server_time_at_last_handshake: string
    }
    expect(sale.synced_server_time_at_last_handshake).toBe(lastServerHandshakeAt)

    const queueRow = sqlite
      .prepare(`SELECT payload FROM sync_queue WHERE table_name = 'sales'`)
      .get() as { payload: string }
    const payload = JSON.parse(queueRow.payload) as {
      synced_server_time_at_last_handshake: string
    }
    expect(payload.synced_server_time_at_last_handshake).toBe(lastServerHandshakeAt)
  })

  test('rejects empty cart and bad cash tender without writing rows', async () => {
    const sqlite = await freshDb()
    seedShampoo(sqlite)
    const db = makeAdapter(sqlite)

    const empty = await executeCheckout({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000004',
      cart: { ...cashCart(1), items: [] },
      device,
    })
    expect(empty.ok).toBe(false)
    if (empty.ok) return
    expect(empty.reason).toBe('empty_cart')

    const shortTender = await executeCheckout({
      db,
      clientOperationId: '00000000-0000-4000-8000-000000000005',
      cart: { ...cashCart(2), tendered: 5 },
      device,
    })
    expect(shortTender.ok).toBe(false)
    if (shortTender.ok) return
    expect(shortTender.reason).toBe('invalid_tendered')

    const sales = sqlite.prepare(`SELECT id FROM sales`).all()
    expect(sales).toHaveLength(0)
  })
})

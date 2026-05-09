import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteLike } from '@/db/async-sqlite'
import { LOCAL_SCHEMA_SQL } from '@/db/schema'
import { executeCheckout, type ExecuteCheckoutCart } from '@/features/sales/lib/execute-checkout'

import { processSyncQueue, type SyncCallables } from './sync-processor'

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

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111'
const BUSINESS_ID = '22222222-2222-4222-8222-222222222222'
const BRANCH_ID = '33333333-3333-4333-8333-333333333333'
const USER_ID = '44444444-4444-4444-8444-444444444444'
const OP_ID_1 = '55555555-5555-4555-8555-555555555555'

function freshDb(): Database {
  const sqlite = new Database(':memory:')
  sqlite.exec(LOCAL_SCHEMA_SQL)
  return sqlite
}

function seedShampoo(sqlite: Database) {
  sqlite
    .prepare(
      `INSERT INTO products (id, business_id, name, stock_pieces, pieces_per_pack, price_per_piece, is_active, is_tingi)
       VALUES (?, ?, 'Palmolive Sachet', 12, 12, 7, 1, 1)`,
    )
    .run(PRODUCT_ID, BUSINESS_ID)
}

const cashCart: ExecuteCheckoutCart = {
  items: [
    {
      productId: PRODUCT_ID,
      name: 'Palmolive Sachet',
      qty: 7,
      unitPrice: 7,
      wasSoldAs: 'piece',
      piecesPerPack: 12,
      lineTotal: 49,
    },
  ],
  total: 49,
  tendered: 50,
  paymentMethod: 'cash',
  isUtang: false,
}

const device = {
  branchId: BRANCH_ID,
  branchCode: 'QC01',
  cashierCode: 'C01',
  userId: USER_ID,
  businessId: BUSINESS_ID,
}

async function seedQueueViaCheckout(sqlite: Database, db: AsyncSqliteLike) {
  const result = await executeCheckout({
    db,
    clientOperationId: OP_ID_1,
    cart: cashCart,
    device,
    now: () => new Date(2026, 4, 9, 10, 0, 0),
  })
  if (!result.ok) throw new Error(`Seed checkout failed: ${result.reason}`)
  return result
}

function makeCallables(overrides: Partial<SyncCallables> = {}): SyncCallables {
  return {
    applyInventoryDelta:
      overrides.applyInventoryDelta ??
      (async () => ({ data: { ok: true, new_stock_pieces: 5 }, error: null })),
    createSale:
      overrides.createSale ?? (async () => ({ data: { ok: true, replayed: false }, error: null })),
  }
}

describe('processSyncQueue', () => {
  test('marks rows synced when callables succeed', async () => {
    const sqlite = freshDb()
    seedShampoo(sqlite)
    const db = makeAdapter(sqlite)
    await seedQueueViaCheckout(sqlite, db)

    const sync = await processSyncQueue({
      db,
      callables: makeCallables(),
      now: () => 1_700_000_000,
    })

    expect(sync.total).toBe(2)
    expect(sync.synced).toBe(2)
    expect(sync.failed).toBe(0)
    expect(sync.deferred).toBe(0)
    expect(sync.reviewable).toBe(0)

    const remaining = sqlite
      .prepare(`SELECT COUNT(*) AS c FROM sync_queue WHERE synced_at IS NULL`)
      .get() as { c: number }
    expect(remaining.c).toBe(0)

    const all = sqlite
      .prepare(`SELECT synced_at, last_error FROM sync_queue ORDER BY id`)
      .all() as Array<{ synced_at: number; last_error: string | null }>
    for (const row of all) {
      expect(row.synced_at).toBe(1_700_000_000)
      expect(row.last_error).toBeNull()
    }
  })

  test('defers concurrent_in_progress without bumping retry_count', async () => {
    const sqlite = freshDb()
    seedShampoo(sqlite)
    const db = makeAdapter(sqlite)
    await seedQueueViaCheckout(sqlite, db)

    const sync = await processSyncQueue({
      db,
      callables: makeCallables({
        applyInventoryDelta: async () => ({
          data: { reason: 'concurrent_in_progress', retry_after_ms: 500 },
          error: null,
        }),
      }),
    })

    expect(sync.deferred).toBe(1)
    expect(sync.synced).toBe(1)
    expect(sync.failed).toBe(0)

    const deltaRow = sqlite
      .prepare(
        `SELECT retry_count, synced_at, last_error FROM sync_queue WHERE table_name = 'products'`,
      )
      .get() as { retry_count: number; synced_at: number | null; last_error: string | null }
    expect(deltaRow.retry_count).toBe(0)
    expect(deltaRow.synced_at).toBeNull()
    expect(deltaRow.last_error).toBeNull()
  })

  test('increments retry_count and stores last_error on transport error', async () => {
    const sqlite = freshDb()
    seedShampoo(sqlite)
    const db = makeAdapter(sqlite)
    await seedQueueViaCheckout(sqlite, db)

    const sync = await processSyncQueue({
      db,
      callables: makeCallables({
        applyInventoryDelta: async () => ({ data: null, error: { message: 'network error' } }),
      }),
    })

    expect(sync.failed).toBe(1)
    expect(sync.synced).toBe(1)

    const deltaRow = sqlite
      .prepare(`SELECT retry_count, last_error FROM sync_queue WHERE table_name = 'products'`)
      .get() as { retry_count: number; last_error: string }
    expect(deltaRow.retry_count).toBe(1)
    expect(deltaRow.last_error).toBe('network error')
  })

  test('marks reviewable when server says ok: false (insufficient_stock)', async () => {
    const sqlite = freshDb()
    seedShampoo(sqlite)
    const db = makeAdapter(sqlite)
    await seedQueueViaCheckout(sqlite, db)

    const sync = await processSyncQueue({
      db,
      callables: makeCallables({
        applyInventoryDelta: async () => ({
          data: { ok: false, reason: 'insufficient_stock_or_not_found' },
          error: null,
        }),
      }),
    })

    expect(sync.reviewable).toBe(1)
    expect(sync.synced).toBe(1)

    const deltaRow = sqlite
      .prepare(`SELECT retry_count, last_error FROM sync_queue WHERE table_name = 'products'`)
      .get() as { retry_count: number; last_error: string }
    expect(deltaRow.retry_count).toBe(999)
    expect(deltaRow.last_error).toContain('pending_sync_review:')
    expect(deltaRow.last_error).toContain('insufficient_stock')
  })

  test('rejects malformed envelope without calling the network', async () => {
    const sqlite = freshDb()
    const db = makeAdapter(sqlite)
    sqlite
      .prepare(
        `INSERT INTO sync_queue (client_operation_id, table_name, record_id, operation, payload, created_at)
         VALUES (?, 'products', 'not-a-uuid', 'DELTA', '{"bogus":1}', unixepoch())`,
      )
      .run(OP_ID_1)

    let invoked = 0
    const sync = await processSyncQueue({
      db,
      callables: makeCallables({
        applyInventoryDelta: async () => {
          invoked += 1
          return { data: { ok: true }, error: null }
        },
      }),
    })

    expect(invoked).toBe(0)
    expect(sync.reviewable).toBe(1)

    const row = sqlite
      .prepare(`SELECT retry_count, last_error FROM sync_queue WHERE id = 1`)
      .get() as { retry_count: number; last_error: string }
    expect(row.retry_count).toBe(999)
    expect(row.last_error).toContain('invalid_envelope:')
  })

  test('honours maxRetries: rows at the cap are skipped', async () => {
    const sqlite = freshDb()
    seedShampoo(sqlite)
    const db = makeAdapter(sqlite)
    await seedQueueViaCheckout(sqlite, db)

    sqlite
      .prepare(
        `UPDATE sync_queue SET retry_count = 10, last_error = 'previously failed' WHERE table_name = 'products'`,
      )
      .run()

    let deltaInvoked = 0
    const sync = await processSyncQueue({
      db,
      callables: makeCallables({
        applyInventoryDelta: async () => {
          deltaInvoked += 1
          return { data: { ok: true }, error: null }
        },
      }),
    })

    expect(deltaInvoked).toBe(0)
    expect(sync.total).toBe(1) // only the sales row is eligible
    expect(sync.synced).toBe(1)
  })
})

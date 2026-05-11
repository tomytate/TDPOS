import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteBindParams } from '@/db/async-sqlite'
import { runLocalMigrations, type LocalMigrationDb } from '@/db/migrations'
import {
  cancelKioskOrder,
  confirmKioskOrder,
  createKioskOrder,
  listActiveKioskOrders,
} from './kiosk-orders'

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

async function freshDb() {
  const sqlite = new Database(':memory:')
  const db = makeAdapter(sqlite)
  await runLocalMigrations(db)
  return db
}

const IDENTITY = { businessId: 'biz-1', branchId: 'br-1', deviceId: 'dev-1' }
const ITEMS = [{ productId: 'p1', name: 'Test Product', qty: 2, unitPrice: 50 }]

describe('kiosk order lifecycle', () => {
  test('creates an order with awaiting_staff status', async () => {
    const db = await freshDb()
    const result = await createKioskOrder({
      db,
      identity: IDENTITY,
      customerLabel: 'Juan',
      items: ITEMS,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.order.status).toBe('awaiting_staff')
    expect(result.order.customer_label).toBe('Juan')
    expect(result.order.total_amount).toBe(100)
  })

  test('confirms an awaiting order', async () => {
    const db = await freshDb()
    const created = await createKioskOrder({
      db,
      identity: IDENTITY,
      customerLabel: null,
      items: ITEMS,
    })
    if (!created.ok) throw new Error('setup failed')

    const result = await confirmKioskOrder({ db, orderId: created.order.id })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.order.status).toBe('confirmed')
    expect(result.order.confirmed_at).not.toBeNull()
  })

  test('cancels a draft/awaiting order', async () => {
    const db = await freshDb()
    const created = await createKioskOrder({
      db,
      identity: IDENTITY,
      customerLabel: null,
      items: ITEMS,
    })
    if (!created.ok) throw new Error('setup failed')

    const result = await cancelKioskOrder({ db, orderId: created.order.id })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.order.status).toBe('cancelled')
  })

  test('cannot confirm an already confirmed order', async () => {
    const db = await freshDb()
    const created = await createKioskOrder({
      db,
      identity: IDENTITY,
      customerLabel: null,
      items: ITEMS,
    })
    if (!created.ok) throw new Error('setup failed')

    await confirmKioskOrder({ db, orderId: created.order.id })
    const result = await confirmKioskOrder({ db, orderId: created.order.id })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('already_confirmed')
  })

  test('cannot cancel a confirmed order', async () => {
    const db = await freshDb()
    const created = await createKioskOrder({
      db,
      identity: IDENTITY,
      customerLabel: null,
      items: ITEMS,
    })
    if (!created.ok) throw new Error('setup failed')

    await confirmKioskOrder({ db, orderId: created.order.id })
    const result = await cancelKioskOrder({ db, orderId: created.order.id })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('invalid_status')
  })

  test('listActiveKioskOrders returns only draft/awaiting orders', async () => {
    const db = await freshDb()
    await createKioskOrder({ db, identity: IDENTITY, customerLabel: 'A', items: ITEMS })
    const created2 = await createKioskOrder({
      db,
      identity: IDENTITY,
      customerLabel: 'B',
      items: ITEMS,
    })
    if (!created2.ok) throw new Error('setup failed')
    await confirmKioskOrder({ db, orderId: created2.order.id })

    const active = await listActiveKioskOrders(db, 'br-1')
    expect(active).toHaveLength(1)
    expect(active[0]!.customer_label).toBe('A')
  })

  test('rejects creation with missing identity', async () => {
    const db = await freshDb()
    const result = await createKioskOrder({
      db,
      identity: { businessId: null, branchId: null },
      customerLabel: null,
      items: ITEMS,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('missing_identity')
  })
})

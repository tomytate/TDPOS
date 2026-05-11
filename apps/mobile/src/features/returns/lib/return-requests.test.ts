import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteBindParams } from '@/db/async-sqlite'
import { runLocalMigrations, type LocalMigrationDb } from '@/db/migrations'
import {
  createReturnRequest,
  listPendingReturns,
  lookupSaleByReceipt,
  resolveReturnRequest,
} from './return-requests'

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
  return { db, sqlite }
}

const IDENTITY = { businessId: 'biz-1', branchId: 'br-1', userId: 'usr-1' }

function seedSale(sqlite: Database) {
  sqlite.exec(`
    INSERT INTO sales (
      id, branch_id, user_id, receipt_number,
      total_amount, payment_method, status, created_at
    ) VALUES (
      'sale-1', 'br-1', 'usr-1', 'BR1-C01-20260511-000001',
      150, 'cash', 'completed', ${Math.floor(Date.now() / 1000)}
    )
  `)
}

describe('return request lifecycle', () => {
  test('creates a return request with pending status', async () => {
    const { db } = await freshDb()
    const result = await createReturnRequest({
      db,
      identity: IDENTITY,
      originalSaleId: null,
      reasonCode: 'defective',
      reasonNote: 'Damaged packaging',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.request.status).toBe('pending')
    expect(result.request.reason_code).toBe('defective')
    expect(result.request.reason_note).toBe('Damaged packaging')
  })

  test('creates a return linked to an existing sale', async () => {
    const { db, sqlite } = await freshDb()
    seedSale(sqlite)

    const result = await createReturnRequest({
      db,
      identity: IDENTITY,
      originalSaleId: 'sale-1',
      reasonCode: 'customer_changed_mind',
      reasonNote: null,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.request.original_sale_id).toBe('sale-1')
  })

  test('rejects return for non-existent sale', async () => {
    const { db } = await freshDb()
    const result = await createReturnRequest({
      db,
      identity: IDENTITY,
      originalSaleId: 'nonexistent',
      reasonCode: 'wrong_item',
      reasonNote: null,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('sale_not_found')
  })

  test('approves a pending return', async () => {
    const { db } = await freshDb()
    const created = await createReturnRequest({
      db,
      identity: IDENTITY,
      originalSaleId: null,
      reasonCode: 'expired',
      reasonNote: null,
    })
    if (!created.ok) throw new Error('setup failed')

    const result = await resolveReturnRequest({
      db,
      identity: { userId: 'mgr-1' },
      requestId: created.request.id,
      status: 'approved',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.request.status).toBe('approved')
    expect(result.request.approved_by).toBe('mgr-1')
  })

  test('declines a pending return', async () => {
    const { db } = await freshDb()
    const created = await createReturnRequest({
      db,
      identity: IDENTITY,
      originalSaleId: null,
      reasonCode: 'other',
      reasonNote: null,
    })
    if (!created.ok) throw new Error('setup failed')

    const result = await resolveReturnRequest({
      db,
      identity: { userId: 'mgr-1' },
      requestId: created.request.id,
      status: 'declined',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.request.status).toBe('declined')
  })

  test('cannot resolve an already resolved return', async () => {
    const { db } = await freshDb()
    const created = await createReturnRequest({
      db,
      identity: IDENTITY,
      originalSaleId: null,
      reasonCode: 'defective',
      reasonNote: null,
    })
    if (!created.ok) throw new Error('setup failed')

    await resolveReturnRequest({
      db,
      identity: { userId: 'mgr-1' },
      requestId: created.request.id,
      status: 'approved',
    })

    const result = await resolveReturnRequest({
      db,
      identity: { userId: 'mgr-1' },
      requestId: created.request.id,
      status: 'declined',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('already_resolved')
  })

  test('original sale is never mutated by return creation (ADR-011)', async () => {
    const { db, sqlite } = await freshDb()
    seedSale(sqlite)

    const saleBefore = sqlite
      .prepare('SELECT total_amount, status FROM sales WHERE id = ?')
      .get('sale-1') as { total_amount: number; status: string }

    await createReturnRequest({
      db,
      identity: IDENTITY,
      originalSaleId: 'sale-1',
      reasonCode: 'warranty_claim',
      reasonNote: 'Warranty expired',
    })

    const saleAfter = sqlite
      .prepare('SELECT total_amount, status FROM sales WHERE id = ?')
      .get('sale-1') as { total_amount: number; status: string }

    expect(saleAfter.total_amount).toBe(saleBefore.total_amount)
    expect(saleAfter.status).toBe(saleBefore.status)
  })

  test('listPendingReturns returns only pending/approved requests', async () => {
    const { db } = await freshDb()
    const r1 = await createReturnRequest({
      db,
      identity: IDENTITY,
      originalSaleId: null,
      reasonCode: 'defective',
      reasonNote: null,
    })
    const r2 = await createReturnRequest({
      db,
      identity: IDENTITY,
      originalSaleId: null,
      reasonCode: 'expired',
      reasonNote: null,
    })
    if (!r1.ok || !r2.ok) throw new Error('setup failed')

    await resolveReturnRequest({
      db,
      identity: { userId: 'mgr-1' },
      requestId: r2.request.id,
      status: 'declined',
    })

    const pending = await listPendingReturns(db, 'br-1')
    expect(pending).toHaveLength(1)
    expect(pending[0]!.id).toBe(r1.request.id)
  })

  test('lookupSaleByReceipt finds a seeded sale', async () => {
    const { db, sqlite } = await freshDb()
    seedSale(sqlite)

    const sale = await lookupSaleByReceipt(db, 'BR1-C01-20260511-000001')
    expect(sale).not.toBeNull()
    expect(sale!.id).toBe('sale-1')
    expect(sale!.total_amount).toBe(150)
  })

  test('lookupSaleByReceipt returns null for unknown receipt', async () => {
    const { db } = await freshDb()
    const sale = await lookupSaleByReceipt(db, 'UNKNOWN-RECEIPT')
    expect(sale).toBeNull()
  })
})

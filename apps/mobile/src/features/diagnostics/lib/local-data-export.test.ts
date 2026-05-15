import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import type { AsyncSqliteLike } from '@/db/async-sqlite'
import { runLocalMigrations, type LocalMigrationDb } from '@/db/migrations'

import { buildLocalDataExport } from './local-data-export'

function makeAdapter(sqlite: Database): LocalMigrationDb & AsyncSqliteLike {
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

async function freshDb(): Promise<{ sqlite: Database; db: AsyncSqliteLike }> {
  const sqlite = new Database(':memory:')
  await runLocalMigrations(makeAdapter(sqlite))
  return { sqlite, db: makeAdapter(sqlite) }
}

const metadata = {
  appVersion: '0.1.0',
  schemaVersion: 9,
  installId: 'install-1',
  role: 'owner' as const,
  branchCode: 'QC01',
  branchName: 'Main',
  cashierCode: 'C01',
  devicePairingStatus: 'paired' as const,
  devicePairingId: 'a2eb9222-86d8-4102-a048-cb23166b83b8',
  devicePairedAt: '2026-05-09T09:55:00.000Z',
  subscriptionTier: 'tier_a_free' as const,
  enabledModuleCount: 0,
  entitlementsValidUntil: null,
  lastServerHandshakeAt: null,
  mmkvSizeBytes: 123,
  mmkvKeyCount: 4,
  availableDiskBytes: 2_048,
  totalDiskBytes: 4_096,
  performanceMetrics: [],
}

describe('buildLocalDataExport', () => {
  test('exports recovery-critical local tables as compact JSON', async () => {
    const { sqlite, db } = await freshDb()
    sqlite
      .prepare(
        `INSERT INTO products (
           id, business_id, name, stock_pieces, pieces_per_pack, price_per_piece, is_active, is_tingi
         ) VALUES ('prod-1', 'biz-1', 'Test Sachet', 10, 12, 7, 1, 1)`,
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO sales (
           id, branch_id, total_amount, payment_method, receipt_number, created_at
         ) VALUES ('sale-1', 'branch-1', 14, 'cash', 'QC01-C01-20260513-000001', 1778610000)`,
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO sale_items (
           id, sale_id, product_id, pieces_sold, was_sold_as, unit_price, subtotal
         ) VALUES ('item-1', 'sale-1', 'prod-1', 2, 'piece', 7, 14)`,
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO sync_queue (
           client_operation_id, table_name, record_id, operation, payload, created_at, last_error
         ) VALUES (
           '00000000-0000-4000-8000-000000000401',
           'products',
           'prod-1',
           'DELTA',
           '{"delta":-2}',
           1778610000,
           'retry owner@example.com +639171234567'
         )`,
      )
      .run()

    const exportText = await buildLocalDataExport({
      db,
      metadata,
      generatedAt: new Date('2026-05-13T01:00:00.000Z'),
    })
    const parsed = JSON.parse(exportText) as {
      format: string
      contentEncoding: string
      counts: Record<string, number>
      tables: {
        products: Array<{ id: string; stock_pieces: number }>
        sales: Array<{ receipt_number: string }>
        sale_items: Array<{ pieces_sold: number }>
        sync_queue: Array<{ payload: { delta: number }; last_error: string }>
      }
    }

    expect(parsed.format).toBe('tdpos.local-data-export.v1')
    expect(parsed.contentEncoding).toBe('json+compact')
    expect(parsed.counts).toEqual({ products: 1, sales: 1, saleItems: 1, syncQueue: 1 })
    expect(parsed.tables.products[0]).toMatchObject({ id: 'prod-1', stock_pieces: 10 })
    expect(parsed.tables.sales[0]?.receipt_number).toBe('QC01-C01-20260513-000001')
    expect(parsed.tables.sale_items[0]?.pieces_sold).toBe(2)
    expect(parsed.tables.sync_queue[0]?.payload).toEqual({ delta: -2 })
    expect(parsed.tables.sync_queue[0]?.last_error).toBe('retry [email] [phone]')
  })
})

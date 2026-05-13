import { describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'

import { runLocalMigrations, type LocalMigrationDb } from '@/db/migrations'

import { refreshCatalogFromSupabase, type SupabaseCatalogClient } from './catalog-refresh'

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

function makeSupabaseMock(params: {
  categories?: unknown[]
  products?: unknown[]
  error?: string | null
}): SupabaseCatalogClient {
  return {
    from(table) {
      return {
        select() {
          return {
            eq() {
              return {
                async order() {
                  if (params.error) return { data: null, error: { message: params.error } }
                  return {
                    data:
                      table === 'categories' ? (params.categories ?? []) : (params.products ?? []),
                    error: null,
                  }
                },
              }
            },
          }
        },
      }
    },
  }
}

describe('refreshCatalogFromSupabase', () => {
  test('inserts remote categories and products into local SQLite', async () => {
    const sqlite = await freshDb()
    const outcome = await refreshCatalogFromSupabase({
      db: makeAdapter(sqlite),
      businessId: 'biz-1',
      supabase: makeSupabaseMock({
        categories: [
          {
            id: 'cat-1',
            business_id: 'biz-1',
            name: 'Snacks',
            color: '#f59e0b',
            created_at: '2026-05-12T00:00:00.000Z',
          },
        ],
        products: [
          {
            id: 'prod-1',
            business_id: 'biz-1',
            sku: 'SKU-1',
            name: 'Test Chips',
            category_id: 'cat-1',
            price_per_piece: '8.5',
            price_per_pack: null,
            cost_per_piece: '5',
            stock_pieces: 25,
            pieces_per_pack: 1,
            reorder_point_pieces: 4,
            unit_label: 'pc',
            is_tingi: true,
            is_active: true,
            created_at: '2026-05-12T00:00:00.000Z',
            updated_at: '2026-05-12T01:00:00.000Z',
          },
        ],
      }),
    })

    expect(outcome).toEqual({ ok: true, categories: 1, products: 1, preservedPendingStock: 0 })

    const category = sqlite.prepare(`SELECT id, name FROM categories`).get() as {
      id: string
      name: string
    }
    expect(category).toEqual({ id: 'cat-1', name: 'Snacks' })

    const product = sqlite
      .prepare(`SELECT name, stock_pieces, price_per_piece, is_active FROM products WHERE id = ?`)
      .get('prod-1') as {
      name: string
      stock_pieces: number
      price_per_piece: number
      is_active: number
    }
    expect(product).toEqual({
      name: 'Test Chips',
      stock_pieces: 25,
      price_per_piece: 8.5,
      is_active: 1,
    })
  })

  test('preserves local stock when an unsynced product delta exists', async () => {
    const sqlite = await freshDb()
    sqlite
      .prepare(
        `INSERT INTO products (id, business_id, name, stock_pieces, pieces_per_pack, price_per_piece)
         VALUES ('prod-1', 'biz-1', 'Local Chips', 8, 1, 8)`,
      )
      .run()
    sqlite
      .prepare(
        `INSERT INTO sync_queue (client_operation_id, table_name, record_id, operation, payload)
         VALUES ('00000000-0000-4000-8000-000000000301', 'products', 'prod-1', 'DELTA', '{}')`,
      )
      .run()

    const outcome = await refreshCatalogFromSupabase({
      db: makeAdapter(sqlite),
      businessId: 'biz-1',
      supabase: makeSupabaseMock({
        products: [
          {
            id: 'prod-1',
            business_id: 'biz-1',
            sku: null,
            name: 'Remote Chips',
            category_id: null,
            price_per_piece: 9,
            price_per_pack: null,
            cost_per_piece: null,
            stock_pieces: 25,
            pieces_per_pack: 1,
            reorder_point_pieces: null,
            unit_label: null,
            is_tingi: true,
            is_active: true,
            created_at: '2026-05-12T00:00:00.000Z',
            updated_at: '2026-05-12T01:00:00.000Z',
          },
        ],
      }),
    })

    expect(outcome).toEqual({ ok: true, categories: 0, products: 1, preservedPendingStock: 1 })

    const product = sqlite
      .prepare(`SELECT name, stock_pieces, price_per_piece FROM products WHERE id = ?`)
      .get('prod-1') as { name: string; stock_pieces: number; price_per_piece: number }
    expect(product).toEqual({ name: 'Remote Chips', stock_pieces: 8, price_per_piece: 9 })
  })

  test('does not write without a business id or when remote queries fail', async () => {
    const sqlite = await freshDb()
    const db = makeAdapter(sqlite)

    const signedOut = await refreshCatalogFromSupabase({
      db,
      businessId: null,
      supabase: makeSupabaseMock({ products: [] }),
    })
    expect(signedOut).toEqual({ ok: false, reason: 'signed_out' })

    const queryFailed = await refreshCatalogFromSupabase({
      db,
      businessId: 'biz-1',
      supabase: makeSupabaseMock({ error: 'network unavailable' }),
    })
    expect(queryFailed).toEqual({
      ok: false,
      reason: 'query_failed',
      message: 'network unavailable',
    })

    expect(sqlite.prepare(`SELECT id FROM products`).all()).toHaveLength(0)
    expect(sqlite.prepare(`SELECT id FROM categories`).all()).toHaveLength(0)
  })
})

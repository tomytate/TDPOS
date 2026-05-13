import type { AsyncSqliteLike } from '@/db/async-sqlite'

import type { DiagnosticsMetadata } from './diagnostics-metadata'
import { sanitizeDiagnosticText } from './support-bundle'

interface LocalProductRow {
  id: string
  business_id: string
  sku: string | null
  name: string
  category_id: string | null
  price_per_piece: number
  price_per_pack: number | null
  cost_per_piece: number | null
  stock_pieces: number
  pieces_per_pack: number
  reorder_point_pieces: number | null
  unit_label: string | null
  is_tingi: number
  is_active: number
  updated_at: number
}

interface LocalSaleRow {
  id: string
  branch_id: string
  user_id: string | null
  customer_id: string | null
  total_amount: number
  payment_method: string
  status: string
  is_utang: number
  utang_balance: number | null
  receipt_number: string
  created_at: number
  synced_at: number | null
}

interface LocalSaleItemRow {
  id: string
  sale_id: string
  product_id: string
  pieces_sold: number
  was_sold_as: string
  unit_price: number
  discount: number
  subtotal: number
}

interface LocalSyncQueueRow {
  id: number
  client_operation_id: string
  table_name: string
  record_id: string
  operation: string
  payload: string
  created_at: number
  synced_at: number | null
  retry_count: number
  last_error: string | null
}

export interface LocalDataExportInput {
  db: AsyncSqliteLike
  metadata: DiagnosticsMetadata
  generatedAt: Date
}

export async function buildLocalDataExport(input: LocalDataExportInput): Promise<string> {
  const { db, metadata, generatedAt } = input
  const [products, sales, saleItems, syncQueue] = await Promise.all([
    db.getAllAsync<LocalProductRow>(
      `SELECT
         id, business_id, sku, name, category_id, price_per_piece, price_per_pack,
         cost_per_piece, stock_pieces, pieces_per_pack, reorder_point_pieces,
         unit_label, is_tingi, is_active, updated_at
       FROM products
       ORDER BY name COLLATE NOCASE, id`,
      [],
    ),
    db.getAllAsync<LocalSaleRow>(
      `SELECT
         id, branch_id, user_id, customer_id, total_amount, payment_method, status,
         is_utang, utang_balance, receipt_number, created_at, synced_at
       FROM sales
       ORDER BY created_at DESC, id`,
      [],
    ),
    db.getAllAsync<LocalSaleItemRow>(
      `SELECT
         id, sale_id, product_id, pieces_sold, was_sold_as, unit_price, discount, subtotal
       FROM sale_items
       ORDER BY sale_id, id`,
      [],
    ),
    db.getAllAsync<LocalSyncQueueRow>(
      `SELECT
         id, client_operation_id, table_name, record_id, operation, payload,
         created_at, synced_at, retry_count, last_error
       FROM sync_queue
       ORDER BY created_at, id`,
      [],
    ),
  ])

  const body = {
    format: 'tdpos.local-data-export.v1',
    contentEncoding: 'json+compact',
    generatedAt: generatedAt.toISOString(),
    app: {
      version: metadata.appVersion,
      schemaVersion: metadata.schemaVersion,
      installId: metadata.installId,
      branchCode: metadata.branchCode,
      cashierCode: metadata.cashierCode,
      role: metadata.role,
      subscriptionTier: metadata.subscriptionTier,
    },
    counts: {
      products: products.length,
      sales: sales.length,
      saleItems: saleItems.length,
      syncQueue: syncQueue.length,
    },
    tables: {
      products,
      sales,
      sale_items: saleItems,
      sync_queue: syncQueue.map((row) => ({
        ...row,
        payload: parsePayload(row.payload),
        last_error: row.last_error ? sanitizeDiagnosticText(row.last_error) : null,
      })),
    },
  }

  return JSON.stringify(body)
}

function parsePayload(payload: string): unknown {
  try {
    return JSON.parse(payload)
  } catch {
    return payload
  }
}

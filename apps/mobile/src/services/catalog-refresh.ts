import type { AsyncSqliteLike } from '@/db/async-sqlite'
import type { ModuleName } from '@tdpos/shared'

interface SupabaseQueryResult {
  data: unknown
  error: { message: string } | null
}

interface SupabaseOrderableQuery {
  order(column: string, options?: { ascending?: boolean }): PromiseLike<SupabaseQueryResult>
}

interface SupabaseEqQuery {
  eq(column: string, value: string): SupabaseOrderableQuery
}

interface SupabaseSelectQuery {
  select(columns: string): SupabaseEqQuery
}

export interface SupabaseCatalogClient {
  from(table: 'categories' | 'products' | 'customers'): SupabaseSelectQuery
}

interface RemoteCategoryRow {
  id: string
  business_id: string
  name: string
  color: string | null
  created_at: string | null
}

interface RemoteProductRow {
  id: string
  business_id: string
  sku: string | null
  name: string
  category_id: string | null
  price_per_piece: number | string | null
  price_per_pack: number | string | null
  cost_per_piece: number | string | null
  stock_pieces: number | null
  pieces_per_pack: number | null
  reorder_point_pieces: number | null
  unit_label: string | null
  is_tingi: boolean | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

interface RemoteCustomerRow {
  id: string
  business_id: string
  name: string
  phone: string | null
  barangay: string | null
  points_balance: number | null
  total_utang: number | string | null
  pii_erased: boolean | null
  erased_at: string | null
  erased_by: string | null
  erasure_reason: string | null
  created_at: string | null
}

export type CatalogRefreshOutcome =
  | {
      ok: true
      categories: number
      products: number
      customers: number
      preservedPendingStock: number
    }
  | {
      ok: false
      reason: 'signed_out' | 'query_failed'
      message?: string
    }

const CATEGORY_COLUMNS = 'id, business_id, name, color, created_at'
const PRODUCT_COLUMNS =
  'id, business_id, sku, name, category_id, price_per_piece, price_per_pack, cost_per_piece, stock_pieces, pieces_per_pack, reorder_point_pieces, unit_label, is_tingi, is_active, created_at, updated_at'
const CUSTOMER_COLUMNS =
  'id, business_id, name, phone, barangay, points_balance, total_utang, pii_erased, erased_at, erased_by, erasure_reason, created_at'
const CUSTOMER_MODULES: ModuleName[] = ['utang', 'customer_sms', 'loyalty']

export async function refreshCatalogFromSupabase(params: {
  supabase: SupabaseCatalogClient
  db: AsyncSqliteLike
  businessId: string | null
  modules?: Record<ModuleName, boolean>
}): Promise<CatalogRefreshOutcome> {
  const businessId = params.businessId
  if (!businessId) return { ok: false, reason: 'signed_out' }
  const shouldSyncCustomers = shouldDownloadCustomers(params.modules)

  const [categoriesResult, productsResult, customersResult] = await Promise.all([
    params.supabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .eq('business_id', businessId)
      .order('name', { ascending: true }),
    params.supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('business_id', businessId)
      .order('name', { ascending: true }),
    shouldSyncCustomers
      ? params.supabase
          .from('customers')
          .select(CUSTOMER_COLUMNS)
          .eq('business_id', businessId)
          .order('name', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ])

  const firstError = categoriesResult.error ?? productsResult.error ?? customersResult.error
  if (firstError) return { ok: false, reason: 'query_failed', message: firstError.message }

  const categories = Array.isArray(categoriesResult.data)
    ? (categoriesResult.data as RemoteCategoryRow[])
    : []
  const products = Array.isArray(productsResult.data)
    ? (productsResult.data as RemoteProductRow[])
    : []
  const customers = Array.isArray(customersResult.data)
    ? (customersResult.data as RemoteCustomerRow[])
    : []
  let preservedPendingStock = 0

  await params.db.withTransactionAsync(async () => {
    for (const category of categories) {
      await params.db.runAsync(
        `INSERT INTO categories (id, business_id, name, color, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           business_id = excluded.business_id,
           name = excluded.name,
           color = excluded.color,
           created_at = excluded.created_at`,
        [
          category.id,
          category.business_id,
          category.name,
          category.color,
          toEpochSeconds(category.created_at),
        ],
      )
    }

    for (const product of products) {
      const hasPendingDelta = await hasPendingProductDelta(params.db, product.id)
      if (hasPendingDelta) preservedPendingStock += 1

      await params.db.runAsync(
        `INSERT INTO products (
           id, business_id, sku, name, category_id, price_per_piece, price_per_pack,
           cost_per_piece, stock_pieces, pieces_per_pack, reorder_point_pieces,
           unit_label, is_tingi, is_active, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           business_id = excluded.business_id,
           sku = excluded.sku,
           name = excluded.name,
           category_id = excluded.category_id,
           price_per_piece = excluded.price_per_piece,
           price_per_pack = excluded.price_per_pack,
           cost_per_piece = excluded.cost_per_piece,
           stock_pieces = CASE
             WHEN ? THEN products.stock_pieces
             ELSE excluded.stock_pieces
           END,
           pieces_per_pack = excluded.pieces_per_pack,
           reorder_point_pieces = excluded.reorder_point_pieces,
           unit_label = excluded.unit_label,
           is_tingi = excluded.is_tingi,
           is_active = excluded.is_active,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at`,
        [
          product.id,
          product.business_id,
          product.sku,
          product.name,
          product.category_id,
          toNumber(product.price_per_piece),
          toNullableNumber(product.price_per_pack),
          toNullableNumber(product.cost_per_piece),
          product.stock_pieces ?? 0,
          product.pieces_per_pack ?? 1,
          product.reorder_point_pieces,
          product.unit_label,
          product.is_tingi ? 1 : 0,
          product.is_active === false ? 0 : 1,
          toEpochSeconds(product.created_at),
          toEpochSeconds(product.updated_at),
          hasPendingDelta ? 1 : 0,
        ],
      )
    }

    for (const customer of customers) {
      await params.db.runAsync(
        `INSERT INTO customers (
           id, business_id, name, phone, barangay, points_balance, total_utang,
           pii_erased, erased_at, erased_by, erasure_reason, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           business_id = excluded.business_id,
           name = excluded.name,
           phone = excluded.phone,
           barangay = excluded.barangay,
           points_balance = excluded.points_balance,
           total_utang = excluded.total_utang,
           pii_erased = excluded.pii_erased,
           erased_at = excluded.erased_at,
           erased_by = excluded.erased_by,
           erasure_reason = excluded.erasure_reason,
           created_at = excluded.created_at`,
        [
          customer.id,
          customer.business_id,
          customer.name,
          customer.phone,
          customer.barangay,
          customer.points_balance ?? 0,
          toNumber(customer.total_utang),
          customer.pii_erased ? 1 : 0,
          nullableEpochSeconds(customer.erased_at),
          customer.erased_by,
          customer.erasure_reason,
          toEpochSeconds(customer.created_at),
        ],
      )
    }
  })

  return {
    ok: true,
    categories: categories.length,
    products: products.length,
    customers: customers.length,
    preservedPendingStock,
  }
}

function shouldDownloadCustomers(modules: Record<ModuleName, boolean> | undefined): boolean {
  if (!modules) return false
  return CUSTOMER_MODULES.some((module) => modules[module] === true)
}

async function hasPendingProductDelta(db: AsyncSqliteLike, productId: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT id
     FROM sync_queue
     WHERE table_name = 'products'
       AND operation = 'DELTA'
       AND record_id = ?
       AND synced_at IS NULL
     LIMIT 1`,
    [productId],
  )

  return row !== null
}

function toEpochSeconds(value: string | null): number {
  if (!value) return Math.floor(Date.now() / 1000)
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return Math.floor(Date.now() / 1000)
  return Math.floor(parsed / 1000)
}

function nullableEpochSeconds(value: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null
}

function toNumber(value: number | string | null): number {
  if (value === null) return 0
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toNullableNumber(value: number | string | null): number | null {
  if (value === null) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

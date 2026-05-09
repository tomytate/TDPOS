// Phase W0.7 — Sales export query.
//
// Returns line-item rows (one per sale × item) for a given local-date range.
// RLS scopes to the caller's tenant via @supabase/ssr. The query embeds
// `sale_items(*)` and `products(name, unit_label)` for human-readable rows.

import 'server-only'

import { getServerSupabase } from '@/lib/supabase/server'

export interface SalesExportItemRow {
  sale_item_id: string
  product_id: string
  product_name: string
  product_unit_label: string | null
  pieces_sold: number
  was_sold_as: 'piece' | 'pack'
  unit_price: number
  subtotal: number
}

export interface SalesExportSaleRow {
  sale_id: string
  receipt_number: string
  business_id: string | null
  branch_id: string
  user_id: string | null
  customer_id: string | null
  total_amount: number
  payment_method: string
  is_utang: boolean
  status: string
  created_at: string
  items: SalesExportItemRow[]
}

export type SalesExportResult =
  | { ready: false; reason: 'supabase_unconfigured' | 'query_failed'; message?: string }
  | { ready: true; sales: SalesExportSaleRow[]; from: string; to: string }

interface RawSaleRow {
  id: string
  receipt_number: string
  business_id: string | null
  branch_id: string
  user_id: string | null
  customer_id: string | null
  total_amount: number | string
  payment_method: string
  is_utang: boolean
  status: string
  created_at: string
  sale_items: Array<{
    id: string
    product_id: string
    pieces_sold: number
    was_sold_as: 'piece' | 'pack'
    unit_price: number | string
    subtotal: number | string
    // supabase-js embeds relations as arrays even for single-row FKs.
    products: Array<{ name: string; unit_label: string | null }> | null
  }> | null
}

/**
 * `from` and `to` are inclusive ISO instants. Defaults: today's date in UTC.
 * The Edge / Server runtime converts UTC to PH local on the receipt date in
 * `formatReceiptDate()` from the mobile app, so for owner-side reporting we
 * accept the caller's already-resolved instants.
 */
export async function getSalesForExport(params: {
  from: Date
  to: Date
}): Promise<SalesExportResult> {
  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ready: false, reason: 'supabase_unconfigured' }
  }

  const fromIso = params.from.toISOString()
  const toIso = params.to.toISOString()

  const { data, error } = await supabase
    .from('sales')
    .select(
      `
      id,
      receipt_number,
      business_id,
      branch_id,
      user_id,
      customer_id,
      total_amount,
      payment_method,
      is_utang,
      status,
      created_at,
      sale_items (
        id,
        product_id,
        pieces_sold,
        was_sold_as,
        unit_price,
        subtotal,
        products ( name, unit_label )
      )
    `,
    )
    .gte('created_at', fromIso)
    .lte('created_at', toIso)
    .order('created_at', { ascending: true })

  if (error) {
    return { ready: false, reason: 'query_failed', message: error.message }
  }

  const rows = (data ?? []) as RawSaleRow[]

  return {
    ready: true,
    from: fromIso,
    to: toIso,
    sales: rows.map((row) => ({
      sale_id: row.id,
      receipt_number: row.receipt_number,
      business_id: row.business_id,
      branch_id: row.branch_id,
      user_id: row.user_id,
      customer_id: row.customer_id,
      total_amount: Number(row.total_amount) || 0,
      payment_method: row.payment_method,
      is_utang: row.is_utang,
      status: row.status,
      created_at: row.created_at,
      items: (row.sale_items ?? []).map((item) => {
        // supabase-js types embedded relations as arrays; `sale_items.product_id`
        // is a single-row FK so we take the first (and only) entry.
        const product = item.products?.[0] ?? null
        return {
          sale_item_id: item.id,
          product_id: item.product_id,
          product_name: product?.name ?? '(unknown product)',
          product_unit_label: product?.unit_label ?? null,
          pieces_sold: item.pieces_sold,
          was_sold_as: item.was_sold_as,
          unit_price: Number(item.unit_price) || 0,
          subtotal: Number(item.subtotal) || 0,
        }
      }),
    })),
  }
}

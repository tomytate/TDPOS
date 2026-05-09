// Phase W0.5 — read-only dashboard queries.
//
// These run inside Server Components, against the same Supabase schema the
// mobile app writes to. RLS does the tenant isolation; an unauthenticated or
// cross-tenant request returns an empty result, never another store's data.
//
// Each function is defensive: if Supabase is unconfigured (developer running
// before staging exists) it returns a safe `{ ready: false }` shape so the
// page can render an "env not configured" notice instead of crashing.

import 'server-only'

import { displayStock, formatMoney, splitStock } from '@tdpos/shared'

import { getServerSupabase } from '@/lib/supabase/server'

// ----- Sales summary ----------------------------------------------------------

export type SalesPaymentMixRow = {
  paymentMethod: string
  isUtang: boolean
  gross: number
  saleCount: number
}

export type SalesDateRange = {
  from: Date
  to: Date
}

export type SalesSummary =
  | { ready: false; reason: 'supabase_unconfigured' | 'query_failed'; message?: string }
  | {
      ready: true
      gross: number
      saleCount: number
      paymentMix: SalesPaymentMixRow[]
      formattedGross: string
      hourlyGross: number[]
      hourlyPeak: number
    }

export type TodaysSalesSummary = SalesSummary

interface SalesRow {
  total_amount: number | string
  payment_method: string
  is_utang: boolean
  created_at: string
}

function startOfLocalDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function endOfLocalDay(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function normalizeDateRange(input: Date | SalesDateRange = new Date()): SalesDateRange {
  if (input instanceof Date) {
    return {
      from: startOfLocalDay(input),
      to: endOfLocalDay(input),
    }
  }

  return input
}

export async function getSalesSummaryForRange(range: SalesDateRange): Promise<SalesSummary> {
  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ready: false, reason: 'supabase_unconfigured' }
  }

  const { data, error } = await supabase
    .from('sales')
    .select('total_amount, payment_method, is_utang, created_at')
    .gte('created_at', range.from.toISOString())
    .lte('created_at', range.to.toISOString())

  if (error) {
    return { ready: false, reason: 'query_failed', message: error.message }
  }

  const rows = (data ?? []) as SalesRow[]
  let gross = 0
  const mix = new Map<string, SalesPaymentMixRow>()
  const hourlyGross = new Array<number>(24).fill(0)

  for (const row of rows) {
    const amount = Number(row.total_amount) || 0
    gross += amount
    const key = `${row.payment_method}|${row.is_utang ? '1' : '0'}`
    const existing = mix.get(key) ?? {
      paymentMethod: row.payment_method,
      isUtang: row.is_utang,
      gross: 0,
      saleCount: 0,
    }
    existing.gross += amount
    existing.saleCount += 1
    mix.set(key, existing)

    const created = new Date(row.created_at)
    if (!Number.isNaN(created.getTime())) {
      const hour = created.getHours()
      if (hour >= 0 && hour < 24) {
        hourlyGross[hour] = (hourlyGross[hour] ?? 0) + amount
      }
    }
  }

  return {
    ready: true,
    gross,
    saleCount: rows.length,
    paymentMix: Array.from(mix.values()).sort((a, b) => b.gross - a.gross),
    formattedGross: formatMoney(gross),
    hourlyGross,
    hourlyPeak: Math.max(0, ...hourlyGross),
  }
}

export async function getTodaysSalesSummary(
  forDate: Date = new Date(),
): Promise<TodaysSalesSummary> {
  return getSalesSummaryForRange(normalizeDateRange(forDate))
}

// ----- Low-stock products -----------------------------------------------------

export type LowStockProduct = {
  id: string
  name: string
  stockPieces: number
  piecesPerPack: number
  reorderPointPieces: number
  display: string
  packs: number
  loosePieces: number
}

export type LowStockResult =
  | { ready: false; reason: 'supabase_unconfigured' | 'query_failed'; message?: string }
  | { ready: true; products: LowStockProduct[] }

interface LowStockRow {
  id: string
  name: string
  stock_pieces: number
  pieces_per_pack: number
  reorder_point_pieces: number | null
  unit_label: string | null
  is_active: boolean
}

export async function getLowStockProducts(limit = 10): Promise<LowStockResult> {
  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ready: false, reason: 'supabase_unconfigured' }
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, stock_pieces, pieces_per_pack, reorder_point_pieces, unit_label, is_active')
    .eq('is_active', true)
    .not('reorder_point_pieces', 'is', null)
    .order('stock_pieces', { ascending: true })
    .limit(limit)

  if (error) {
    return { ready: false, reason: 'query_failed', message: error.message }
  }

  const rows = (data ?? []) as LowStockRow[]
  const products: LowStockProduct[] = rows
    .filter(
      (row) => row.reorder_point_pieces !== null && row.stock_pieces <= row.reorder_point_pieces,
    )
    .map((row) => {
      const split = splitStock(row.stock_pieces, row.pieces_per_pack)
      return {
        id: row.id,
        name: row.name,
        stockPieces: row.stock_pieces,
        piecesPerPack: row.pieces_per_pack,
        reorderPointPieces: row.reorder_point_pieces ?? 0,
        display: displayStock(row.stock_pieces, row.pieces_per_pack, row.unit_label ?? 'piece'),
        packs: split.packs,
        loosePieces: split.loosePieces,
      }
    })

  return { ready: true, products }
}

// ----- Recent sales -----------------------------------------------------------

export type RecentSale = {
  id: string
  receiptNumber: string
  totalAmount: number
  formattedTotal: string
  paymentMethod: string
  isUtang: boolean
  createdAt: string
}

export type RecentSalesResult =
  | { ready: false; reason: 'supabase_unconfigured' | 'query_failed'; message?: string }
  | { ready: true; sales: RecentSale[] }

interface RecentSaleRow {
  id: string
  receipt_number: string
  total_amount: number | string
  payment_method: string
  is_utang: boolean
  created_at: string
}

export async function getRecentSales(limit = 10): Promise<RecentSalesResult> {
  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ready: false, reason: 'supabase_unconfigured' }
  }

  const { data, error } = await supabase
    .from('sales')
    .select('id, receipt_number, total_amount, payment_method, is_utang, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { ready: false, reason: 'query_failed', message: error.message }
  }

  const rows = (data ?? []) as RecentSaleRow[]
  return {
    ready: true,
    sales: rows.map((row) => ({
      id: row.id,
      receiptNumber: row.receipt_number,
      totalAmount: Number(row.total_amount) || 0,
      formattedTotal: formatMoney(Number(row.total_amount) || 0),
      paymentMethod: row.payment_method,
      isUtang: row.is_utang,
      createdAt: row.created_at,
    })),
  }
}

// ----- Per-branch breakdown ---------------------------------------------------

export interface PerBranchRow {
  branchId: string
  branchName: string
  region: string | null
  gross: number
  formattedGross: string
  saleCount: number
  pct: number
}

export type PerBranchResult =
  | { ready: false; reason: 'supabase_unconfigured' | 'query_failed'; message?: string }
  | { ready: true; rows: PerBranchRow[]; gross: number }

interface PerBranchSaleRow {
  branch_id: string
  total_amount: number | string
  // supabase-js types embedded relations as arrays even for single-row FKs.
  branches: Array<{ name: string; region: string | null }> | null
}

export async function getPerBranchBreakdown(
  rangeOrDate: Date | SalesDateRange = new Date(),
): Promise<PerBranchResult> {
  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ready: false, reason: 'supabase_unconfigured' }
  }

  const range = normalizeDateRange(rangeOrDate)

  const { data, error } = await supabase
    .from('sales')
    .select('branch_id, total_amount, branches ( name, region )')
    .gte('created_at', range.from.toISOString())
    .lte('created_at', range.to.toISOString())

  if (error) {
    return { ready: false, reason: 'query_failed', message: error.message }
  }

  const rows = (data ?? []) as PerBranchSaleRow[]
  const grouped = new Map<
    string,
    { name: string; region: string | null; gross: number; count: number }
  >()
  let total = 0

  for (const row of rows) {
    const amount = Number(row.total_amount) || 0
    total += amount
    const branch = row.branches?.[0] ?? null
    const existing = grouped.get(row.branch_id) ?? {
      name: branch?.name ?? '(unknown branch)',
      region: branch?.region ?? null,
      gross: 0,
      count: 0,
    }
    existing.gross += amount
    existing.count += 1
    grouped.set(row.branch_id, existing)
  }

  const sorted: PerBranchRow[] = Array.from(grouped.entries())
    .map(([branchId, info]) => ({
      branchId,
      branchName: info.name,
      region: info.region,
      gross: info.gross,
      formattedGross: formatMoney(info.gross),
      saleCount: info.count,
      pct: total > 0 ? Math.round((info.gross / total) * 100) : 0,
    }))
    .sort((a, b) => b.gross - a.gross)

  return { ready: true, rows: sorted, gross: total }
}

// ----- Per-cashier breakdown --------------------------------------------------

export interface PerCashierRow {
  userId: string | null
  // Privacy posture (ADR-014): owner sees only the last 4 of the cashier's
  // phone, never the full E.164. Owners reconcile against staff records.
  phoneSuffix: string
  role: string
  gross: number
  formattedGross: string
  saleCount: number
  pct: number
}

export type PerCashierResult =
  | { ready: false; reason: 'supabase_unconfigured' | 'query_failed'; message?: string }
  | { ready: true; rows: PerCashierRow[]; gross: number }

interface PerCashierSaleRow {
  user_id: string | null
  total_amount: number | string
  // supabase-js types embedded relations as arrays even for single-row FKs.
  users: Array<{ phone: string | null; role: string | null }> | null
}

function tailPhone(phone: string | null | undefined): string {
  if (!phone) return '——'
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 4 ? `…${digits.slice(-4)}` : `…${digits}`
}

export async function getPerCashierBreakdown(
  rangeOrDate: Date | SalesDateRange = new Date(),
): Promise<PerCashierResult> {
  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ready: false, reason: 'supabase_unconfigured' }
  }

  const range = normalizeDateRange(rangeOrDate)

  const { data, error } = await supabase
    .from('sales')
    .select('user_id, total_amount, users ( phone, role )')
    .gte('created_at', range.from.toISOString())
    .lte('created_at', range.to.toISOString())

  if (error) {
    return { ready: false, reason: 'query_failed', message: error.message }
  }

  const rows = (data ?? []) as PerCashierSaleRow[]
  const grouped = new Map<
    string,
    { phone: string | null; role: string | null; gross: number; count: number }
  >()
  let total = 0

  for (const row of rows) {
    const amount = Number(row.total_amount) || 0
    total += amount
    const key = row.user_id ?? '__unassigned__'
    const user = row.users?.[0] ?? null
    const existing = grouped.get(key) ?? {
      phone: user?.phone ?? null,
      role: user?.role ?? null,
      gross: 0,
      count: 0,
    }
    existing.gross += amount
    existing.count += 1
    grouped.set(key, existing)
  }

  const sorted: PerCashierRow[] = Array.from(grouped.entries())
    .map(([userId, info]) => ({
      userId: userId === '__unassigned__' ? null : userId,
      phoneSuffix: tailPhone(info.phone),
      role: info.role ?? 'unknown',
      gross: info.gross,
      formattedGross: formatMoney(info.gross),
      saleCount: info.count,
      pct: total > 0 ? Math.round((info.gross / total) * 100) : 0,
    }))
    .sort((a, b) => b.gross - a.gross)

  return { ready: true, rows: sorted, gross: total }
}

// ----- Top-selling products ---------------------------------------------------

export interface TopProductRow {
  productId: string
  name: string
  unitLabel: string | null
  piecesSold: number
  gross: number
  formattedGross: string
  pct: number
}

export type TopProductsResult =
  | { ready: false; reason: 'supabase_unconfigured' | 'query_failed'; message?: string }
  | { ready: true; rows: TopProductRow[]; gross: number }

interface TopProductsRow {
  product_id: string
  pieces_sold: number
  subtotal: number | string
  // supabase-js types embedded relations as arrays even for single-row FKs.
  products: Array<{ name: string; unit_label: string | null }> | null
  sales: Array<{ created_at: string }> | null
}

export async function getTopProductsBreakdown(
  rangeOrDate: Date | SalesDateRange = new Date(),
  limit = 10,
): Promise<TopProductsResult> {
  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ready: false, reason: 'supabase_unconfigured' }
  }

  const range = normalizeDateRange(rangeOrDate)

  // Pull every sale_item whose parent sale falls in the selected window. RLS on
  // `sale_items` cascades through the parent `sales` row's tenant scope.
  const { data, error } = await supabase
    .from('sale_items')
    .select(
      'product_id, pieces_sold, subtotal, products ( name, unit_label ), sales!inner ( created_at )',
    )
    .gte('sales.created_at', range.from.toISOString())
    .lte('sales.created_at', range.to.toISOString())

  if (error) {
    return { ready: false, reason: 'query_failed', message: error.message }
  }

  const rows = (data ?? []) as TopProductsRow[]
  const grouped = new Map<
    string,
    { name: string; unitLabel: string | null; pieces: number; gross: number }
  >()
  let total = 0

  for (const row of rows) {
    const subtotal = Number(row.subtotal) || 0
    total += subtotal
    const product = row.products?.[0] ?? null
    const existing = grouped.get(row.product_id) ?? {
      name: product?.name ?? '(unknown product)',
      unitLabel: product?.unit_label ?? null,
      pieces: 0,
      gross: 0,
    }
    existing.pieces += row.pieces_sold
    existing.gross += subtotal
    grouped.set(row.product_id, existing)
  }

  const sorted: TopProductRow[] = Array.from(grouped.entries())
    .map(([productId, info]) => ({
      productId,
      name: info.name,
      unitLabel: info.unitLabel,
      piecesSold: info.pieces,
      gross: info.gross,
      formattedGross: formatMoney(info.gross),
      pct: total > 0 ? Math.round((info.gross / total) * 100) : 0,
    }))
    .sort((a, b) => b.gross - a.gross)
    .slice(0, limit)

  return { ready: true, rows: sorted, gross: total }
}

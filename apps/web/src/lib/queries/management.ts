// Phase W0.8 scaffold — owner management queries.
//
// These are read-only Server Component queries for the management surfaces.
// Mutation flows will layer Server Actions on top later; this file gives the
// web dashboard a real RLS-scoped management backbone without duplicating
// tenant checks in UI code.

import 'server-only'

import {
  DEFAULT_MODULE_STATE,
  FREE_MAX_PRODUCTS,
  FREE_MAX_USERS,
  displayStock,
  formatMoney,
  splitStock,
} from '@tdpos/shared'

import { getServerSupabase } from '@/lib/supabase/server'

type QueryFailureReason = 'supabase_unconfigured' | 'query_failed'

export type QueryResult<T> =
  | { ready: false; reason: QueryFailureReason; message?: string }
  | ({ ready: true } & T)

async function withSupabase<T>(
  query: (supabase: Awaited<ReturnType<typeof getServerSupabase>>) => Promise<QueryResult<T>>,
): Promise<QueryResult<T>> {
  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ready: false, reason: 'supabase_unconfigured' }
  }

  return query(supabase)
}

// ----- Products ---------------------------------------------------------------

export interface ProductManagementRow {
  id: string
  sku: string | null
  name: string
  categoryName: string | null
  stockPieces: number
  piecesPerPack: number
  stockDisplay: string
  packs: number
  loosePieces: number
  pricePerPiece: number
  formattedPricePerPiece: string
  pricePerPack: number | null
  formattedPricePerPack: string | null
  reorderPointPieces: number | null
  isTingi: boolean
  isActive: boolean
}

export type ProductManagementResult = QueryResult<{
  products: ProductManagementRow[]
  activeCount: number
  inactiveCount: number
  lowStockCount: number
  freeLimit: number
}>

interface ProductRow {
  id: string
  sku: string | null
  name: string
  stock_pieces: number
  pieces_per_pack: number
  price_per_piece: number | string
  price_per_pack: number | string | null
  reorder_point_pieces: number | null
  unit_label: string | null
  is_tingi: boolean
  is_active: boolean
  categories: Array<{ name: string }> | null
}

export async function getProductManagementRows(limit = 200): Promise<ProductManagementResult> {
  return withSupabase<{
    products: ProductManagementRow[]
    activeCount: number
    inactiveCount: number
    lowStockCount: number
    freeLimit: number
  }>(async (supabase) => {
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, sku, name, stock_pieces, pieces_per_pack, price_per_piece, price_per_pack, reorder_point_pieces, unit_label, is_tingi, is_active, categories ( name )',
      )
      .order('name', { ascending: true })
      .limit(limit)

    if (error) return { ready: false, reason: 'query_failed', message: error.message }

    const rows = (data ?? []) as ProductRow[]
    const products = rows.map((row) => {
      const split = splitStock(row.stock_pieces, row.pieces_per_pack)
      const pricePerPiece = Number(row.price_per_piece) || 0
      const pricePerPack = row.price_per_pack === null ? null : Number(row.price_per_pack) || 0

      return {
        id: row.id,
        sku: row.sku,
        name: row.name,
        categoryName: row.categories?.[0]?.name ?? null,
        stockPieces: row.stock_pieces,
        piecesPerPack: row.pieces_per_pack,
        stockDisplay: displayStock(row.stock_pieces, row.pieces_per_pack, row.unit_label ?? 'pc'),
        packs: split.packs,
        loosePieces: split.loosePieces,
        pricePerPiece,
        formattedPricePerPiece: formatMoney(pricePerPiece),
        pricePerPack,
        formattedPricePerPack: pricePerPack === null ? null : formatMoney(pricePerPack),
        reorderPointPieces: row.reorder_point_pieces,
        isTingi: row.is_tingi,
        isActive: row.is_active,
      }
    })

    return {
      ready: true,
      products,
      activeCount: products.filter((product) => product.isActive).length,
      inactiveCount: products.filter((product) => !product.isActive).length,
      lowStockCount: products.filter(
        (product) =>
          product.reorderPointPieces !== null && product.stockPieces <= product.reorderPointPieces,
      ).length,
      freeLimit: FREE_MAX_PRODUCTS,
    }
  })
}

// ----- Branches ---------------------------------------------------------------

export interface BranchManagementRow {
  id: string
  name: string
  address: string | null
  region: string | null
  isActive: boolean
}

export type BranchManagementResult = QueryResult<{
  branches: BranchManagementRow[]
  activeCount: number
  inactiveCount: number
}>

interface BranchRow {
  id: string
  name: string
  address: string | null
  region: string | null
  is_active: boolean
}

export async function getBranchManagementRows(limit = 100): Promise<BranchManagementResult> {
  return withSupabase<{
    branches: BranchManagementRow[]
    activeCount: number
    inactiveCount: number
  }>(async (supabase) => {
    const { data, error } = await supabase
      .from('branches')
      .select('id, name, address, region, is_active')
      .order('name', { ascending: true })
      .limit(limit)

    if (error) return { ready: false, reason: 'query_failed', message: error.message }

    const branches = ((data ?? []) as BranchRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      region: row.region,
      isActive: row.is_active,
    }))

    return {
      ready: true,
      branches,
      activeCount: branches.filter((branch) => branch.isActive).length,
      inactiveCount: branches.filter((branch) => !branch.isActive).length,
    }
  })
}

// ----- Users ------------------------------------------------------------------

export interface UserManagementRow {
  id: string
  phoneSuffix: string
  emailPresent: boolean
  role: string
  createdAt: string
}

export type UserManagementResult = QueryResult<{
  users: UserManagementRow[]
  freeLimit: number
}>

interface UserRow {
  id: string
  phone: string | null
  email: string | null
  role: string
  created_at: string
}

function tailPhone(phone: string | null | undefined): string {
  if (!phone) return '--'
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 4 ? `...${digits.slice(-4)}` : `...${digits}`
}

export async function getUserManagementRows(limit = 100): Promise<UserManagementResult> {
  return withSupabase<{
    users: UserManagementRow[]
    freeLimit: number
  }>(async (supabase) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, phone, email, role, created_at')
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) return { ready: false, reason: 'query_failed', message: error.message }

    const users = ((data ?? []) as UserRow[]).map((row) => ({
      id: row.id,
      phoneSuffix: tailPhone(row.phone),
      emailPresent: Boolean(row.email),
      role: row.role,
      createdAt: row.created_at,
    }))

    return { ready: true, users, freeLimit: FREE_MAX_USERS }
  })
}

// ----- Modules / Business -----------------------------------------------------

export interface ModuleManagementRow {
  key: string
  label: string
  enabled: boolean
}

export interface BusinessManagementSummary {
  id: string
  name: string
  address: string | null
  tinPresent: boolean
  subscriptionTier: string
  maxBranches: number
  eoptAccredited: boolean
}

export type ModuleManagementResult = QueryResult<{
  business: BusinessManagementSummary | null
  modules: ModuleManagementRow[]
}>

interface BusinessRow {
  id: string
  name: string
  address: string | null
  tin: string | null
  subscription_tier: string
  max_branches: number
  eopt_accredited: boolean
}

const MODULE_LABELS: Record<keyof typeof DEFAULT_MODULE_STATE, string> = {
  utang: 'Utang ledger',
  customer_sms: 'Customer SMS',
  loyalty: 'Loyalty',
  supplier_management: 'Supplier management',
  multi_branch: 'Multi-branch',
  franchise_management: 'Franchise management',
  payroll: 'Payroll',
  accounting_integration: 'Accounting integration',
  public_api: 'Public API',
}

export async function getModuleManagementRows(): Promise<ModuleManagementResult> {
  return withSupabase<{
    business: BusinessManagementSummary | null
    modules: ModuleManagementRow[]
  }>(async (supabase) => {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, address, tin, subscription_tier, max_branches, eopt_accredited')
      .limit(1)
      .maybeSingle()

    if (error) return { ready: false, reason: 'query_failed', message: error.message }

    const row = data as BusinessRow | null

    return {
      ready: true,
      business: row
        ? {
            id: row.id,
            name: row.name,
            address: row.address,
            tinPresent: Boolean(row.tin),
            subscriptionTier: row.subscription_tier,
            maxBranches: row.max_branches,
            eoptAccredited: row.eopt_accredited,
          }
        : null,
      modules: Object.entries(DEFAULT_MODULE_STATE).map(([key, enabled]) => ({
        key,
        label: MODULE_LABELS[key as keyof typeof DEFAULT_MODULE_STATE],
        enabled,
      })),
    }
  })
}

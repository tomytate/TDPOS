// Phase W0.8 scaffold — owner management queries.
//
// These are read-only Server Component queries for the management surfaces.
// Mutation flows will layer Server Actions on top later; this file gives the
// web dashboard a real RLS-scoped management backbone without duplicating
// tenant checks in UI code.

import 'server-only'

import {
  displayStock,
  formatMoney,
  getTierDefinition,
  getTierModuleState,
  isTierSurfaceEnabled,
  normalizeSubscriptionTier,
  splitStock,
  type ModuleName,
  type SubscriptionTier,
  type TierSurface,
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

// ----- Entitlements -----------------------------------------------------------

export interface BusinessEntitlements {
  tier: SubscriptionTier
  tierLabel: string
  tierShortLabel: string
  description: string
  maxProducts: number | null
  maxBranches: number | null
  maxDevices: number | null
  maxUsers: number | null
  // Effective module state: the tier's defaults merged with DB overrides.
  // Owners can disable an unlocked module; they cannot enable a locked one
  // (DB-true on a tier-false module clamps to false).
  modules: Record<ModuleName, boolean>
  entitlementsValidUntil: string | null
  isSurfaceEnabled: (surface: TierSurface) => boolean
}

export type EntitlementsResult = QueryResult<{ entitlements: BusinessEntitlements }>

interface BusinessEntitlementsRow {
  subscription_tier: string | null
  module_state: Record<string, boolean> | null
  entitlements_valid_until: string | null
  max_products: number | null
  max_branches: number | null
  max_devices: number | null
  max_users: number | null
}

function buildEntitlements(row: BusinessEntitlementsRow | null): BusinessEntitlements {
  const tier = normalizeSubscriptionTier(row?.subscription_tier)
  const definition = getTierDefinition(tier)
  const tierModules = getTierModuleState(tier)
  const dbModules = row?.module_state ?? {}

  const modules = (Object.keys(tierModules) as ModuleName[]).reduce(
    (acc, key) => {
      const dbValue = dbModules[key]
      // DB false wins (owner disable). DB true is ignored on locked modules.
      acc[key] = typeof dbValue === 'boolean' ? dbValue && tierModules[key] : tierModules[key]
      return acc
    },
    {} as Record<ModuleName, boolean>,
  )

  return {
    tier,
    tierLabel: definition.label,
    tierShortLabel: definition.shortLabel,
    description: definition.description,
    // DB nulls fall back to tier defaults; tier nulls (enterprise) propagate
    // as `null` meaning unlimited.
    maxProducts: row?.max_products ?? definition.maxProducts,
    maxBranches: row?.max_branches ?? definition.maxBranches,
    maxDevices: row?.max_devices ?? definition.maxDevices,
    maxUsers: row?.max_users ?? definition.maxUsers,
    modules,
    entitlementsValidUntil: row?.entitlements_valid_until ?? null,
    isSurfaceEnabled: (surface: TierSurface) => isTierSurfaceEnabled(tier, surface),
  }
}

export async function getBusinessEntitlements(): Promise<EntitlementsResult> {
  return withSupabase<{ entitlements: BusinessEntitlements }>(async (supabase) => {
    const { data, error } = await supabase
      .from('businesses')
      .select(
        'subscription_tier, module_state, entitlements_valid_until, max_products, max_branches, max_devices, max_users',
      )
      .limit(1)
      .maybeSingle()

    if (error) return { ready: false, reason: 'query_failed', message: error.message }

    return {
      ready: true,
      entitlements: buildEntitlements((data as BusinessEntitlementsRow) ?? null),
    }
  })
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

    return { ready: true, users }
  })
}

// ----- Modules / Business -----------------------------------------------------

export interface ModuleManagementRow {
  key: ModuleName
  label: string
  enabled: boolean
  // True when the tier unlocks this module — distinguishes "off because tier
  // doesn't include it" from "off because owner toggled it off".
  unlockedByTier: boolean
}

export interface BusinessManagementSummary {
  id: string
  name: string
  address: string | null
  tinPresent: boolean
  eoptAccredited: boolean
}

export type ModuleManagementResult = QueryResult<{
  business: BusinessManagementSummary | null
  entitlements: BusinessEntitlements
  modules: ModuleManagementRow[]
}>

interface BusinessRow {
  id: string
  name: string
  address: string | null
  tin: string | null
  eopt_accredited: boolean
  subscription_tier: string | null
  module_state: Record<string, boolean> | null
  entitlements_valid_until: string | null
  max_products: number | null
  max_branches: number | null
  max_devices: number | null
  max_users: number | null
}

const MODULE_LABELS: Record<ModuleName, string> = {
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
    entitlements: BusinessEntitlements
    modules: ModuleManagementRow[]
  }>(async (supabase) => {
    const { data, error } = await supabase
      .from('businesses')
      .select(
        'id, name, address, tin, eopt_accredited, subscription_tier, module_state, entitlements_valid_until, max_products, max_branches, max_devices, max_users',
      )
      .limit(1)
      .maybeSingle()

    if (error) return { ready: false, reason: 'query_failed', message: error.message }

    const row = data as BusinessRow | null
    const entitlements = buildEntitlements(row)
    const tierModules = getTierModuleState(entitlements.tier)

    return {
      ready: true,
      business: row
        ? {
            id: row.id,
            name: row.name,
            address: row.address,
            tinPresent: Boolean(row.tin),
            eoptAccredited: row.eopt_accredited,
          }
        : null,
      entitlements,
      modules: (Object.keys(MODULE_LABELS) as ModuleName[]).map((key) => ({
        key,
        label: MODULE_LABELS[key],
        enabled: entitlements.modules[key],
        unlockedByTier: tierModules[key],
      })),
    }
  })
}

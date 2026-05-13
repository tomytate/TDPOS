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
  resolveTierModuleState,
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
  tierPublicName: string
  segment: string
  description: string
  billing: 'free' | 'paid' | 'enterprise'
  uiMode: string
  uiSource: string
  upgradeTarget: SubscriptionTier | null
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
  const modules = resolveTierModuleState(tier, row?.module_state)

  return {
    tier,
    tierLabel: definition.label,
    tierShortLabel: definition.shortLabel,
    tierPublicName: definition.publicName,
    segment: definition.segment,
    description: definition.description,
    billing: definition.billing,
    uiMode: definition.uiMode,
    uiSource: definition.uiSource,
    upgradeTarget: definition.upgradeTarget,
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

export interface CategoryManagementRow {
  id: string
  name: string
  color: string | null
}

export type CategoryManagementResult = QueryResult<{
  categories: CategoryManagementRow[]
}>

interface CategoryRow {
  id: string
  name: string
  color: string | null
}

export async function getCategoryManagementRows(limit = 100): Promise<CategoryManagementResult> {
  return withSupabase<{
    categories: CategoryManagementRow[]
  }>(async (supabase) => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, color')
      .order('name', { ascending: true })
      .limit(limit)

    if (error) return { ready: false, reason: 'query_failed', message: error.message }

    return {
      ready: true,
      categories: ((data ?? []) as CategoryRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
      })),
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

// ----- Devices ----------------------------------------------------------------

export interface DeviceManagementRow {
  id: string
  installTail: string
  deviceName: string | null
  branchName: string | null
  surface: string
  status: string
  lastSeenAt: string | null
  unsyncedRows: number | null
  pendingRows: number | null
  failedRows: number | null
  reviewableRows: number | null
  oldestPendingCreatedAt: number | null
  receiptSequences: DeviceReceiptSequence[]
  lostReportedAt: string | null
  replacementRequestedAt: string | null
  recoveryNote: string | null
}

export type DeviceManagementResult = QueryResult<{
  devices: DeviceManagementRow[]
  activeCount: number
  lostCount: number
}>

export interface DeviceReceiptSequence {
  branchCode: string
  cashierCode: string
  date: string
  lastSequence: number
}

interface DeviceRow {
  id: string
  install_id: string
  device_name: string | null
  surface: string
  status: string
  last_seen_at: string | null
  lost_reported_at: string | null
  replacement_requested_at: string | null
  recovery_note: string | null
  sync_snapshot: {
    unsynced_rows?: unknown
    pending_rows?: unknown
    failed_rows?: unknown
    reviewable_rows?: unknown
    oldest_pending_created_at?: unknown
    receipt_sequences?: unknown
  } | null
  branches: Array<{ name: string }> | null
}

function tailInstallId(value: string): string {
  return value.length > 8 ? `...${value.slice(-8)}` : value
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function receiptSequencesFromSnapshot(value: unknown): DeviceReceiptSequence[] {
  if (!Array.isArray(value)) return []

  return value
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return null
      const row = entry as Record<string, unknown>
      if (
        typeof row.branch_code !== 'string' ||
        typeof row.cashier_code !== 'string' ||
        typeof row.date !== 'string' ||
        typeof row.last_sequence !== 'number'
      ) {
        return null
      }

      return {
        branchCode: row.branch_code,
        cashierCode: row.cashier_code,
        date: row.date,
        lastSequence: row.last_sequence,
      }
    })
    .filter((entry): entry is DeviceReceiptSequence => entry !== null)
}

export async function getDeviceManagementRows(limit = 100): Promise<DeviceManagementResult> {
  return withSupabase<{
    devices: DeviceManagementRow[]
    activeCount: number
    lostCount: number
  }>(async (supabase) => {
    const { data, error } = await supabase
      .from('business_devices')
      .select(
        `id, install_id, device_name, surface, status, last_seen_at,
         lost_reported_at, replacement_requested_at, recovery_note,
         sync_snapshot, branches ( name )`,
      )
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) return { ready: false, reason: 'query_failed', message: error.message }

    const devices = ((data ?? []) as DeviceRow[]).map((row) => ({
      id: row.id,
      installTail: tailInstallId(row.install_id),
      deviceName: row.device_name,
      branchName: row.branches?.[0]?.name ?? null,
      surface: row.surface,
      status: row.status,
      lastSeenAt: row.last_seen_at,
      unsyncedRows: numberOrNull(row.sync_snapshot?.unsynced_rows),
      pendingRows: numberOrNull(row.sync_snapshot?.pending_rows),
      failedRows: numberOrNull(row.sync_snapshot?.failed_rows),
      reviewableRows: numberOrNull(row.sync_snapshot?.reviewable_rows),
      oldestPendingCreatedAt: numberOrNull(row.sync_snapshot?.oldest_pending_created_at),
      receiptSequences: receiptSequencesFromSnapshot(row.sync_snapshot?.receipt_sequences),
      lostReportedAt: row.lost_reported_at,
      replacementRequestedAt: row.replacement_requested_at,
      recoveryNote: row.recovery_note,
    }))

    return {
      ready: true,
      devices,
      activeCount: devices.filter((device) => device.status === 'active').length,
      lostCount: devices.filter((device) => device.status === 'lost').length,
    }
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

// ----- Customer Privacy -------------------------------------------------------

interface CustomerPrivacyRowRaw {
  id: string
  name: string
  phone: string | null
  barangay: string | null
  points_balance: number | null
  total_utang: number | string | null
  pii_erased: boolean | null
  erased_at: string | null
  created_at: string
}

export interface CustomerPrivacyRow {
  id: string
  name: string
  phoneSuffix: string
  barangay: string | null
  pointsBalance: number
  formattedUtang: string
  piiErased: boolean
  erasedAt: string | null
  createdAt: string
}

export type CustomerPrivacyResult = QueryResult<{
  canErase: boolean
  customers: CustomerPrivacyRow[]
}>

function phoneSuffix(value: string | null): string {
  if (!value) return '--'
  const digits = value.replace(/\D/g, '')
  const tail = digits.slice(-4)

  return tail ? `***${tail}` : '--'
}

export async function getCustomerPrivacyRows(limit = 100): Promise<CustomerPrivacyResult> {
  return withSupabase<{ canErase: boolean; customers: CustomerPrivacyRow[] }>(async (supabase) => {
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('role')
      .limit(1)
      .maybeSingle()

    if (userError) return { ready: false, reason: 'query_failed', message: userError.message }

    const role = (userRow as { role?: string } | null)?.role
    if (role !== 'owner' && role !== 'manager') {
      return { ready: true, canErase: false, customers: [] }
    }

    const { data, error } = await supabase
      .from('customers')
      .select(
        'id, name, phone, barangay, points_balance, total_utang, pii_erased, erased_at, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return { ready: false, reason: 'query_failed', message: error.message }

    return {
      ready: true,
      canErase: true,
      customers: ((data ?? []) as CustomerPrivacyRowRaw[]).map((row) => ({
        id: row.id,
        name: row.pii_erased ? 'Erased customer' : row.name,
        phoneSuffix: row.pii_erased ? '--' : phoneSuffix(row.phone),
        barangay: row.pii_erased ? null : row.barangay,
        pointsBalance: row.pii_erased ? 0 : (row.points_balance ?? 0),
        formattedUtang: formatMoney(row.pii_erased ? 0 : Number(row.total_utang ?? 0)),
        piiErased: row.pii_erased ?? false,
        erasedAt: row.erased_at,
        createdAt: row.created_at,
      })),
    }
  })
}

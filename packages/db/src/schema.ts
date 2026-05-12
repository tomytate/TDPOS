// @tdpos/db — Canonical schema types matching Supabase + SQLite tables
// Source of truth: docs/database-schema.md, supabase/migrations/, and
// apps/mobile/src/db/migrations/ for local-only SQLite tables.

import type { ModuleName, SubscriptionTier, TierSurface } from '@tdpos/shared'

export type DbBoolean = boolean | 0 | 1
export type DbTimestamp = string | number

export interface DbUser {
  id: string
  phone: string
  email: string | null
  role: string
  business_id: string
  created_at: DbTimestamp
}

export interface DbBusiness {
  id: string
  name: string
  tin: string | null
  bir_rdo: string | null
  address: string | null
  // Canonical 5-tier value: 'tier_a_free' | 'tier_b_pro' | 'tier_c_plus'
  // | 'tier_d_premium' | 'tier_e_enterprise'. Old six-tier names (free,
  // starter, pro, growth, business, enterprise) are normalized at the
  // migration boundary; runtime code routes through
  // `normalizeSubscriptionTier` from `@tdpos/shared`.
  subscription_tier: SubscriptionTier
  // Per-tenant module overrides. Defaults to {} on insert; the tier's
  // module unlocks (`getTierModuleState(tier)`) are merged at read-time
  // with this row taking precedence so owners can disable an unlocked
  // module without dropping a tier.
  module_state: Partial<Record<ModuleName, boolean>>
  // Hard limits — null means unlimited. Backfilled from tier defaults
  // when missing; per-tenant adjustments live here.
  max_branches: number | null
  max_products: number | null
  max_devices: number | null
  max_users: number | null
  // ISO timestamp when the current entitlements expire. null = no expiry
  // (tier_a_free or perpetual). Past dates fall back to tier_a_free
  // entitlements at read-time.
  entitlements_valid_until: DbTimestamp | null
  eopt_accredited: DbBoolean
  created_at: DbTimestamp
}

export interface DbBranch {
  id: string
  business_id: string
  name: string
  address: string | null
  region: string | null
  is_active: DbBoolean
}

export interface DbProduct {
  id: string
  business_id: string
  sku: string | null
  name: string
  category_id: string | null
  price_per_piece: number
  price_per_pack: number | null
  cost_per_piece: number | null
  stock_pieces: number // INTEGER — canonical unit
  pieces_per_pack: number // INTEGER — default 1
  reorder_point_pieces: number | null
  unit_label: string | null
  is_tingi: DbBoolean
  is_active: DbBoolean
  created_at: DbTimestamp
  updated_at: DbTimestamp
}

export interface DbCategory {
  id: string
  business_id: string
  name: string
  color: string | null
  created_at: DbTimestamp
}

export interface DbSale {
  id: string
  business_id?: string
  branch_id: string
  user_id: string | null
  customer_id: string | null
  total_amount: number
  payment_method: string
  status: string
  is_utang: DbBoolean
  utang_balance: number | null
  receipt_number: string
  created_at: DbTimestamp
  device_timezone: string | null
  synced_server_time_at_last_handshake: DbTimestamp | null
  received_at?: DbTimestamp
  synced_at: DbTimestamp | null
}

export interface DbSaleItem {
  id: string
  sale_id: string
  product_id: string
  pieces_sold: number // INTEGER — always in pieces
  was_sold_as: 'piece' | 'pack'
  unit_price: number
  discount: number
  subtotal: number
}

export interface DbInventoryLog {
  id: string
  product_id: string
  branch_id: string
  type: 'stock_in' | 'sale' | 'adjustment' | 'transfer'
  pieces_delta: number
  reason: string | null
  user_id: string | null
  created_at: DbTimestamp
}

export interface DbStockTakeCount {
  id: string
  business_id?: string
  product_id: string
  branch_id: string
  counted_stock_pieces: number
  system_stock_pieces_before: number
  pieces_delta: number
  reason: string
  reason_note: string | null
  user_id: string | null
  created_at: DbTimestamp
}

export interface DbCustomer {
  id: string
  business_id: string
  name: string
  phone: string | null
  barangay: string | null
  points_balance: number
  total_utang: number
  pii_erased: DbBoolean
  erased_at: DbTimestamp | null
  erased_by: string | null
  erasure_reason: string | null
  created_at: DbTimestamp
}

export interface DbSyncQueueRow {
  id: number
  client_operation_id: string
  table_name: string
  record_id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'DELTA'
  payload: string // JSON
  base_version: number | null
  created_at: number
  synced_at: number | null
  retry_count: number
  last_error: string | null
}

export interface DbAppliedOperation {
  business_id: string
  client_operation_id: string
  status: 'in_progress' | 'completed' | 'failed'
  result: Record<string, unknown> | null
  applied_at: DbTimestamp
  completed_at: DbTimestamp | null
}

export interface DbAuditLog {
  id: string
  business_id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  created_at: DbTimestamp
}

export interface DbBusinessDevice {
  id: string
  business_id: string
  branch_id: string | null
  install_id: string
  device_name: string | null
  surface: TierSurface
  status: 'active' | 'inactive' | 'lost'
  last_seen_at: DbTimestamp | null
  entitlement_snapshot: Record<string, unknown>
  sync_snapshot: Record<string, unknown>
  created_at: DbTimestamp
}

export interface DbShiftSession {
  id: string
  business_id: string
  branch_id: string
  user_id: string | null
  device_id: string | null
  status: 'open' | 'closed' | 'voided'
  opened_at: DbTimestamp
  closed_at: DbTimestamp | null
  opening_cash: number
  expected_cash: number | null
  counted_cash: number | null
  variance: number | null
  handoff_note: string | null
  created_at: DbTimestamp
}

export interface DbManagerApprovalRequest {
  id: string
  business_id: string
  branch_id: string | null
  requested_by: string | null
  reviewed_by: string | null
  surface: TierSurface
  action: string
  status: 'pending' | 'approved' | 'declined' | 'expired'
  payload: Record<string, unknown>
  decision_note: string | null
  created_at: DbTimestamp
  reviewed_at: DbTimestamp | null
}

export interface DbWeightedPluProfile {
  id: string
  business_id: string
  product_id: string
  plu_code: string
  unit_label: string
  price_basis: 'per_kg' | 'per_gram'
  tare_grams: number
  rounding_mode: 'nearest_centavo' | 'up_centavo' | 'down_centavo'
  is_active: DbBoolean
  created_at: DbTimestamp
}

export interface DbKioskOrder {
  id: string
  business_id: string
  branch_id: string
  device_id: string | null
  status: 'draft' | 'awaiting_staff' | 'confirmed' | 'cancelled'
  customer_label: string | null
  payload: Record<string, unknown>
  total_amount: number
  created_at: DbTimestamp
  confirmed_at: DbTimestamp | null
}

export interface DbReturnRequest {
  id: string
  business_id: string
  branch_id: string
  original_sale_id: string | null
  compensating_sale_id: string | null
  requested_by: string | null
  approved_by: string | null
  status: 'pending' | 'approved' | 'declined' | 'completed'
  reason_code: string
  reason_note: string | null
  payload: Record<string, unknown>
  created_at: DbTimestamp
  resolved_at: DbTimestamp | null
}

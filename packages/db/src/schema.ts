// @tdpos/db — Canonical schema types matching Supabase + SQLite tables
// Source of truth: docs/database-schema.md, supabase/migrations/, and
// apps/mobile/src/db/migrations/ for local-only SQLite tables.

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
  subscription_tier: string
  // Per-tenant module overrides. Defaults to {} on insert; the tier's
  // module unlocks (`getTierModuleState(tier)`) are merged at read-time
  // with this row taking precedence so owners can disable an unlocked
  // module without dropping a tier.
  module_state: Record<string, boolean>
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

export interface DbCustomer {
  id: string
  business_id: string
  name: string
  phone: string | null
  barangay: string | null
  points_balance: number
  total_utang: number
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

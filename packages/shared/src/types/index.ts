// @tdpos/shared — Shared type definitions
// These types are used across mobile and web apps

export type PaymentMethod = 'cash' | 'qr_ph' | 'gcash' | 'maya'

export type SaleStatus = 'completed' | 'voided' | 'pending_sync' | 'pending_sync_review'

export type SoldAs = 'piece' | 'pack'

export type VoidReason =
  | 'wrong_item'
  | 'customer_cancelled'
  | 'duplicate_sale'
  | 'cashier_error'
  | 'other'

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'DELTA'

export type InventoryLogType = 'stock_in' | 'sale' | 'adjustment' | 'transfer'

export type StockAdjustmentReason = 'count_correction' | 'damage' | 'theft' | 'expiry' | 'other'

export type UserRole = 'owner' | 'manager' | 'cashier' | 'tindera'

export type SubscriptionTier =
  | 'tier_a_free'
  | 'tier_b_pro'
  | 'tier_c_plus'
  | 'tier_d_premium'
  | 'tier_e_enterprise'

export type LegacySubscriptionTier =
  | 'free'
  | 'starter'
  | 'growth'
  | 'pro'
  | 'business'
  | 'enterprise'

export type ModuleName =
  | 'utang'
  | 'customer_sms'
  | 'loyalty'
  | 'supplier_management'
  | 'multi_branch'
  | 'franchise_management'
  | 'payroll'
  | 'accounting_integration'
  | 'public_api'

export type TierSurface =
  | 'mobile.tier_a_cashier'
  | 'mobile.tablet_pos'
  | 'mobile.owner_lanes'
  | 'mobile.shift_login'
  | 'mobile.shift_handoff'
  | 'mobile.convenience_counter'
  | 'mobile.manager_phone'
  | 'mobile.supermarket_counter'
  | 'mobile.customer_display'
  | 'mobile.backoffice_audit'
  | 'mobile.weighted_plu'
  | 'mobile.hq_rollup'
  | 'mobile.self_service_kiosk'
  | 'mobile.returns_warranty'
  | 'web.overview'
  | 'web.products'
  | 'web.branches'
  | 'web.users'
  | 'web.devices'
  | 'web.modules'
  | 'web.sync'
  | 'web.audit'
  | 'web.exports'
  | 'web.hq'
  | 'marketing.pricing'

export type AppliedOperationStatus = 'in_progress' | 'completed' | 'failed'

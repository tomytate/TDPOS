// @tdpos/shared — Shared type definitions
// These types are used across mobile and web apps

export type PaymentMethod = 'cash' | 'qr_ph' | 'gcash' | 'maya'

export type SaleStatus = 'completed' | 'voided' | 'pending_sync' | 'pending_sync_review'

export type SoldAs = 'piece' | 'pack'

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'DELTA'

export type InventoryLogType = 'stock_in' | 'sale' | 'adjustment' | 'transfer'

export type UserRole = 'owner' | 'manager' | 'cashier' | 'tindera'

export type SubscriptionTier = 'free' | 'starter' | 'growth' | 'pro' | 'business' | 'enterprise'

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

export type AppliedOperationStatus = 'in_progress' | 'completed' | 'failed'

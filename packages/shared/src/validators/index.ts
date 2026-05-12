// @tdpos/shared — Zod 4 validators
// Uses top-level format functions (z.uuid, z.int, z.e164)
// Error customization: string shorthand or { error: '...' } param

import { z } from 'zod'

import { DEFAULT_MODULE_STATE, LEGACY_TIER_MAP, SUBSCRIPTION_TIERS } from '../constants/index'
import type { LegacySubscriptionTier, ModuleName } from '../types/index'

const LEGACY_SUBSCRIPTION_TIERS = Object.keys(LEGACY_TIER_MAP) as [
  LegacySubscriptionTier,
  ...LegacySubscriptionTier[],
]
const MODULE_NAMES = Object.keys(DEFAULT_MODULE_STATE) as [ModuleName, ...ModuleName[]]

export const subscriptionTierSchema = z.enum(SUBSCRIPTION_TIERS)
export const legacySubscriptionTierSchema = z.enum(LEGACY_SUBSCRIPTION_TIERS)
export const moduleNameSchema = z.enum(MODULE_NAMES)
export const moduleStateSchema = z.partialRecord(moduleNameSchema, z.boolean())
// PH phone number validator (E.164 format: +639XXXXXXXXX)
export const phPhoneSchema = z.e164({ error: 'Phone must be E.164 format (+639XX...)' })
const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional()

export const businessEntitlementsSchema = z.object({
  subscription_tier: subscriptionTierSchema,
  module_state: moduleStateSchema.default({}),
  entitlements_valid_until: z.string().datetime().nullable().optional(),
  max_products: z.int().nonnegative().nullable().optional(),
  max_branches: z.int().nonnegative().nullable().optional(),
  max_devices: z.int().nonnegative().nullable().optional(),
  max_users: z.int().nonnegative().nullable().optional(),
})

export const productSchema = z.object({
  id: z.uuid(),
  business_id: z.uuid(),
  sku: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  category_id: z.uuid().optional(),
  price_per_piece: z.number().nonnegative({ error: 'Price must be non-negative' }),
  price_per_pack: z.number().nonnegative().optional(),
  cost_per_piece: z.number().nonnegative().optional(),
  stock_pieces: z.int().nonnegative({ error: 'Stock cannot be negative' }),
  pieces_per_pack: z.int().positive({ error: 'Pieces per pack must be at least 1' }),
  reorder_point_pieces: z.int().nonnegative().optional(),
  unit_label: z.string().optional(),
  is_tingi: z.boolean().default(false),
})

export const productManagementDraftSchema = z.object({
  sku: optionalTextSchema,
  name: z.string().trim().min(1, 'Product name is required'),
  price_per_piece: z.coerce.number().nonnegative({ error: 'Price must be non-negative' }),
  price_per_pack: z.coerce.number().nonnegative().optional(),
  stock_pieces: z.coerce.number().int().nonnegative({ error: 'Stock cannot be negative' }),
  pieces_per_pack: z.coerce
    .number()
    .int()
    .positive({ error: 'Pieces per pack must be at least 1' }),
  unit_label: z.string().trim().min(1, 'Unit label is required').default('pc'),
  is_tingi: z.boolean().default(false),
})

export const branchManagementDraftSchema = z.object({
  name: z.string().trim().min(1, 'Branch name is required'),
  address: optionalTextSchema,
  region: optionalTextSchema,
})

export const categoryManagementDraftSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, { error: 'Use a hex color like #0f766e' })
    .optional(),
})

export const userInviteDraftSchema = z.object({
  phone: phPhoneSchema,
  role: z.enum(['owner', 'manager', 'cashier', 'tindera']),
})

export const moduleManagementDraftSchema = z.object({
  modules: moduleStateSchema,
})

export const deviceManagementDraftSchema = z.object({
  device_id: z.uuid({ error: 'Choose a registered device' }),
  status: z.enum(['active', 'inactive', 'lost']),
})

export const customerErasureDraftSchema = z.object({
  customer_id: z.uuid({ error: 'Choose a customer' }),
  reason: optionalTextSchema,
})

export const tenantDataExportRequestSchema = z.object({
  client_operation_id: z.uuid({ error: 'client_operation_id must be a valid UUID' }),
})

export const saleItemSchema = z.object({
  id: z.uuid(),
  sale_id: z.uuid(),
  product_id: z.uuid(),
  pieces_sold: z.int().positive({ error: 'Must sell at least 1 piece' }),
  was_sold_as: z.enum(['piece', 'pack']),
  unit_price: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  subtotal: z.number().nonnegative(),
})

export const inventoryDeltaSchema = z.object({
  client_operation_id: z.uuid({ error: 'client_operation_id must be a valid UUID' }),
  product_id: z.uuid(),
  branch_id: z.uuid(),
  delta: z.int({ error: 'Delta must be an integer' }),
  reason: z.string().default('sale'),
})

// Receipt number format BRANCH-CASHIER-DATE-SEQUENCE
const RECEIPT_NUMBER_PATTERN = /^[A-Z0-9]{3,5}-[A-Z0-9]{2,5}-\d{8}-\d{6}$/

export const paymentMethodSchema = z.enum(['cash', 'qr_ph', 'gcash', 'maya'])
export const saleStatusSchema = z.enum([
  'completed',
  'voided',
  'pending_sync',
  'pending_sync_review',
])

export const saleSchema = z.object({
  id: z.uuid(),
  business_id: z.uuid().optional(),
  branch_id: z.uuid(),
  user_id: z.uuid().nullable().optional(),
  customer_id: z.uuid().nullable().optional(),
  total_amount: z.number().nonnegative({ error: 'Total cannot be negative' }),
  payment_method: paymentMethodSchema,
  status: saleStatusSchema,
  is_utang: z.boolean(),
  utang_balance: z.number().nullable().optional(),
  receipt_number: z.string().regex(RECEIPT_NUMBER_PATTERN, {
    error: 'Receipt number must be BRANCH-CASHIER-DATE-SEQUENCE',
  }),
})

const syncSaleItemSchema = z.object({
  sale_item_id: z.uuid(),
  product_id: z.uuid(),
  pieces_sold: z.int().positive(),
  was_sold_as: z.enum(['piece', 'pack']),
  unit_price: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
})

export const syncSalePayloadSchema = z.object({
  client_operation_id: z.uuid(),
  sale_id: z.uuid(),
  branch_id: z.uuid(),
  business_id: z.uuid().optional(),
  user_id: z.uuid().nullable().optional(),
  customer_id: z.uuid().nullable().optional(),
  total_amount: z.number().nonnegative(),
  payment_method: paymentMethodSchema,
  is_utang: z.boolean(),
  utang_balance: z.number().nullable().optional(),
  receipt_number: z.string().regex(RECEIPT_NUMBER_PATTERN),
  device_local_time: z.int().nonnegative({ error: 'Device clock time required' }),
  device_timezone: z.string().trim().min(1).optional(),
  synced_server_time_at_last_handshake: z.string().datetime().nullable().optional(),
  items: z.array(syncSaleItemSchema).min(1),
})

export const syncInventoryDeltaPayloadSchema = inventoryDeltaSchema.extend({
  sale_id: z.uuid().optional(),
})

export const syncQueueEnvelopeSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('INSERT'),
    table_name: z.literal('sales'),
    record_id: z.uuid(),
    payload: syncSalePayloadSchema,
  }),
  z.object({
    operation: z.literal('DELTA'),
    table_name: z.literal('products'),
    record_id: z.uuid(),
    payload: syncInventoryDeltaPayloadSchema,
  }),
])

export type Product = z.infer<typeof productSchema>
export type ProductManagementDraft = z.infer<typeof productManagementDraftSchema>
export type BranchManagementDraft = z.infer<typeof branchManagementDraftSchema>
export type CategoryManagementDraft = z.infer<typeof categoryManagementDraftSchema>
export type UserInviteDraft = z.infer<typeof userInviteDraftSchema>
export type ModuleManagementDraft = z.infer<typeof moduleManagementDraftSchema>
export type DeviceManagementDraft = z.infer<typeof deviceManagementDraftSchema>
export type CustomerErasureDraft = z.infer<typeof customerErasureDraftSchema>
export type TenantDataExportRequest = z.infer<typeof tenantDataExportRequestSchema>
export type SaleItem = z.infer<typeof saleItemSchema>
export type InventoryDelta = z.infer<typeof inventoryDeltaSchema>
export type Sale = z.infer<typeof saleSchema>
export type BusinessEntitlements = z.infer<typeof businessEntitlementsSchema>
export type SyncSalePayload = z.infer<typeof syncSalePayloadSchema>
export type SyncInventoryDeltaPayload = z.infer<typeof syncInventoryDeltaPayloadSchema>
export type SyncQueueEnvelope = z.infer<typeof syncQueueEnvelopeSchema>

// @tdpos/shared — Zod 4 validators
// Uses top-level format functions (z.uuid, z.int, z.e164)
// Error customization: string shorthand or { error: '...' } param

import { z } from 'zod'

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

// PH phone number validator (E.164 format: +639XXXXXXXXX)
export const phPhoneSchema = z.e164({ error: 'Phone must be E.164 format (+639XX...)' })

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
export type SaleItem = z.infer<typeof saleItemSchema>
export type InventoryDelta = z.infer<typeof inventoryDeltaSchema>
export type Sale = z.infer<typeof saleSchema>
export type SyncSalePayload = z.infer<typeof syncSalePayloadSchema>
export type SyncInventoryDeltaPayload = z.infer<typeof syncInventoryDeltaPayloadSchema>
export type SyncQueueEnvelope = z.infer<typeof syncQueueEnvelopeSchema>

// @tdpos/db — Row-level Zod validators
//
// Single re-export surface so server-side code (Edge Functions, future
// `apps/web` route handlers) can import the same Zod schemas the mobile
// app uses — without depending on `@tdpos/shared` directly. This keeps
// `@tdpos/db` the canonical "data contract" package.
//
// DocGate-3 stretch item. P2.5.

export {
  productSchema,
  saleSchema,
  saleItemSchema,
  paymentMethodSchema,
  saleStatusSchema,
  inventoryDeltaSchema,
  syncSalePayloadSchema,
  syncInventoryDeltaPayloadSchema,
  syncQueueEnvelopeSchema,
  phPhoneSchema,
} from '@tdpos/shared'

export type {
  Product,
  Sale,
  SaleItem,
  InventoryDelta,
  SyncSalePayload,
  SyncInventoryDeltaPayload,
  SyncQueueEnvelope,
} from '@tdpos/shared'

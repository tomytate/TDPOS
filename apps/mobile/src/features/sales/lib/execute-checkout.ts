// Checkout execution — local-first sale recording.
// Writes sale + sale_items + inventory delta + sync_queue envelope
// in a single SQLite transaction. Idempotent via client_operation_id.

import {
  createClientOperationId,
  formatReceiptDate,
  generateReceiptNumber,
  piecesForSaleUnit,
  type PaymentMethod,
  type SoldAs,
} from '@tdpos/shared'

import type { AsyncSqliteLike } from '@/db/async-sqlite'

export interface ExecuteCheckoutCartItem {
  productId: string
  name: string
  qty: number
  unitPrice: number
  wasSoldAs: SoldAs
  piecesPerPack: number
  lineTotal: number
}

export interface ExecuteCheckoutCart {
  items: ExecuteCheckoutCartItem[]
  total: number
  tendered: number
  paymentMethod: PaymentMethod
  isUtang: boolean
}

export interface ExecuteCheckoutDevice {
  branchId: string
  branchCode: string
  cashierCode: string
  userId?: string | null
  customerId?: string | null
  businessId?: string | null
}

export interface ExecuteCheckoutParams {
  db: AsyncSqliteLike
  clientOperationId: string
  cart: ExecuteCheckoutCart
  device: ExecuteCheckoutDevice
  now?: () => Date
}

export type ExecuteCheckoutResult =
  | {
      ok: true
      saleId: string
      receiptNumber: string
      total: number
      tendered: number
      change: number
      replayed: boolean
      createdAt: number
    }
  | {
      ok: false
      reason:
        | 'empty_cart'
        | 'invalid_payment'
        | 'invalid_tendered'
        | 'missing_device_identity'
        | 'insufficient_stock'
        | 'product_not_found'
      details?: Record<string, unknown>
    }

function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function executeCheckout(
  params: ExecuteCheckoutParams,
): Promise<ExecuteCheckoutResult> {
  const { db, clientOperationId, cart, device, now = () => new Date() } = params

  if (cart.items.length === 0) {
    return { ok: false, reason: 'empty_cart' }
  }

  if (!cart.isUtang && cart.paymentMethod === 'cash' && cart.tendered < cart.total) {
    return { ok: false, reason: 'invalid_tendered' }
  }

  if (!device.branchId || !device.branchCode || !device.cashierCode) {
    return { ok: false, reason: 'missing_device_identity' }
  }

  // Local idempotency: if a sale row already has this id, return it.
  const existing = await db.getFirstAsync<{
    id: string
    receipt_number: string
    total_amount: number
    created_at: number
  }>(`SELECT id, receipt_number, total_amount, created_at FROM sales WHERE id = ?`, [
    clientOperationId,
  ])

  if (existing) {
    return {
      ok: true,
      saleId: existing.id,
      receiptNumber: existing.receipt_number,
      total: existing.total_amount,
      tendered: cart.tendered,
      change: Math.max(0, cart.tendered - existing.total_amount),
      replayed: true,
      createdAt: Number(existing.created_at),
    }
  }

  // Pre-flight stock check so we fail before mutating any row.
  for (const item of cart.items) {
    const piecesNeeded = piecesForSaleUnit(item.qty, item.wasSoldAs, item.piecesPerPack)
    const product = await db.getFirstAsync<{ stock_pieces: number }>(
      `SELECT stock_pieces FROM products WHERE id = ?`,
      [item.productId],
    )

    if (!product) {
      return { ok: false, reason: 'product_not_found', details: { productId: item.productId } }
    }

    if (product.stock_pieces < piecesNeeded) {
      return {
        ok: false,
        reason: 'insufficient_stock',
        details: {
          productId: item.productId,
          available: product.stock_pieces,
          requested: piecesNeeded,
        },
      }
    }
  }

  const saleDate = now()
  const dateLocal = formatReceiptDate(saleDate)
  const createdAtSeconds = Math.floor(saleDate.getTime() / 1000)
  const deviceTimezone = getDeviceTimezone()
  const syncedServerTimeAtLastHandshake: string | null = null
  const total = cart.items.reduce((sum, item) => sum + item.lineTotal, 0)
  const change = cart.isUtang ? 0 : Math.max(0, cart.tendered - total)
  const persistedPaymentMethod: PaymentMethod = cart.isUtang ? 'cash' : cart.paymentMethod
  let receiptNumber = ''

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO receipt_sequence (branch_code, cashier_code, date, last_sequence)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (branch_code, cashier_code, date) DO UPDATE
       SET last_sequence = receipt_sequence.last_sequence + 1`,
      [device.branchCode, device.cashierCode, dateLocal],
    )

    const seqRow = await db.getFirstAsync<{ last_sequence: number }>(
      `SELECT last_sequence FROM receipt_sequence
       WHERE branch_code = ? AND cashier_code = ? AND date = ?`,
      [device.branchCode, device.cashierCode, dateLocal],
    )

    if (!seqRow) {
      throw new Error('receipt sequence missing after upsert')
    }

    receiptNumber = generateReceiptNumber(
      device.branchCode,
      device.cashierCode,
      dateLocal,
      seqRow.last_sequence,
    )

    await db.runAsync(
      `INSERT INTO sales (
         id, branch_id, user_id, customer_id, total_amount, payment_method, status,
         is_utang, utang_balance, receipt_number, created_at, device_timezone,
         synced_server_time_at_last_handshake
       ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
      [
        clientOperationId,
        device.branchId,
        device.userId ?? null,
        device.customerId ?? null,
        total,
        persistedPaymentMethod,
        cart.isUtang ? 1 : 0,
        cart.isUtang ? total : null,
        receiptNumber,
        createdAtSeconds,
        deviceTimezone,
        syncedServerTimeAtLastHandshake,
      ],
    )

    const itemPayloads: Array<{
      sale_item_id: string
      product_id: string
      pieces_sold: number
      was_sold_as: SoldAs
      unit_price: number
      subtotal: number
    }> = []
    const deltaQueuePayloads: Array<{
      clientOperationId: string
      productId: string
      payload: {
        client_operation_id: string
        product_id: string
        branch_id: string
        delta: number
        reason: 'sale'
        sale_id: string
      }
    }> = []

    for (const item of cart.items) {
      const pieces = piecesForSaleUnit(item.qty, item.wasSoldAs, item.piecesPerPack)
      const saleItemId = createClientOperationId()
      const inventoryLogId = createClientOperationId()
      const inventoryDeltaOpId = createClientOperationId()

      await db.runAsync(
        `INSERT INTO sale_items (
           id, sale_id, product_id, pieces_sold, was_sold_as, unit_price, discount, subtotal
         ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          saleItemId,
          clientOperationId,
          item.productId,
          pieces,
          item.wasSoldAs,
          item.unitPrice,
          item.lineTotal,
        ],
      )

      await db.runAsync(
        `UPDATE products
         SET stock_pieces = stock_pieces - ?, updated_at = unixepoch()
         WHERE id = ?`,
        [pieces, item.productId],
      )

      await db.runAsync(
        `INSERT INTO inventory_logs (
           id, product_id, branch_id, type, pieces_delta, reason, user_id, created_at
         ) VALUES (?, ?, ?, 'sale', ?, ?, ?, ?)`,
        [
          inventoryLogId,
          item.productId,
          device.branchId,
          -pieces,
          'sale',
          device.userId ?? null,
          createdAtSeconds,
        ],
      )

      const deltaPayload = {
        client_operation_id: inventoryDeltaOpId,
        product_id: item.productId,
        branch_id: device.branchId,
        delta: -pieces,
        reason: 'sale' as const,
        sale_id: clientOperationId,
      }

      deltaQueuePayloads.push({
        clientOperationId: inventoryDeltaOpId,
        productId: item.productId,
        payload: deltaPayload,
      })

      itemPayloads.push({
        sale_item_id: saleItemId,
        product_id: item.productId,
        pieces_sold: pieces,
        was_sold_as: item.wasSoldAs,
        unit_price: item.unitPrice,
        subtotal: item.lineTotal,
      })
    }

    const salePayload = {
      client_operation_id: clientOperationId,
      sale_id: clientOperationId,
      branch_id: device.branchId,
      business_id: device.businessId ?? null,
      user_id: device.userId ?? null,
      customer_id: device.customerId ?? null,
      total_amount: total,
      payment_method: persistedPaymentMethod,
      is_utang: cart.isUtang,
      utang_balance: cart.isUtang ? total : null,
      receipt_number: receiptNumber,
      device_local_time: createdAtSeconds,
      device_timezone: deviceTimezone,
      synced_server_time_at_last_handshake: syncedServerTimeAtLastHandshake,
      items: itemPayloads,
    }

    await db.runAsync(
      `INSERT INTO sync_queue (
         client_operation_id, table_name, record_id, operation, payload, created_at
       ) VALUES (?, 'sales', ?, 'INSERT', ?, ?)`,
      [clientOperationId, clientOperationId, JSON.stringify(salePayload), createdAtSeconds],
    )

    for (const delta of deltaQueuePayloads) {
      await db.runAsync(
        `INSERT INTO sync_queue (
           client_operation_id, table_name, record_id, operation, payload, created_at
         ) VALUES (?, 'products', ?, 'DELTA', ?, ?)`,
        [delta.clientOperationId, delta.productId, JSON.stringify(delta.payload), createdAtSeconds],
      )
    }
  })

  return {
    ok: true,
    saleId: clientOperationId,
    receiptNumber,
    total,
    tendered: cart.tendered,
    change,
    replayed: false,
    createdAt: createdAtSeconds,
  }
}

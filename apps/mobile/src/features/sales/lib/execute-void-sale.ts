import {
  createClientOperationId,
  formatReceiptDate,
  generateReceiptNumber,
  type VoidReason,
} from '@tdpos/shared'

import type { AsyncSqliteLike } from '@/db/async-sqlite'

export interface ExecuteVoidSaleParams {
  db: AsyncSqliteLike
  clientOperationId: string
  originalSaleId: string
  branchId: string
  branchCode: string
  cashierCode: string
  userId?: string | null
  reason: VoidReason
  reasonNote?: string | null
  now?: () => Date
}

export type ExecuteVoidSaleResult =
  | {
      ok: true
      saleId: string
      receiptNumber: string
      originalSaleId: string
      originalReceiptNumber: string
      total: number
      createdAt: number
      replayed: boolean
    }
  | {
      ok: false
      reason:
        | 'missing_device_identity'
        | 'sale_not_found'
        | 'already_voided'
        | 'void_window_closed'
        | 'no_sale_items'
      details?: Record<string, unknown>
    }

interface SaleRow {
  id: string
  branch_id: string
  user_id: string | null
  customer_id: string | null
  total_amount: number
  payment_method: string
  status: string
  is_utang: number
  utang_balance: number | null
  receipt_number: string
  created_at: number
}

interface SaleItemRow {
  id: string
  product_id: string
  pieces_sold: number
  was_sold_as: 'piece' | 'pack'
  unit_price: number
  discount: number
  subtotal: number
}

function trimNote(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function isSameLocalReceiptDate(a: Date, b: Date): boolean {
  return formatReceiptDate(a) === formatReceiptDate(b)
}

export async function executeVoidSale(
  params: ExecuteVoidSaleParams,
): Promise<ExecuteVoidSaleResult> {
  const {
    db,
    clientOperationId,
    originalSaleId,
    branchId,
    branchCode,
    cashierCode,
    userId = null,
    reason,
    reasonNote = null,
    now = () => new Date(),
  } = params

  if (!branchId || !branchCode || !cashierCode) {
    return { ok: false, reason: 'missing_device_identity' }
  }

  const existingVoid = await db.getFirstAsync<{
    compensating_sale_id: string
    original_sale_id: string
  }>(
    `SELECT compensating_sale_id, original_sale_id
     FROM sale_voids
     WHERE original_sale_id = ? OR compensating_sale_id = ?`,
    [originalSaleId, clientOperationId],
  )

  if (existingVoid) {
    const original = await db.getFirstAsync<SaleRow>(`SELECT * FROM sales WHERE id = ?`, [
      existingVoid.original_sale_id,
    ])
    const compensating = await db.getFirstAsync<SaleRow>(`SELECT * FROM sales WHERE id = ?`, [
      existingVoid.compensating_sale_id,
    ])
    if (original && compensating) {
      return {
        ok: true,
        saleId: compensating.id,
        receiptNumber: compensating.receipt_number,
        originalSaleId: original.id,
        originalReceiptNumber: original.receipt_number,
        total: compensating.total_amount,
        createdAt: compensating.created_at,
        replayed: true,
      }
    }
  }

  const original = await db.getFirstAsync<SaleRow>(`SELECT * FROM sales WHERE id = ?`, [
    originalSaleId,
  ])
  if (!original) return { ok: false, reason: 'sale_not_found', details: { originalSaleId } }
  if (original.status === 'voided') {
    return { ok: false, reason: 'already_voided', details: { originalSaleId } }
  }

  const saleDate = now()
  if (!isSameLocalReceiptDate(new Date(original.created_at * 1000), saleDate)) {
    return {
      ok: false,
      reason: 'void_window_closed',
      details: { originalReceiptNumber: original.receipt_number },
    }
  }

  const items = await db.getAllAsync<SaleItemRow>(
    `SELECT id, product_id, pieces_sold, was_sold_as, unit_price, discount, subtotal
     FROM sale_items
     WHERE sale_id = ?`,
    [originalSaleId],
  )
  if (items.length === 0) return { ok: false, reason: 'no_sale_items' }

  const createdAtSeconds = Math.floor(saleDate.getTime() / 1000)
  const dateLocal = formatReceiptDate(saleDate)
  const note = trimNote(reasonNote)
  let receiptNumber = ''

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO receipt_sequence (branch_code, cashier_code, date, last_sequence)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (branch_code, cashier_code, date) DO UPDATE
       SET last_sequence = receipt_sequence.last_sequence + 1`,
      [branchCode, cashierCode, dateLocal],
    )

    const seqRow = await db.getFirstAsync<{ last_sequence: number }>(
      `SELECT last_sequence FROM receipt_sequence
       WHERE branch_code = ? AND cashier_code = ? AND date = ?`,
      [branchCode, cashierCode, dateLocal],
    )
    if (!seqRow) throw new Error('receipt sequence missing after void upsert')

    receiptNumber = generateReceiptNumber(branchCode, cashierCode, dateLocal, seqRow.last_sequence)

    await db.runAsync(
      `INSERT INTO sales (
         id, branch_id, user_id, customer_id, total_amount, payment_method, status,
         is_utang, utang_balance, receipt_number, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'voided', ?, ?, ?, ?)`,
      [
        clientOperationId,
        branchId,
        userId,
        original.customer_id,
        -Math.abs(original.total_amount),
        original.payment_method,
        original.is_utang,
        null,
        receiptNumber,
        createdAtSeconds,
      ],
    )

    await db.runAsync(
      `INSERT INTO sale_voids (
         id, original_sale_id, compensating_sale_id, reason, reason_note, voided_by, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        clientOperationId,
        originalSaleId,
        clientOperationId,
        reason,
        note,
        userId,
        createdAtSeconds,
      ],
    )

    for (const item of items) {
      const saleItemId = createClientOperationId()
      const inventoryLogId = createClientOperationId()
      const inventoryDeltaOpId = createClientOperationId()
      const restoredPieces = Math.abs(item.pieces_sold)
      const reasonText = note ? `void: ${reason}: ${note}` : `void: ${reason}`
      const deltaPayload = {
        client_operation_id: inventoryDeltaOpId,
        product_id: item.product_id,
        branch_id: branchId,
        delta: restoredPieces,
        reason: 'void' as const,
        reason_note: note ?? original.receipt_number,
        log_type: 'adjustment' as const,
        sale_id: clientOperationId,
      }

      await db.runAsync(
        `INSERT INTO sale_items (
           id, sale_id, product_id, pieces_sold, was_sold_as, unit_price, discount, subtotal
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleItemId,
          clientOperationId,
          item.product_id,
          -restoredPieces,
          item.was_sold_as,
          item.unit_price,
          item.discount,
          -Math.abs(item.subtotal),
        ],
      )

      await db.runAsync(
        `UPDATE products
         SET stock_pieces = stock_pieces + ?, updated_at = unixepoch()
         WHERE id = ?`,
        [restoredPieces, item.product_id],
      )

      await db.runAsync(
        `INSERT INTO inventory_logs (
           id, product_id, branch_id, type, pieces_delta, reason, user_id, created_at
         ) VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?)`,
        [
          inventoryLogId,
          item.product_id,
          branchId,
          restoredPieces,
          reasonText,
          userId,
          createdAtSeconds,
        ],
      )

      await db.runAsync(
        `INSERT INTO sync_queue (
           client_operation_id, table_name, record_id, operation, payload, created_at
         ) VALUES (?, 'products', ?, 'DELTA', ?, ?)`,
        [inventoryDeltaOpId, item.product_id, JSON.stringify(deltaPayload), createdAtSeconds],
      )
    }
  })

  return {
    ok: true,
    saleId: clientOperationId,
    receiptNumber,
    originalSaleId,
    originalReceiptNumber: original.receipt_number,
    total: -Math.abs(original.total_amount),
    createdAt: createdAtSeconds,
    replayed: false,
  }
}

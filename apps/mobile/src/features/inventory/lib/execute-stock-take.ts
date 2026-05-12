import { createClientOperationId, type StockAdjustmentReason } from '@tdpos/shared'

import type { AsyncSqliteLike } from '@/db/async-sqlite'

export interface ExecuteStockTakeParams {
  db: AsyncSqliteLike
  clientOperationId: string
  productId: string
  branchId: string
  countedStockPieces: number
  reason: StockAdjustmentReason
  reasonNote?: string | null
  userId?: string | null
  now?: () => number
}

export type ExecuteStockTakeResult =
  | {
      ok: true
      productId: string
      previousStockPieces: number
      countedStockPieces: number
      delta: number
      replayed: boolean
    }
  | {
      ok: false
      reason:
        | 'product_not_found'
        | 'invalid_count'
        | 'missing_device_identity'
        | 'no_adjustment_needed'
      details?: Record<string, unknown>
    }

interface ProductStockRow {
  stock_pieces: number
}

interface ExistingQueueRow {
  payload: string
}

function normalizeReasonNote(reasonNote: string | null | undefined): string | null {
  const trimmed = reasonNote?.trim()
  return trimmed ? trimmed : null
}

export async function executeStockTake(
  params: ExecuteStockTakeParams,
): Promise<ExecuteStockTakeResult> {
  const {
    db,
    clientOperationId,
    productId,
    branchId,
    countedStockPieces,
    reason,
    reasonNote = null,
    userId = null,
    now = () => Math.floor(Date.now() / 1000),
  } = params

  if (!branchId) return { ok: false, reason: 'missing_device_identity' }
  if (!Number.isInteger(countedStockPieces) || countedStockPieces < 0) {
    return { ok: false, reason: 'invalid_count' }
  }

  const existing = await db.getFirstAsync<ExistingQueueRow>(
    `SELECT payload
     FROM sync_queue
     WHERE client_operation_id = ? AND table_name = 'products' AND operation = 'DELTA'`,
    [clientOperationId],
  )

  if (existing) {
    const payload = JSON.parse(existing.payload) as {
      product_id: string
      delta: number
    }
    const product = await db.getFirstAsync<ProductStockRow>(
      `SELECT stock_pieces FROM products WHERE id = ?`,
      [payload.product_id],
    )

    return {
      ok: true,
      productId: payload.product_id,
      previousStockPieces: product ? product.stock_pieces - payload.delta : 0,
      countedStockPieces: product?.stock_pieces ?? 0,
      delta: payload.delta,
      replayed: true,
    }
  }

  const product = await db.getFirstAsync<ProductStockRow>(
    `SELECT stock_pieces FROM products WHERE id = ? AND is_active = 1`,
    [productId],
  )

  if (!product) return { ok: false, reason: 'product_not_found', details: { productId } }

  const delta = countedStockPieces - product.stock_pieces
  if (delta === 0) {
    return {
      ok: false,
      reason: 'no_adjustment_needed',
      details: { productId, countedStockPieces },
    }
  }

  const createdAt = now()
  const inventoryLogId = createClientOperationId()
  const note = normalizeReasonNote(reasonNote)
  const localReason = note ? `${reason}: ${note}` : reason
  const payload = {
    client_operation_id: clientOperationId,
    product_id: productId,
    branch_id: branchId,
    delta,
    reason,
    reason_note: note,
    log_type: 'adjustment' as const,
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE products
       SET stock_pieces = ?, updated_at = unixepoch()
       WHERE id = ?`,
      [countedStockPieces, productId],
    )

    await db.runAsync(
      `INSERT INTO inventory_logs (
         id, product_id, branch_id, type, pieces_delta, reason, user_id, created_at
       ) VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?)`,
      [inventoryLogId, productId, branchId, delta, localReason, userId, createdAt],
    )

    await db.runAsync(
      `INSERT INTO sync_queue (
         client_operation_id, table_name, record_id, operation, payload, created_at
       ) VALUES (?, 'products', ?, 'DELTA', ?, ?)`,
      [clientOperationId, productId, JSON.stringify(payload), createdAt],
    )
  })

  return {
    ok: true,
    productId,
    previousStockPieces: product.stock_pieces,
    countedStockPieces,
    delta,
    replayed: false,
  }
}

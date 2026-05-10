import { createClientOperationId } from '@tdpos/shared'

import type { AsyncSqliteLike } from '@/db/async-sqlite'

export type KioskOrderStatus = 'draft' | 'awaiting_staff' | 'confirmed' | 'cancelled'

export interface LocalKioskOrder {
  id: string
  business_id: string
  branch_id: string
  device_id: string | null
  status: KioskOrderStatus
  customer_label: string | null
  payload: string
  total_amount: number
  created_at: number
  confirmed_at: number | null
}

interface KioskIdentity {
  businessId: string | null
  branchId: string | null
  deviceId?: string | null
}

export type KioskMutationResult =
  | { ok: true; order: LocalKioskOrder }
  | {
      ok: false
      reason: 'missing_identity' | 'not_found' | 'invalid_status' | 'already_confirmed'
      message: string
    }

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function kioskSelectSql() {
  return `
    SELECT
      id, business_id, branch_id, device_id, status, customer_label,
      payload, total_amount, created_at, confirmed_at
    FROM kiosk_orders
  `
}

export async function listActiveKioskOrders(
  db: AsyncSqliteLike,
  branchId: string | null,
): Promise<LocalKioskOrder[]> {
  if (!branchId) return []

  return db.getAllAsync<LocalKioskOrder>(
    `
      ${kioskSelectSql()}
      WHERE branch_id = ? AND status IN ('draft', 'awaiting_staff')
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [branchId],
  )
}

export async function createKioskOrder(params: {
  db: AsyncSqliteLike
  identity: KioskIdentity
  customerLabel: string | null
  items: Array<{ productId: string; name: string; qty: number; unitPrice: number }>
}): Promise<KioskMutationResult> {
  const { db, identity } = params
  if (!identity.businessId || !identity.branchId) {
    return {
      ok: false,
      reason: 'missing_identity',
      message: 'Device identity is incomplete. Cannot create kiosk order.',
    }
  }

  const id = createClientOperationId()
  const createdAt = nowSeconds()
  const totalAmount = params.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0)
  const payload = JSON.stringify({ items: params.items })

  await db.runAsync(
    `INSERT INTO kiosk_orders (
       id, business_id, branch_id, device_id, status,
       customer_label, payload, total_amount, created_at
     ) VALUES (?, ?, ?, ?, 'awaiting_staff', ?, ?, ?, ?)`,
    [
      id,
      identity.businessId,
      identity.branchId,
      identity.deviceId ?? null,
      params.customerLabel?.trim() || null,
      payload,
      totalAmount,
      createdAt,
    ],
  )

  const order = await db.getFirstAsync<LocalKioskOrder>(`${kioskSelectSql()} WHERE id = ?`, [id])

  if (!order) {
    return {
      ok: false,
      reason: 'not_found',
      message: 'Kiosk order was not available after creation. Try again.',
    }
  }

  return { ok: true, order }
}

export async function confirmKioskOrder(params: {
  db: AsyncSqliteLike
  orderId: string
}): Promise<KioskMutationResult> {
  const { db } = params
  const existing = await db.getFirstAsync<LocalKioskOrder>(`${kioskSelectSql()} WHERE id = ?`, [
    params.orderId,
  ])

  if (!existing) {
    return { ok: false, reason: 'not_found', message: 'Kiosk order was not found.' }
  }

  if (existing.status === 'confirmed') {
    return { ok: false, reason: 'already_confirmed', message: 'This order is already confirmed.' }
  }

  if (existing.status !== 'awaiting_staff') {
    return {
      ok: false,
      reason: 'invalid_status',
      message: `Cannot confirm an order with status "${existing.status}".`,
    }
  }

  await db.runAsync(
    `UPDATE kiosk_orders
        SET status = 'confirmed',
            confirmed_at = ?
      WHERE id = ? AND status = 'awaiting_staff'`,
    [nowSeconds(), params.orderId],
  )

  const order = await db.getFirstAsync<LocalKioskOrder>(`${kioskSelectSql()} WHERE id = ?`, [
    params.orderId,
  ])

  return { ok: true, order: order ?? { ...existing, status: 'confirmed' } }
}

export async function cancelKioskOrder(params: {
  db: AsyncSqliteLike
  orderId: string
}): Promise<KioskMutationResult> {
  const { db } = params
  const existing = await db.getFirstAsync<LocalKioskOrder>(`${kioskSelectSql()} WHERE id = ?`, [
    params.orderId,
  ])

  if (!existing) {
    return { ok: false, reason: 'not_found', message: 'Kiosk order was not found.' }
  }

  if (existing.status === 'confirmed' || existing.status === 'cancelled') {
    return {
      ok: false,
      reason: 'invalid_status',
      message: `Cannot cancel an order with status "${existing.status}".`,
    }
  }

  await db.runAsync(
    `UPDATE kiosk_orders
        SET status = 'cancelled'
      WHERE id = ? AND status IN ('draft', 'awaiting_staff')`,
    [params.orderId],
  )

  const order = await db.getFirstAsync<LocalKioskOrder>(`${kioskSelectSql()} WHERE id = ?`, [
    params.orderId,
  ])

  return { ok: true, order: order ?? { ...existing, status: 'cancelled' } }
}

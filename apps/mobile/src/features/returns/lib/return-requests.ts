// Return request local persistence — Tier E Enterprise.
// Returns never mutate original sales (ADR-011). Each return creates a
// compensating row with its own operation ID. Manager approval required
// for resolution. Local table created by migration v5 (LOCAL_RETURN_REQUESTS_SQL).

import { createClientOperationId } from '@tdpos/shared'

import type { AsyncSqliteLike } from '@/db/async-sqlite'

export type ReturnStatus = 'pending' | 'approved' | 'declined' | 'completed'

export const RETURN_REASON_CODES = [
  'defective',
  'wrong_item',
  'customer_changed_mind',
  'expired',
  'warranty_claim',
  'other',
] as const

export type ReturnReasonCode = (typeof RETURN_REASON_CODES)[number]

export interface LocalReturnRequest {
  id: string
  business_id: string
  branch_id: string
  original_sale_id: string | null
  compensating_sale_id: string | null
  requested_by: string | null
  approved_by: string | null
  status: ReturnStatus
  reason_code: string
  reason_note: string | null
  payload: string
  created_at: number
  resolved_at: number | null
}

interface ReturnIdentity {
  businessId: string | null
  branchId: string | null
  userId: string | null
}

export type ReturnMutationResult =
  | { ok: true; request: LocalReturnRequest }
  | {
      ok: false
      reason: 'missing_identity' | 'not_found' | 'already_resolved' | 'sale_not_found'
      message: string
    }

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function returnSelectSql() {
  return `
    SELECT
      id, business_id, branch_id, original_sale_id, compensating_sale_id,
      requested_by, approved_by, status, reason_code, reason_note,
      payload, created_at, resolved_at
    FROM return_requests
  `
}

export async function listPendingReturns(
  db: AsyncSqliteLike,
  branchId: string | null,
): Promise<LocalReturnRequest[]> {
  if (!branchId) return []

  return db.getAllAsync<LocalReturnRequest>(
    `
      ${returnSelectSql()}
      WHERE branch_id = ? AND status IN ('pending', 'approved')
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [branchId],
  )
}

export async function lookupSaleByReceipt(
  db: AsyncSqliteLike,
  receiptNumber: string,
): Promise<{
  id: string
  receipt_number: string
  total_amount: number
  payment_method: string
  status: string
  created_at: number
} | null> {
  return db.getFirstAsync(
    `SELECT id, receipt_number, total_amount, payment_method, status, created_at
       FROM sales
      WHERE receipt_number = ?
      LIMIT 1`,
    [receiptNumber.trim()],
  )
}

export async function createReturnRequest(params: {
  db: AsyncSqliteLike
  identity: ReturnIdentity
  originalSaleId: string | null
  reasonCode: ReturnReasonCode
  reasonNote: string | null
  details?: Record<string, string | number | boolean | null>
}): Promise<ReturnMutationResult> {
  const { db, identity } = params
  if (!identity.businessId || !identity.branchId) {
    return {
      ok: false,
      reason: 'missing_identity',
      message: 'Device identity is incomplete. Cannot create return request.',
    }
  }

  // Verify the sale exists locally if provided (never mutate it — ADR-011)
  if (params.originalSaleId) {
    const sale = await db.getFirstAsync<{ id: string }>(`SELECT id FROM sales WHERE id = ?`, [
      params.originalSaleId,
    ])
    if (!sale) {
      return {
        ok: false,
        reason: 'sale_not_found',
        message: 'Original sale was not found in local records.',
      }
    }
  }

  const id = createClientOperationId()
  const createdAt = nowSeconds()
  await db.runAsync(
    `INSERT INTO return_requests (
       id, business_id, branch_id, original_sale_id,
       requested_by, status, reason_code, reason_note,
       payload, created_at
     ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    [
      id,
      identity.businessId,
      identity.branchId,
      params.originalSaleId,
      identity.userId,
      params.reasonCode,
      params.reasonNote?.trim() || null,
      JSON.stringify(params.details ?? {}),
      createdAt,
    ],
  )

  const request = await db.getFirstAsync<LocalReturnRequest>(`${returnSelectSql()} WHERE id = ?`, [
    id,
  ])

  if (!request) {
    return {
      ok: false,
      reason: 'not_found',
      message: 'Return request was not available after creation. Try again.',
    }
  }

  return { ok: true, request }
}

export async function resolveReturnRequest(params: {
  db: AsyncSqliteLike
  identity: Pick<ReturnIdentity, 'userId'>
  requestId: string
  status: Extract<ReturnStatus, 'approved' | 'declined'>
}): Promise<ReturnMutationResult> {
  const { db } = params
  const existing = await db.getFirstAsync<LocalReturnRequest>(`${returnSelectSql()} WHERE id = ?`, [
    params.requestId,
  ])

  if (!existing) {
    return { ok: false, reason: 'not_found', message: 'Return request was not found.' }
  }

  if (existing.status !== 'pending') {
    return {
      ok: false,
      reason: 'already_resolved',
      message: 'Return request has already been resolved.',
    }
  }

  await db.runAsync(
    `UPDATE return_requests
        SET status = ?,
            approved_by = ?,
            resolved_at = ?
      WHERE id = ? AND status = 'pending'`,
    [params.status, params.identity.userId, nowSeconds(), params.requestId],
  )

  const request = await db.getFirstAsync<LocalReturnRequest>(`${returnSelectSql()} WHERE id = ?`, [
    params.requestId,
  ])

  return { ok: true, request: request ?? { ...existing, status: params.status } }
}

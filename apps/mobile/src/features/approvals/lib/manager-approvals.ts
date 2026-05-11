// Manager approval request local persistence — Tier C Plus.
// Supports discount overrides, void requests, and refund approvals.
// Table created by migration v3 (LOCAL_MANAGER_APPROVAL_REQUESTS_SQL).

import { createClientOperationId } from '@tdpos/shared'

import type { AsyncSqliteLike } from '@/db/async-sqlite'

export type ApprovalRequestType =
  | 'void'
  | 'price_override'
  | 'shift_correction'
  | 'cash_variance'
  | 'other'

export type ApprovalStatus = 'pending' | 'approved' | 'declined' | 'voided'

export interface LocalManagerApprovalRequest {
  id: string
  business_id: string
  branch_id: string
  requested_by_user_id: string | null
  approved_by_user_id: string | null
  request_type: ApprovalRequestType
  status: ApprovalStatus
  reason: string | null
  details: string
  created_at: number
  resolved_at: number | null
}

interface ApprovalIdentity {
  businessId: string | null
  branchId: string | null
  userId: string | null
}

export type ApprovalMutationResult =
  | { ok: true; request: LocalManagerApprovalRequest }
  | { ok: false; reason: 'missing_identity' | 'not_found' | 'already_resolved'; message: string }

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function approvalSelectSql() {
  return `
    SELECT
      id, business_id, branch_id, requested_by_user_id, approved_by_user_id,
      request_type, status, reason, details, created_at, resolved_at
    FROM manager_approval_requests
  `
}

export async function listPendingApprovals(
  db: AsyncSqliteLike,
  branchId: string | null,
): Promise<LocalManagerApprovalRequest[]> {
  if (!branchId) return []

  return db.getAllAsync<LocalManagerApprovalRequest>(
    `
      ${approvalSelectSql()}
      WHERE branch_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [branchId],
  )
}

export async function createApprovalRequest(params: {
  db: AsyncSqliteLike
  identity: ApprovalIdentity
  requestType: ApprovalRequestType
  reason: string
  details?: Record<string, string | number | boolean | null>
}): Promise<ApprovalMutationResult> {
  const { db, identity } = params
  if (!identity.businessId || !identity.branchId) {
    return {
      ok: false,
      reason: 'missing_identity',
      message: 'Device identity is incomplete. Sign out and re-pair this register.',
    }
  }

  const id = createClientOperationId()
  const createdAt = nowSeconds()
  await db.runAsync(
    `INSERT INTO manager_approval_requests (
       id, business_id, branch_id, requested_by_user_id, request_type,
       status, reason, details, created_at
     ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [
      id,
      identity.businessId,
      identity.branchId,
      identity.userId,
      params.requestType,
      params.reason.trim(),
      JSON.stringify(params.details ?? {}),
      createdAt,
    ],
  )

  const request = await db.getFirstAsync<LocalManagerApprovalRequest>(
    `
      ${approvalSelectSql()}
      WHERE id = ?
    `,
    [id],
  )

  if (!request) {
    return {
      ok: false,
      reason: 'not_found',
      message: 'Approval request was not available after creation. Try again.',
    }
  }

  return { ok: true, request }
}

export async function resolveApprovalRequest(params: {
  db: AsyncSqliteLike
  identity: Pick<ApprovalIdentity, 'userId'>
  requestId: string
  status: Extract<ApprovalStatus, 'approved' | 'declined'>
}): Promise<ApprovalMutationResult> {
  const { db } = params
  const existing = await db.getFirstAsync<LocalManagerApprovalRequest>(
    `
      ${approvalSelectSql()}
      WHERE id = ?
    `,
    [params.requestId],
  )

  if (!existing) {
    return { ok: false, reason: 'not_found', message: 'Approval request was not found.' }
  }

  if (existing.status !== 'pending') {
    return {
      ok: false,
      reason: 'already_resolved',
      message: 'Approval request has already been resolved.',
    }
  }

  await db.runAsync(
    `UPDATE manager_approval_requests
        SET status = ?,
            approved_by_user_id = ?,
            resolved_at = ?
      WHERE id = ? AND status = 'pending'`,
    [params.status, params.identity.userId, nowSeconds(), params.requestId],
  )

  const request = await db.getFirstAsync<LocalManagerApprovalRequest>(
    `
      ${approvalSelectSql()}
      WHERE id = ?
    `,
    [params.requestId],
  )

  return { ok: true, request: request ?? { ...existing, status: params.status } }
}

// Shift session local persistence — Tier B+ foundation.
// Local SQLite CRUD for shift open, close, count, and summary queries.
// Table created by migration v2 (LOCAL_SHIFT_SESSIONS_SQL).

import { createClientOperationId } from '@tdpos/shared'

import type { AsyncSqliteLike } from '@/db/async-sqlite'

export interface LocalShiftSession {
  id: string
  business_id: string
  branch_id: string
  user_id: string | null
  cashier_code: string
  device_install_id: string | null
  status: 'open' | 'closed' | 'voided'
  opened_at: number
  closed_at: number | null
  opening_cash: number
  expected_cash: number | null
  counted_cash: number | null
  variance: number | null
  handoff_note: string | null
  created_at: number
}

export interface ShiftSummary {
  saleCount: number
  grossSales: number
  cashSales: number
  expectedCash: number
}

interface ShiftIdentity {
  businessId: string | null
  branchId: string | null
  userId: string | null
  cashierCode: string | null
  installId?: string | null
}

export type ShiftMutationResult =
  | { ok: true; shift: LocalShiftSession; summary?: ShiftSummary }
  | {
      ok: false
      reason: 'missing_identity' | 'shift_already_open' | 'no_open_shift' | 'invalid_counted_cash'
      message: string
    }

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

export async function getOpenShift(
  db: AsyncSqliteLike,
  identity: Pick<ShiftIdentity, 'branchId' | 'cashierCode'>,
): Promise<LocalShiftSession | null> {
  if (!identity.branchId || !identity.cashierCode) return null

  return db.getFirstAsync<LocalShiftSession>(
    `SELECT id, business_id, branch_id, user_id, cashier_code, device_install_id, status,
            opened_at, closed_at, opening_cash, expected_cash, counted_cash, variance,
            handoff_note, created_at
       FROM shift_sessions
      WHERE branch_id = ? AND cashier_code = ? AND status = 'open'
      ORDER BY opened_at DESC
      LIMIT 1`,
    [identity.branchId, identity.cashierCode],
  )
}

export async function getShiftSummary(
  db: AsyncSqliteLike,
  shift: Pick<LocalShiftSession, 'opened_at' | 'user_id' | 'opening_cash'>,
): Promise<ShiftSummary> {
  const row = await db.getFirstAsync<{
    sale_count: number | null
    gross_sales: number | null
    cash_sales: number | null
  }>(
    `SELECT COUNT(*) AS sale_count,
            COALESCE(SUM(total_amount), 0) AS gross_sales,
            COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) AS cash_sales
       FROM sales
      WHERE created_at >= ?
        AND (? IS NULL OR user_id = ?)`,
    [shift.opened_at, shift.user_id, shift.user_id],
  )
  const cashSales = Number(row?.cash_sales ?? 0)

  return {
    saleCount: Number(row?.sale_count ?? 0),
    grossSales: Number(row?.gross_sales ?? 0),
    cashSales,
    expectedCash: Number(shift.opening_cash) + cashSales,
  }
}

export async function startShift(params: {
  db: AsyncSqliteLike
  identity: ShiftIdentity
  openingCash: number
}): Promise<ShiftMutationResult> {
  const { db, identity } = params
  if (!identity.businessId || !identity.branchId || !identity.cashierCode) {
    return {
      ok: false,
      reason: 'missing_identity',
      message: 'Device identity is incomplete. Sign out and re-pair this register.',
    }
  }

  const existing = await getOpenShift(db, identity)
  if (existing) {
    return {
      ok: false,
      reason: 'shift_already_open',
      message: 'A shift is already open on this cashier lane.',
    }
  }

  const shiftId = createClientOperationId()
  const openedAt = nowSeconds()
  const openingCash = Math.max(0, params.openingCash)

  await db.runAsync(
    `INSERT INTO shift_sessions (
       id, business_id, branch_id, user_id, cashier_code, device_install_id,
       status, opened_at, opening_cash, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`,
    [
      shiftId,
      identity.businessId,
      identity.branchId,
      identity.userId,
      identity.cashierCode,
      identity.installId ?? null,
      openedAt,
      openingCash,
      openedAt,
    ],
  )

  const shift = await getOpenShift(db, identity)
  if (!shift) {
    return {
      ok: false,
      reason: 'no_open_shift',
      message: 'Shift was not available after opening. Try again.',
    }
  }

  return { ok: true, shift, summary: await getShiftSummary(db, shift) }
}

export async function closeShift(params: {
  db: AsyncSqliteLike
  identity: Pick<ShiftIdentity, 'branchId' | 'cashierCode'>
  countedCash: number
  handoffNote?: string
}): Promise<ShiftMutationResult> {
  const { db, identity } = params
  if (!Number.isFinite(params.countedCash) || params.countedCash < 0) {
    return {
      ok: false,
      reason: 'invalid_counted_cash',
      message: 'Counted cash must be zero or higher.',
    }
  }

  const shift = await getOpenShift(db, identity)
  if (!shift) {
    return {
      ok: false,
      reason: 'no_open_shift',
      message: 'No open shift found for this cashier lane.',
    }
  }

  const summary = await getShiftSummary(db, shift)
  const countedCash = Math.max(0, params.countedCash)
  const closedAt = nowSeconds()
  const variance = countedCash - summary.expectedCash

  await db.runAsync(
    `UPDATE shift_sessions
        SET status = 'closed',
            closed_at = ?,
            expected_cash = ?,
            counted_cash = ?,
            variance = ?,
            handoff_note = ?
      WHERE id = ? AND status = 'open'`,
    [closedAt, summary.expectedCash, countedCash, variance, params.handoffNote ?? null, shift.id],
  )

  const closedShift = await db.getFirstAsync<LocalShiftSession>(
    `SELECT id, business_id, branch_id, user_id, cashier_code, device_install_id, status,
            opened_at, closed_at, opening_cash, expected_cash, counted_cash, variance,
            handoff_note, created_at
       FROM shift_sessions
      WHERE id = ?`,
    [shift.id],
  )

  return { ok: true, shift: closedShift ?? shift, summary }
}

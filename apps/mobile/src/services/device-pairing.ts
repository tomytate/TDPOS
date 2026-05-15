import { SURFACE_LABELS, normalizeDevicePairingCode, type TierSurface } from '@tdpos/shared'

export interface SupabaseDevicePairingClient {
  rpc(
    name: 'consume_device_pairing_code',
    params: { p_pairing_code: string; p_install_id: string },
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

type DevicePairingFailureReason =
  | 'invalid_code'
  | 'not_found'
  | 'surface_locked'
  | 'branch_unavailable'
  | 'limit_exceeded'
  | 'account_not_provisioned'
  | 'unauthenticated'
  | 'query_failed'

export type DevicePairingOutcome =
  | {
      ok: true
      pairingCodeId: string
      branchId: string
      branchName: string
      branchCode: string
      cashierCode: string
      deviceName: string | null
      surface: TierSurface
    }
  | {
      ok: false
      reason: DevicePairingFailureReason
      message: string
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function describePairingFailure(reason: string): string {
  if (reason === 'invalid_code')
    return 'Enter the device code exactly as shown in the web dashboard.'
  if (reason === 'not_found') return 'This device code was not found or has expired.'
  if (reason === 'surface_locked')
    return 'This device surface is not available on the current tier.'
  if (reason === 'branch_unavailable') return 'The selected branch is no longer active.'
  if (reason === 'limit_exceeded') return 'This tier has reached its device limit.'
  if (reason === 'account_not_provisioned') return 'This account is not connected to a business.'
  if (reason === 'unauthenticated') return 'Sign in again before pairing this device.'
  return 'Could not pair this device.'
}

function isDevicePairingFailureReason(value: string): value is DevicePairingFailureReason {
  return [
    'invalid_code',
    'not_found',
    'surface_locked',
    'branch_unavailable',
    'limit_exceeded',
    'account_not_provisioned',
    'unauthenticated',
    'query_failed',
  ].includes(value)
}

function parsePairingResponse(value: unknown): DevicePairingOutcome {
  if (!isRecord(value)) {
    return { ok: false, reason: 'query_failed', message: 'Unexpected pairing response.' }
  }

  if (value.ok !== true) {
    const reason = typeof value.reason === 'string' ? value.reason : 'query_failed'
    return {
      ok: false,
      reason: isDevicePairingFailureReason(reason) ? reason : 'query_failed',
      message: describePairingFailure(reason),
    }
  }

  if (
    typeof value.pairing_code_id !== 'string' ||
    typeof value.branch_id !== 'string' ||
    typeof value.branch_name !== 'string' ||
    typeof value.branch_code !== 'string' ||
    typeof value.cashier_code !== 'string' ||
    typeof value.surface !== 'string' ||
    !(value.surface in SURFACE_LABELS)
  ) {
    return { ok: false, reason: 'query_failed', message: 'Incomplete pairing response.' }
  }

  return {
    ok: true,
    pairingCodeId: value.pairing_code_id,
    branchId: value.branch_id,
    branchName: value.branch_name,
    branchCode: value.branch_code,
    cashierCode: value.cashier_code,
    deviceName: typeof value.device_name === 'string' ? value.device_name : null,
    surface: value.surface as TierSurface,
  }
}

export async function consumeDevicePairingCode(params: {
  supabase: SupabaseDevicePairingClient
  pairingCode: string
  installId: string
}): Promise<DevicePairingOutcome> {
  const normalizedCode = normalizeDevicePairingCode(params.pairingCode)
  if (normalizedCode.length < 8 || normalizedCode.length > 16) {
    return {
      ok: false,
      reason: 'invalid_code',
      message: describePairingFailure('invalid_code'),
    }
  }

  const { data, error } = await params.supabase.rpc('consume_device_pairing_code', {
    p_pairing_code: normalizedCode,
    p_install_id: params.installId,
  })

  if (error) {
    return { ok: false, reason: 'query_failed', message: error.message }
  }

  return parsePairingResponse(data)
}

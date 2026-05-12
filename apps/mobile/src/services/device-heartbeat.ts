import type { AsyncSqliteLike } from '@/db/async-sqlite'
import { getSyncHealth, type SyncHealth } from '@/features/diagnostics/lib/sync-health'
import { getOrCreateInstallId } from '@/services/device-identity'
import { storage } from '@/services/storage'
import { useAuthStore } from '@/stores/auth-store'
import type { ModuleName, SubscriptionTier, TierSurface } from '@tdpos/shared'

interface DeviceHeartbeatError {
  message: string
}

interface UpsertResult {
  error: DeviceHeartbeatError | null
}

export interface SupabaseDeviceHeartbeatClient {
  from(table: string): {
    upsert(
      values: Record<string, unknown>,
      options: { onConflict: string },
    ): PromiseLike<UpsertResult>
  }
}

export type DeviceHeartbeatOutcome =
  | {
      ok: true
      installId: string
      surface: TierSurface
    }
  | {
      ok: false
      reason: 'signed_out' | 'device_not_ready' | 'query_failed'
      message?: string
    }

function buildDeviceName(params: {
  branchName: string | null
  cashierCode: string | null
}): string | null {
  if (!params.branchName && !params.cashierCode) return null
  if (!params.branchName) return params.cashierCode
  if (!params.cashierCode) return params.branchName
  return `${params.branchName} · ${params.cashierCode}`
}

function entitlementSnapshot(params: {
  subscriptionTier: SubscriptionTier
  modules: Record<ModuleName, boolean>
  entitlementsValidUntil: string | null
  lastServerHandshakeAt: string | null
  cashierCode: string | null
}) {
  return {
    subscription_tier: params.subscriptionTier,
    module_state: params.modules,
    entitlements_valid_until: params.entitlementsValidUntil,
    last_server_handshake_at: params.lastServerHandshakeAt,
    cashier_code: params.cashierCode,
  }
}

function buildSyncSnapshot(health: SyncHealth | null) {
  if (!health) {
    return {
      available: false,
      reason: 'local_sqlite_unavailable',
    }
  }

  return {
    available: true,
    total_rows: health.totalRows,
    synced_rows: health.syncedRows,
    unsynced_rows: health.unsyncedRows,
    pending_rows: health.pendingRows,
    failed_rows: health.failedRows,
    reviewable_rows: health.reviewableRows,
    max_retry_count: health.maxRetryCount,
    last_successful_sync_at: health.lastSuccessfulSyncAt,
    oldest_pending_created_at: health.oldestPendingCreatedAt,
    latest_error_at: health.latestErrorAt,
  }
}

export async function upsertDeviceHeartbeat(params: {
  supabase: SupabaseDeviceHeartbeatClient
  db?: AsyncSqliteLike
  surface?: TierSurface
}): Promise<DeviceHeartbeatOutcome> {
  const state = useAuthStore.getState()
  if (!state.userId || !state.businessId) return { ok: false, reason: 'signed_out' }
  if (!state.branchId) return { ok: false, reason: 'device_not_ready' }

  const surface = params.surface ?? 'mobile.tier_a_cashier'
  const installId = getOrCreateInstallId(storage)
  const health = params.db ? await getSyncHealth(params.db) : null
  const { error } = await params.supabase.from('business_devices').upsert(
    {
      business_id: state.businessId,
      branch_id: state.branchId,
      install_id: installId,
      device_name: buildDeviceName({
        branchName: state.branchName,
        cashierCode: state.cashierCode,
      }),
      surface,
      status: 'active',
      last_seen_at: new Date().toISOString(),
      entitlement_snapshot: entitlementSnapshot({
        subscriptionTier: state.subscriptionTier,
        modules: state.modules,
        entitlementsValidUntil: state.entitlementsValidUntil,
        lastServerHandshakeAt: state.lastServerHandshakeAt,
        cashierCode: state.cashierCode,
      }),
      sync_snapshot: buildSyncSnapshot(health),
    },
    { onConflict: 'business_id,install_id' },
  )

  if (error) return { ok: false, reason: 'query_failed', message: error.message }

  return { ok: true, installId, surface }
}

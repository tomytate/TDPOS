// Phase W0.7 — Sync health view.
//
// Reads the RLS-scoped `applied_operations` dedup table and produces an
// owner-facing snapshot of the sync engine's state at the current moment:
//
//   - lastAppliedAt    : most recent `applied_at` for the tenant
//   - stuckCount       : in_progress rows older than 60s (the stale-reservation
//                        threshold the v0.6 cron job is supposed to clean up)
//   - failedCount      : failed rows in the last 24h
//   - completedCount24h: completed rows in the last 24h (throughput)
//   - inProgressCount  : current in_progress rows (any age)
//   - recentFailures   : last 10 failed rows with their `reason` only
//
// `reason` strings come from the race-safe `apply_inventory_delta` RPC and
// the `create_sale_atomic` flow — they are operation-classification labels
// like 'insufficient_stock_or_not_found', not PII. Surfacing them is safe.

import 'server-only'

import { getDeviceHeartbeatFreshness, type DeviceHeartbeatFreshness } from '@tdpos/shared'

import { getServerSupabase } from '@/lib/supabase/server'

export interface SyncHealthFailure {
  clientOperationId: string
  appliedAt: string
  completedAt: string | null
  reason: string
}

export interface SyncDeviceSnapshot {
  id: string
  installTail: string
  deviceName: string | null
  surface: string
  status: string
  freshness: DeviceHeartbeatFreshness
  branchName: string | null
  lastSeenAt: string | null
  unsyncedRows: number | null
  pendingRows: number | null
  failedRows: number | null
  reviewableRows: number | null
  oldestPendingCreatedAt: number | null
}

export interface SyncHealthSnapshot {
  lastAppliedAt: string | null
  stuckCount: number
  failedCount: number
  completedCount24h: number
  inProgressCount: number
  activeDeviceCount: number
  staleDeviceCount: number
  offlineDeviceCount: number
  devices: SyncDeviceSnapshot[]
  recentFailures: SyncHealthFailure[]
}

export type SyncHealthResult =
  | { ready: false; reason: 'supabase_unconfigured' | 'query_failed'; message?: string }
  | { ready: true; snapshot: SyncHealthSnapshot; generatedAt: string }

interface FailureRow {
  client_operation_id: string
  applied_at: string
  completed_at: string | null
  result: { reason?: unknown } | null
}

interface DeviceRow {
  id: string
  install_id: string
  device_name: string | null
  surface: string
  status: string
  last_seen_at: string | null
  sync_snapshot: {
    available?: unknown
    unsynced_rows?: unknown
    pending_rows?: unknown
    failed_rows?: unknown
    reviewable_rows?: unknown
    oldest_pending_created_at?: unknown
  } | null
  branches: Array<{ name: string }> | null
}

const STUCK_THRESHOLD_MS = 60_000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function reasonFromResult(result: { reason?: unknown } | null): string {
  if (!result) return 'unknown'
  const reason = result.reason
  return typeof reason === 'string' && reason.length > 0 ? reason : 'unknown'
}

function tailInstallId(value: string): string {
  return value.length > 8 ? `...${value.slice(-8)}` : value
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export async function getSyncHealthSnapshot(): Promise<SyncHealthResult> {
  let supabase
  try {
    supabase = await getServerSupabase()
  } catch {
    return { ready: false, reason: 'supabase_unconfigured' }
  }

  const now = new Date()
  const stuckBefore = new Date(now.getTime() - STUCK_THRESHOLD_MS).toISOString()
  const dayAgo = new Date(now.getTime() - ONE_DAY_MS).toISOString()

  const [latest, stuck, failed24h, completed24h, inProgress, recentFailures, devices] =
    await Promise.all([
      supabase
        .from('applied_operations')
        .select('applied_at')
        .order('applied_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('applied_operations')
        .select('client_operation_id', { count: 'exact', head: true })
        .eq('status', 'in_progress')
        .lt('applied_at', stuckBefore),
      supabase
        .from('applied_operations')
        .select('client_operation_id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('applied_at', dayAgo),
      supabase
        .from('applied_operations')
        .select('client_operation_id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('applied_at', dayAgo),
      supabase
        .from('applied_operations')
        .select('client_operation_id', { count: 'exact', head: true })
        .eq('status', 'in_progress'),
      supabase
        .from('applied_operations')
        .select('client_operation_id, applied_at, completed_at, result')
        .eq('status', 'failed')
        .order('applied_at', { ascending: false })
        .limit(10),
      supabase
        .from('business_devices')
        .select(
          'id, install_id, device_name, surface, status, last_seen_at, sync_snapshot, branches ( name )',
        )
        .order('last_seen_at', { ascending: false, nullsFirst: false })
        .limit(20),
    ])

  const firstError =
    latest.error ??
    stuck.error ??
    failed24h.error ??
    completed24h.error ??
    inProgress.error ??
    recentFailures.error ??
    devices.error

  if (firstError) {
    return { ready: false, reason: 'query_failed', message: firstError.message }
  }

  const failureRows = (recentFailures.data ?? []) as FailureRow[]
  const deviceRows = (devices.data ?? []) as DeviceRow[]

  const snapshot: SyncHealthSnapshot = {
    lastAppliedAt: (latest.data as { applied_at?: string } | null)?.applied_at ?? null,
    stuckCount: stuck.count ?? 0,
    failedCount: failed24h.count ?? 0,
    completedCount24h: completed24h.count ?? 0,
    inProgressCount: inProgress.count ?? 0,
    activeDeviceCount: deviceRows.filter((device) => device.status === 'active').length,
    staleDeviceCount: deviceRows.filter(
      (device) =>
        getDeviceHeartbeatFreshness({ status: device.status, lastSeenAt: device.last_seen_at }) ===
        'stale',
    ).length,
    offlineDeviceCount: deviceRows.filter(
      (device) =>
        getDeviceHeartbeatFreshness({ status: device.status, lastSeenAt: device.last_seen_at }) ===
        'offline',
    ).length,
    devices: deviceRows.map((device) => ({
      id: device.id,
      installTail: tailInstallId(device.install_id),
      deviceName: device.device_name,
      surface: device.surface,
      status: device.status,
      freshness: getDeviceHeartbeatFreshness({
        status: device.status,
        lastSeenAt: device.last_seen_at,
      }),
      branchName: device.branches?.[0]?.name ?? null,
      lastSeenAt: device.last_seen_at,
      unsyncedRows: numberOrNull(device.sync_snapshot?.unsynced_rows),
      pendingRows: numberOrNull(device.sync_snapshot?.pending_rows),
      failedRows: numberOrNull(device.sync_snapshot?.failed_rows),
      reviewableRows: numberOrNull(device.sync_snapshot?.reviewable_rows),
      oldestPendingCreatedAt: numberOrNull(device.sync_snapshot?.oldest_pending_created_at),
    })),
    recentFailures: failureRows.map((row) => ({
      clientOperationId: row.client_operation_id,
      appliedAt: row.applied_at,
      completedAt: row.completed_at,
      reason: reasonFromResult(row.result),
    })),
  }

  return { ready: true, snapshot, generatedAt: now.toISOString() }
}

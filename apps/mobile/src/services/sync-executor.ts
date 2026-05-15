import type { AsyncSqliteLike } from '@/db/async-sqlite'

import {
  refreshEntitlementsFromSupabase,
  type SupabaseEntitlementsClient,
} from './entitlements-refresh'
import { refreshCatalogFromSupabase, type SupabaseCatalogClient } from './catalog-refresh'
import { warnSafe } from './safe-logger'
import { upsertDeviceHeartbeat, type SupabaseDeviceHeartbeatClient } from './device-heartbeat'
import { startPerformanceTimer } from './performance-metrics'
import { storage } from './storage'
import { createSyncCallables, type SupabaseRpcLike } from './sync-callables'
import { createSyncRunner, type SyncRunnerOutcome } from './sync-runner'
import { supabase } from './supabase'
import { useAuthStore } from '@/stores/auth-store'

export type SyncExecutorOutcome =
  | SyncRunnerOutcome
  | { skipped: true; reason: 'supabase_unconfigured' }

export async function runSyncQueueOnce(db: AsyncSqliteLike): Promise<SyncExecutorOutcome> {
  if (!supabase) return { skipped: true, reason: 'supabase_unconfigured' }

  // Cast: the real `SupabaseClient` is runtime-compatible with our narrow
  // adapter shape, while supabase-js exposes thenable builders in its types.
  const stopSyncTimer = startPerformanceTimer('sync_cycle_ms', storage)
  const callables = createSyncCallables(supabase as unknown as SupabaseRpcLike)
  let outcome: SyncRunnerOutcome
  try {
    outcome = await createSyncRunner({ db, callables }).run()
  } finally {
    stopSyncTimer()
  }

  await refreshEntitlementsFromSupabase({
    supabase: supabase as unknown as SupabaseEntitlementsClient,
    db,
  }).catch((err) => {
    warnSafe('[SyncExecutor] entitlement refresh failed', err)
  })

  await refreshCatalogFromSupabase({
    supabase: supabase as unknown as SupabaseCatalogClient,
    db,
    businessId: useAuthStore.getState().businessId,
    modules: useAuthStore.getState().modules,
  }).catch((err) => {
    warnSafe('[SyncExecutor] catalog refresh failed', err)
  })

  await upsertDeviceHeartbeat({
    supabase: supabase as unknown as SupabaseDeviceHeartbeatClient,
    db,
  }).catch((err) => {
    warnSafe('[SyncExecutor] device heartbeat failed', err)
  })

  return outcome
}

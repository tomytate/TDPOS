import type { AsyncSqliteLike } from '@/db/async-sqlite'

import {
  refreshEntitlementsFromSupabase,
  type SupabaseEntitlementsClient,
} from './entitlements-refresh'
import { upsertDeviceHeartbeat, type SupabaseDeviceHeartbeatClient } from './device-heartbeat'
import { createSyncCallables, type SupabaseRpcLike } from './sync-callables'
import { createSyncRunner, type SyncRunnerOutcome } from './sync-runner'
import { supabase } from './supabase'

export type SyncExecutorOutcome =
  | SyncRunnerOutcome
  | { skipped: true; reason: 'supabase_unconfigured' }

export async function runSyncQueueOnce(db: AsyncSqliteLike): Promise<SyncExecutorOutcome> {
  if (!supabase) return { skipped: true, reason: 'supabase_unconfigured' }

  // Cast: the real `SupabaseClient` is runtime-compatible with our narrow
  // adapter shape, while supabase-js exposes thenable builders in its types.
  const callables = createSyncCallables(supabase as unknown as SupabaseRpcLike)
  const outcome = await createSyncRunner({ db, callables }).run()

  await refreshEntitlementsFromSupabase({
    supabase: supabase as unknown as SupabaseEntitlementsClient,
  }).catch((err) => {
    if (typeof console !== 'undefined') {
      console.warn('[SyncExecutor] entitlement refresh failed', err)
    }
  })

  await upsertDeviceHeartbeat({
    supabase: supabase as unknown as SupabaseDeviceHeartbeatClient,
    db,
  }).catch((err) => {
    if (typeof console !== 'undefined') {
      console.warn('[SyncExecutor] device heartbeat failed', err)
    }
  })

  return outcome
}

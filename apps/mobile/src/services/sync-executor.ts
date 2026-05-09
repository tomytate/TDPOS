import type { AsyncSqliteLike } from '@/db/async-sqlite'

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
  return createSyncRunner({ db, callables }).run()
}

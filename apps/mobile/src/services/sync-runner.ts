/**
 * Sync runner — a thin concurrency guard around `processSyncQueue`.
 *
 * Why this exists separately from the React `useForegroundSyncTrigger` hook:
 * the runner is pure (no React, no AppState, no SQLiteProvider), so it can be
 * unit-tested under bun:test. The hook in `sync-trigger.ts` only adds the
 * AppState wiring on top.
 *
 * Concurrency rule: only one `processSyncQueue` call may be in flight at a
 * time. Subsequent calls while one is running return `{ skipped: true }` and
 * do NOT touch the queue. This protects the device from running the processor
 * twice when the user rapidly toggles foreground/background, when a manual
 * trigger fires during an automatic one, or when the background task and the
 * foreground hook fire close together.
 */

import { processSyncQueue, type SyncCallables, type SyncProcessorResult } from './sync-processor'
import type { AsyncSqliteLike } from '@/db/async-sqlite'

let syncRunnerInFlight = false

export interface SyncRunnerDeps {
  db: AsyncSqliteLike
  callables: SyncCallables
  batchSize?: number
  maxRetries?: number
}

export type SyncRunnerOutcome = { skipped: true } | { skipped: false; result: SyncProcessorResult }

export interface SyncRunner {
  run(): Promise<SyncRunnerOutcome>
  isInFlight(): boolean
}

export function createSyncRunner(deps: SyncRunnerDeps): SyncRunner {
  return {
    async run(): Promise<SyncRunnerOutcome> {
      if (syncRunnerInFlight) return { skipped: true }
      syncRunnerInFlight = true
      try {
        const result = await processSyncQueue(deps)
        return { skipped: false, result }
      } finally {
        syncRunnerInFlight = false
      }
    },
    isInFlight() {
      return syncRunnerInFlight
    },
  }
}

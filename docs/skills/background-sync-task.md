---
name: background-sync-task
description: Use this skill when implementing background sync, offline queue processing, or scheduled tasks. Agents hallucinate expo-background-fetch (REMOVED) or AppState listeners for sync. TD POS uses expo-background-task + expo-task-manager.
version: 1.0.0
---

# Background Sync — expo-background-task (SDK 55)

## ⚠️ COMMON HALLUCINATION WARNING

Agents will generate `expo-background-fetch` — this package was **REMOVED in SDK 55**. The replacement is `expo-background-task`. Agents also hallucinate using `AppState` listeners or `setInterval` for background sync — these DO NOT work when the app is backgrounded or killed.

## Architecture

```
User sells item
    → SQLite: UPDATE stock_pieces, INSERT sync_queue
    → UI updates instantly (offline-first)

[App backgrounded or killed]

expo-background-task fires (OS decides timing)
    → Read unsynced rows from sync_queue
    → For each: call Supabase RPC with client_operation_id
    → Mark synced_at on success
    → Increment retry_count on failure
```

## Implementation

### 1. Define Task (Top-Level — OUTSIDE React Components)

```typescript
// src/services/sync-task.ts
import * as TaskManager from 'expo-task-manager'
import * as BackgroundTask from 'expo-background-task'

export const SYNC_TASK_NAME = 'TDPOS_BACKGROUND_SYNC'

// MUST be defined at module level — not inside a component
TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    const { openDatabaseAsync } = await import('expo-sqlite')
    const { initializeDatabase } = await import('@/db/init')
    const { runSyncQueueOnce } = await import('./sync-executor')

    const db = await openDatabaseAsync('tdpos.db')
    await initializeDatabase(db)
    await runSyncQueueOnce(db)
    return BackgroundTask.BackgroundTaskResult.Success
  } catch (error) {
    console.error('[BackgroundSync] Task failed:', error)
    return BackgroundTask.BackgroundTaskResult.Failed
  }
})
```

### 2. Register Task (In App Startup)

```typescript
// src/services/register-sync.ts
import * as TaskManager from 'expo-task-manager'
import * as BackgroundTask from 'expo-background-task'
import { SYNC_TASK_NAME } from './sync-task'

export async function registerBackgroundSync() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME)
  if (!isRegistered) {
    await BackgroundTask.registerTaskAsync(SYNC_TASK_NAME, {
      // minimumInterval is in minutes. The OS may delay further.
      // Android: WorkManager handles scheduling
      minimumInterval: 15,
    })
  }
}
```

### 3. Shared Sync Executor

```typescript
// src/services/sync-executor.ts
export async function runSyncQueueOnce(db: AsyncSqliteLike) {
  // Centralized executor. Foreground AppState sync and background tasks both
  // use this so retries, Zod validation, and Supabase routing stay identical.
}
```

### 4. iOS Info.plist Requirement

Add to `app.config.ts` → `ios.infoPlist`:
```typescript
BGTaskSchedulerPermittedIdentifiers: [
  'com.expo.modules.backgroundtask.processing',
]
```

### 5. Foreground Sync (When App Is Active)

```typescript
// Also sync when app comes to foreground
import { AppState } from 'react-native'

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    processSyncQueue() // Immediate sync on foreground
  }
})
```

## Key Constraints

- **OS decides when to run:** Background tasks are NOT timers. iOS/Android schedule them based on battery, network, and usage patterns
- **Max ~30 seconds execution:** Keep sync batches small (50 rows max)
- **No Expo Go:** Must use development build to test background tasks
- **Test helper:** Use `BackgroundTask.triggerTaskWorkerForTestingAsync()` in dev builds
- **Return values:** Use `BackgroundTask.BackgroundTaskResult.Success` or `Failed`; do not use old `BackgroundFetchResult.NewData/NoData` values

## ❌ DO NOT USE

```typescript
// ❌ REMOVED in SDK 55
import * as BackgroundFetch from 'expo-background-fetch'
BackgroundFetch.registerTaskAsync(...)

// ❌ Does NOT work when app is killed
setInterval(() => syncData(), 30000)

// ❌ Only fires on foreground/background transitions, not periodic
AppState.addEventListener('change', syncEverything)

// ✅ CORRECT
import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
TaskManager.defineTask(TASK_NAME, async () => { ... })
BackgroundTask.registerTaskAsync(TASK_NAME)
```

## Sources

- Packages: `expo-background-task@~55.0.18`, `expo-task-manager@~55.0.16` (verified against `apps/mobile/package.json`)
- Official docs: <https://docs.expo.dev/versions/v55.0.0/sdk/background-task/>
- TaskManager reference: <https://docs.expo.dev/versions/v55.0.0/sdk/task-manager/>
- iOS BGTaskScheduler reference: <https://developer.apple.com/documentation/backgroundtasks/bgtaskscheduler>
- `app.config.ts` adds `UIBackgroundModes: ['processing']` and `BGTaskSchedulerPermittedIdentifiers: ['com.expo.modules.backgroundtask.processing']` to iOS Info.plist
- Implementation: `apps/mobile/src/services/sync-task.ts`, `apps/mobile/src/services/sync-executor.ts`, `apps/mobile/src/services/sync-processor.ts`, `apps/mobile/src/services/register-sync.ts`
- Last verified: 2026-05-13

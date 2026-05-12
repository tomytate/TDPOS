import * as BackgroundTask from 'expo-background-task'
import { openDatabaseAsync } from 'expo-sqlite'
import * as TaskManager from 'expo-task-manager'

import { initializeDatabase } from '@/db/init'
import { useAuthStore } from '@/stores/auth-store'

import { warnSafe } from './safe-logger'
import { runSyncQueueOnce } from './sync-executor'
import { supabase } from './supabase'

export const SYNC_TASK_NAME = 'TDPOS_BACKGROUND_SYNC'
const DATABASE_NAME = 'tdpos.db'

TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    if (!supabase || !useAuthStore.getState().userId) {
      return BackgroundTask.BackgroundTaskResult.Success
    }

    const db = await openDatabaseAsync(DATABASE_NAME)
    await initializeDatabase(db)
    await runSyncQueueOnce(db)
    return BackgroundTask.BackgroundTaskResult.Success
  } catch (err) {
    warnSafe('[BackgroundSync] task failed', err)
    return BackgroundTask.BackgroundTaskResult.Failed
  }
})

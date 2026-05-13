import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { useEffect } from 'react'
import { DEVICE_HEARTBEAT_MINIMUM_INTERVAL_MINUTES } from '@tdpos/shared'

import { useAuthStore } from '@/stores/auth-store'

import { warnSafe } from './safe-logger'
import { supabase } from './supabase'
import { SYNC_TASK_NAME } from './sync-task'

type BackgroundSyncRegistrationResult =
  | { ok: true; registered: true }
  | { ok: true; registered: false; reason: 'signed_out' | 'supabase_unconfigured' | 'restricted' }

export async function registerBackgroundSync(): Promise<BackgroundSyncRegistrationResult> {
  if (!supabase) return { ok: true, registered: false, reason: 'supabase_unconfigured' }
  if (!useAuthStore.getState().userId) return { ok: true, registered: false, reason: 'signed_out' }

  const status = await BackgroundTask.getStatusAsync()
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
    return { ok: true, registered: false, reason: 'restricted' }
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME)
  if (!isRegistered) {
    await BackgroundTask.registerTaskAsync(SYNC_TASK_NAME, {
      minimumInterval: DEVICE_HEARTBEAT_MINIMUM_INTERVAL_MINUTES,
    })
  }

  return { ok: true, registered: true }
}

export async function unregisterBackgroundSync() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK_NAME)
  if (isRegistered) {
    await BackgroundTask.unregisterTaskAsync(SYNC_TASK_NAME)
  }
}

export async function triggerBackgroundSyncForTesting() {
  if (!__DEV__) return false
  return BackgroundTask.triggerTaskWorkerForTestingAsync()
}

export function useBackgroundSyncRegistration() {
  const isSignedIn = useAuthStore((state) => Boolean(state.userId))

  useEffect(() => {
    const syncRegistration =
      isSignedIn && supabase ? registerBackgroundSync : unregisterBackgroundSync

    void syncRegistration().catch((err) => {
      warnSafe('[BackgroundSync] registration failed', err)
    })
  }, [isSignedIn])
}

import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { useEffect } from 'react'

import { useAuthStore } from '@/stores/auth-store'

import { supabase } from './supabase'
import { SYNC_TASK_NAME } from './sync-task'

const MINIMUM_SYNC_INTERVAL_MINUTES = 15

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
      minimumInterval: MINIMUM_SYNC_INTERVAL_MINUTES,
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
      if (typeof console !== 'undefined') {
        console.warn('[BackgroundSync] registration failed', err)
      }
    })
  }, [isSignedIn])
}

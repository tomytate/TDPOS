/**
 * Foreground sync trigger.
 *
 * Hook + component that wire `createSyncRunner` to React Native's `AppState`.
 * Runs once on mount (covers the case where the app starts in foreground)
 * and again every time `AppState` transitions to `'active'`.
 *
 * If `supabase` is `null` (env vars unconfigured — demo mode), the hook is
 * a no-op. The processor still has access to the local `sync_queue` for
 * inspection in the future Diagnostics screen (P10.3); we just don't
 * attempt to push to a backend that isn't configured.
 */

import { useEffect } from 'react'
import { AppState } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'

import { useAuthStore } from '@/stores/auth-store'

import { warnSafe } from './safe-logger'
import { runSyncQueueOnce } from './sync-executor'
import { supabase } from './supabase'

export function useForegroundSyncTrigger() {
  const db = useSQLiteContext()
  const isSignedIn = useAuthStore((state) => Boolean(state.userId))

  useEffect(() => {
    if (!supabase || !isSignedIn) return

    const fire = () => {
      void runSyncQueueOnce(db).catch((err) => {
        // Swallow — sync_queue retains failed rows; the next trigger retries.
        // Real diagnostics will surface this on the P10.3 screen.
        warnSafe('[SyncTrigger] runner failed', err)
      })
    }

    fire()

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') fire()
    })

    return () => {
      subscription.remove()
    }
  }, [db, isSignedIn])
}

export function SyncTriggerEffect() {
  useForegroundSyncTrigger()
  return null
}

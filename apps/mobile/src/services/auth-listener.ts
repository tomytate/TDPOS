/**
 * Auth state listener hook — subscribes to Supabase auth events and keeps the
 * local Zustand auth-store in sync.
 *
 * - `INITIAL_SESSION` (cold start with cached session): bootstrap stores from
 *   the network so any role/branch/business changes since last launch propagate.
 * - `SIGNED_IN` (after OTP success): bootstrap stores.
 * - `TOKEN_REFRESHED`: no-op for stores (auth-store data is unchanged); the
 *   supabase client handles cookie/storage refresh internally.
 * - `SIGNED_OUT`: clear the local auth-store.
 *
 * If supabase is not configured (no env vars), this hook is a no-op. The app
 * still renders, but Stack.Protected gates remain in their last known state.
 */

import { useEffect } from 'react'

import { supabase } from './supabase'
import { bootstrapAuthFromSession, type SupabaseBootstrapClient } from './auth-bootstrap'
import { useAuthStore } from '@/stores/auth-store'

export function useAuthStateListener() {
  useEffect(() => {
    if (!supabase) return

    const setAuth = useAuthStore.getState().setAuth
    const setDevice = useAuthStore.getState().setDevice
    const setBootstrapStatus = useAuthStore.getState().setBootstrapStatus
    const clearAuth = useAuthStore.getState().clearAuth

    const handleSession = async (
      event: string,
      session: { user: { id: string; phone?: string | null } } | null,
    ) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearAuth()
        return
      }
      if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN' && event !== 'USER_UPDATED') {
        // TOKEN_REFRESHED, PASSWORD_RECOVERY, etc. — no store change needed.
        return
      }

      try {
        // Cast: real `SupabaseClient` is structurally compatible with our
        // narrow bootstrap shape; the `from(...).select(...).eq(...)` chain
        // resolves through PostgrestFilterBuilder which we model as a
        // PromiseLike.
        const outcome = await bootstrapAuthFromSession({
          supabase: supabase as unknown as SupabaseBootstrapClient,
          session,
          store: { setAuth, setDevice },
        })
        setBootstrapStatus(outcome)
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.warn('[AuthListener] bootstrap failed', err)
        }
        setBootstrapStatus({
          ok: false,
          reason: 'query_failed',
          message: err instanceof Error ? err.message : 'unknown error',
        })
      }
    }

    // `onAuthStateChange` fires `INITIAL_SESSION` immediately on subscribe
    // with the current cached session (or null). We rely on that event for
    // cold-start so we never need a direct cached-session read; the legacy
    // session-fetch path is also forbidden by the deprecations table.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      void handleSession(event, session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])
}

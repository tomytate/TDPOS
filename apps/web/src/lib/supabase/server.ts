// Server-side Supabase client for Server Components, Server Actions, and Route
// Handlers. Reads/writes auth cookies via next/headers. Always pair every
// auth gate with the local-claim validation path per the deprecations table.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export async function getServerSupabase() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'Supabase env not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // setAll inside Server Components is intentionally a no-op; the
          // proxy handles refresh. This catch keeps Server Components safe.
        }
      },
    },
  })
}

export async function getCurrentClaims() {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase.auth.getClaims()
  if (error) return null
  return data?.claims ?? null
}

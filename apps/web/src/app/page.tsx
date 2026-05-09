import { redirect } from 'next/navigation'

import { getCurrentClaims } from '@/lib/supabase/server'

// Root entry. proxy.ts already redirects unauthenticated users to /login,
// so by the time we reach this Server Component the session has been
// validated. We still call getCurrentClaims() to build the dashboard shell
// or fall back to /login if Supabase env is unconfigured.
export default async function RootPage() {
  let claims = null
  try {
    claims = await getCurrentClaims()
  } catch {
    // Env not configured yet — let the developer land somewhere they can act on it.
    redirect('/login')
  }

  if (!claims) redirect('/login')
  redirect('/dashboard')
}

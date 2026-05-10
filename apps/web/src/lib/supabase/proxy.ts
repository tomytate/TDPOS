// Session-refresh helper invoked by /apps/web/proxy.ts on every matched request.
// Uses @supabase/ssr's cookie-based SSR client and the local-claim validation
// flow per the deprecations table. See docs/skills/nextjs-16-proxy-pattern.md.

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// Auth-entry routes: signed-out users land here; signed-in users get bounced
// back to the dashboard so they don't re-authenticate accidentally.
const AUTH_ENTRY_ROUTES = ['/login', '/verify-otp']

// Marketing routes: everyone sees these regardless of auth state. The pricing
// page is the canonical example; it sources tier copy from `TIER_DEFINITIONS`
// in `@tdpos/shared` so signed-in users can preview upgrade tiers without
// being redirected away.
const MARKETING_ROUTES = ['/pricing']

function matchesAny(pathname: string, routes: readonly string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function isAuthEntryRoute(pathname: string): boolean {
  return matchesAny(pathname, AUTH_ENTRY_ROUTES)
}

function isPublicRoute(pathname: string): boolean {
  return isAuthEntryRoute(pathname) || matchesAny(pathname, MARKETING_ROUTES)
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request })

  // If the env isn't configured yet (developer running before Supabase staging
  // exists), skip auth entirely. Pages can still render; data calls will fail
  // loudly when they try to talk to Supabase.
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return response
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // getClaims() validates the JWT locally — faster than the legacy
  // session-fetch path and the pattern recommended by @supabase/ssr 0.10+.
  // See docs/skills/deprecations.md.
  const { data: claimsData } = await supabase.auth.getClaims()
  const isAuthenticated = Boolean(claimsData?.claims?.sub)

  const pathname = request.nextUrl.pathname

  if (!isAuthenticated && !isPublicRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Only auth-entry routes (login, verify-otp) bounce signed-in users back to
  // the dashboard. Marketing routes (e.g. /pricing) stay accessible so an
  // owner can compare tiers from inside the app.
  if (isAuthenticated && isAuthEntryRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

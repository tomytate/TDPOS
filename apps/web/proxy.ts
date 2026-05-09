// TD POS Web Dashboard — proxy.ts (Next.js 16 only)
//
// Runs on every matched request, refreshes the Supabase session via
// @supabase/ssr cookies, and redirects unauthenticated users away from
// /(dashboard)/* to /login. This is the supported Next 16 request-pipeline
// entry; the older Next 15 entry name is forbidden per the deprecations table.
//
// IMPORTANT: this file MUST be named `proxy.ts` and live at the workspace root
// (apps/web/proxy.ts) or under apps/web/src/proxy.ts. See:
// docs/skills/nextjs-16-proxy-pattern.md

import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/proxy'

export function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Skip static assets, Next internals, image optimizer, favicon, and
    // common image extensions. Everything else passes through.
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

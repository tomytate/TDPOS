---
name: nextjs-16-proxy-pattern
description: Use this skill when working on the Next.js 16 web dashboard, middleware, auth guards, or server-side request handling. Agents WILL hallucinate middleware.ts — Next.js 16 uses proxy.ts with a completely different API.
version: 1.0.0
---

# Next.js 16 — proxy.ts Pattern

## ⚠️ COMMON HALLUCINATION WARNING

Agents trained on Next.js 13-15 will generate `middleware.ts` with `NextResponse.redirect()`. In Next.js 16, `middleware.ts` is **DEPRECATED**. Use `proxy.ts` with a named `proxy()` export instead. The proxy runs in the **Node.js runtime** by default (not Edge).

## File Location

Place at project root or inside `src/`:

- `apps/web/proxy.ts` ✅
- `apps/web/src/proxy.ts` ✅

## Basic Pattern

```typescript
// apps/web/proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Skip static files, images, and internal Next.js routes
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Supabase SSR Session Refresh

```typescript
// apps/web/src/lib/supabase/proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  // Refresh session — do NOT use getSession() for auth validation
  const { data: claims, error } = await supabase.auth.getClaims()

  // Redirect unauthenticated users to login
  if (!claims && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

## Auth in Server Components

```typescript
// Use getClaims() — NOT getSession() — for server-side auth
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )
}

// In a Server Component:
const supabase = await getServerSupabase()
const { data: claims } = await supabase.auth.getClaims()
// claims.sub = user ID
```

## ❌ DO NOT USE

```tsx
// ❌ DEPRECATED — Next.js 15 middleware pattern
// middleware.ts
export function middleware(request: NextRequest) { ... }

// ❌ DEPRECATED — getSession for server auth
const { data: { session } } = await supabase.auth.getSession()

// ❌ DEPRECATED — old auth helpers
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

// ✅ CORRECT
// proxy.ts
export function proxy(request: NextRequest) { ... }
const { data: claims } = await supabase.auth.getClaims()
```

## Sources

- Packages: `next@16.2.6`, `@supabase/ssr@^0.10.3`
- Next.js docs: <https://nextjs.org/docs>
- Next.js 16 release notes: <https://nextjs.org/blog/next-16> (proxy.ts replaces middleware.ts)
- proxy reference: <https://nextjs.org/docs/app/api-reference/file-conventions/proxy>
- Supabase SSR: <https://supabase.com/docs/guides/auth/server-side/nextjs>
- `getClaims()` reference: <https://supabase.com/docs/reference/javascript/auth-getclaims>
- Implementation: `apps/web/proxy.ts`, `apps/web/src/lib/supabase/proxy.ts`
- Last verified: 2026-05-09

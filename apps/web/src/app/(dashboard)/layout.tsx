import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getCurrentClaims } from '@/lib/supabase/server'

import { signOutAction } from './actions'

// Defense-in-depth: proxy.ts already redirects unauthenticated requests, but
// every protected layout re-checks claims server-side.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let claims = null
  try {
    claims = await getCurrentClaims()
  } catch {
    redirect('/login')
  }

  if (!claims) redirect('/login')

  const phone = typeof claims.phone === 'string' ? claims.phone : '—'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-teal-700 px-6 py-3 text-white">
        <div className="flex items-baseline gap-3">
          <strong className="text-base">TD POS</strong>
          <span className="text-[13px] opacity-85">Owner Dashboard</span>
        </div>
        <nav className="flex items-center gap-1 text-[13px]" aria-label="Primary">
          <Link
            href="/dashboard"
            className="rounded-md px-2.5 py-1 text-white transition-colors hover:bg-white/10"
          >
            Overview
          </Link>
          <Link
            href="/sync"
            className="rounded-md px-2.5 py-1 text-white transition-colors hover:bg-white/10"
          >
            Sync health
          </Link>
          <Link
            href="/products"
            className="rounded-md px-2.5 py-1 text-white transition-colors hover:bg-white/10"
          >
            Products
          </Link>
          <Link
            href="/branches"
            className="rounded-md px-2.5 py-1 text-white transition-colors hover:bg-white/10"
          >
            Branches
          </Link>
          <Link
            href="/users"
            className="rounded-md px-2.5 py-1 text-white transition-colors hover:bg-white/10"
          >
            Users
          </Link>
          <Link
            href="/modules"
            className="rounded-md px-2.5 py-1 text-white transition-colors hover:bg-white/10"
          >
            Modules
          </Link>
          <Link
            href="/audit"
            className="rounded-md px-2.5 py-1 text-white transition-colors hover:bg-white/10"
          >
            Audit log
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-[13px]">
          <span className="opacity-85">{phone}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-md border border-white/40 bg-transparent px-2.5 py-1 text-xs text-white transition-colors hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">{children}</main>
    </div>
  )
}

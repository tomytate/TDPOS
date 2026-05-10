import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getBusinessEntitlements } from '@/lib/queries/management'
import { getCurrentClaims } from '@/lib/supabase/server'
import type { TierSurface } from '@tdpos/shared'

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
  const entitlementsResult = await getBusinessEntitlements()
  const entitlements = entitlementsResult.ready ? entitlementsResult.entitlements : null
  const tierShortLabel = entitlements?.tierShortLabel ?? null

  const navItems: Array<{ href: string; label: string; surface: TierSurface }> = [
    { href: '/dashboard', label: 'Overview', surface: 'web.overview' },
    { href: '/sync', label: 'Sync health', surface: 'web.sync' },
    { href: '/products', label: 'Products', surface: 'web.products' },
    { href: '/branches', label: 'Branches', surface: 'web.branches' },
    { href: '/users', label: 'Users', surface: 'web.users' },
    { href: '/devices', label: 'Devices', surface: 'web.devices' },
    { href: '/modules', label: 'Modules', surface: 'web.modules' },
    { href: '/audit', label: 'Audit log', surface: 'web.audit' },
    { href: '/hq', label: 'HQ', surface: 'web.hq' },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-teal-700 px-6 py-3 text-white">
        <div className="flex items-baseline gap-3">
          <strong className="text-base">TD POS</strong>
          <span className="text-[13px] opacity-85">Owner Dashboard</span>
        </div>
        <nav className="flex items-center gap-1 text-[13px]" aria-label="Primary">
          {navItems.map((item) => {
            const unlocked = entitlements?.isSurfaceEnabled(item.surface) ?? true
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  unlocked
                    ? 'rounded-md px-2.5 py-1 text-white transition-colors hover:bg-white/10'
                    : 'rounded-md px-2.5 py-1 text-white/60 transition-colors hover:bg-white/10'
                }
                title={unlocked ? item.label : `${item.label} is tier-locked`}
              >
                {item.label}
                {unlocked ? null : <span className="ml-1 text-[10px]">Locked</span>}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-3 text-[13px]">
          {tierShortLabel ? (
            <Link
              href="/pricing"
              className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/25"
              title="Compare tiers"
            >
              Tier · {tierShortLabel}
            </Link>
          ) : null}
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

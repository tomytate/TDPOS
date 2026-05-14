// Dashboard shell. Polished for v0.9 visual QA: active-route highlight
// via the new DashboardNav client component, phone number masked to
// only show the last 4 digits, content area widened to max-w-6xl for
// data-heavy tables (was max-w-5xl which forced horizontal scroll on
// products and devices), and a soft footer with the BIR-ready
// language disclaimer + product version chip.
//
// Defense-in-depth: proxy.ts already redirects unauthenticated
// requests, but every protected layout re-checks claims server-side.

import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { DashboardNav, type DashboardNavItem } from '@/components/dashboard-nav'
import { getBusinessEntitlements } from '@/lib/queries/management'
import { getCurrentClaims } from '@/lib/supabase/server'
import type { TierSurface } from '@tdpos/shared'

import { signOutAction } from './actions'

const NAV_ROUTES: Array<{ href: string; label: string; surface: TierSurface }> = [
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

function maskPhone(phone: string): string {
  if (!phone || phone === '—') return phone
  if (phone.length <= 4) return phone
  return `••• ••• ${phone.slice(-4)}`
}

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

  const navItems: DashboardNavItem[] = NAV_ROUTES.map((item) => ({
    href: item.href,
    label: item.label,
    unlocked: entitlements?.isSurfaceEnabled(item.surface) ?? true,
  }))

  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-teal-700 px-4 py-3 text-white shadow-sm sm:px-6">
        <div className="flex items-baseline gap-3">
          <Link href="/dashboard" className="text-base font-semibold text-white">
            TD POS
          </Link>
          <span className="hidden text-[13px] opacity-85 sm:inline">Owner Dashboard</span>
        </div>
        <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1 sm:justify-center sm:flex">
          <DashboardNav items={navItems} />
        </div>
        <div className="order-2 flex items-center gap-2 text-[13px] sm:order-3 sm:gap-3">
          {tierShortLabel ? (
            <Link
              href="/pricing"
              className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/25"
              title="Compare tiers"
            >
              Tier · {tierShortLabel}
            </Link>
          ) : null}
          <span className="hidden font-mono opacity-85 md:inline" title="Signed-in phone (masked)">
            {maskPhone(phone)}
          </span>
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
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[12px] text-ink-500 sm:px-6">
        <span>BIR-ready provisional cashier formats. BIR accreditation pending.</span>
        <div className="flex items-center gap-3">
          <Link href="/privacy" className="font-semibold text-teal-700 hover:underline">
            Privacy notice
          </Link>
          <Link href="/pricing" className="font-semibold text-teal-700 hover:underline">
            Compare tiers
          </Link>
        </div>
      </footer>
    </div>
  )
}

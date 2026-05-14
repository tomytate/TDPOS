// Dashboard nav. Client Component because Server Component layout needs
// `usePathname()` to highlight the active route. The route list itself is
// passed down from the layout (still server-resolved entitlements) so the
// gating logic stays one source of truth.

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface DashboardNavItem {
  href: string
  label: string
  unlocked: boolean
}

export function DashboardNav({ items }: { items: DashboardNavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center gap-1 text-[13px]" aria-label="Primary">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
        const baseClass = 'inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors'
        const stateClass = isActive
          ? 'bg-white text-teal-800 shadow-sm'
          : item.unlocked
            ? 'text-white hover:bg-white/10'
            : 'text-white/60 hover:bg-white/10'

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            title={item.unlocked ? item.label : `${item.label} is tier-locked`}
            className={`${baseClass} ${stateClass}`}
          >
            {item.label}
            {!item.unlocked ? (
              <svg
                aria-hidden="true"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M5 11V8a7 7 0 0114 0v3M5 11h14v10H5V11z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

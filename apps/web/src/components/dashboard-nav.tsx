// Dashboard nav. Client Component because Server Component layout needs
// `usePathname()` to highlight the active route. The route list itself is
// passed down from the layout (still server-resolved entitlements) so the
// gating logic stays one source of truth.
//
// Mobile-responsive: below sm the 9 links horizontally scroll inside the
// header instead of wrapping onto a second / third row that pushed the
// content below the fold. The scrolling row has a thin fade on the right
// edge to hint that more options live offscreen. On sm+ the links fall
// back to the original wrap-and-fill layout.

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
    <nav aria-label="Primary" className="relative max-w-full overflow-x-auto">
      <ul className="flex flex-nowrap items-center gap-1 whitespace-nowrap text-[13px] sm:flex-wrap">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          const baseClass =
            'inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors'
          const stateClass = isActive
            ? 'bg-white text-teal-800 shadow-sm'
            : item.unlocked
              ? 'text-white hover:bg-white/10'
              : 'text-white/60 hover:bg-white/10'

          return (
            <li key={item.href}>
              <Link
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
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

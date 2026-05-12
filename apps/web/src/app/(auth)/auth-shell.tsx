// Shared layout for /login + /verify-otp. Split-pane on lg+ screens — left
// brand rail for marketing context, right pane for the form. Collapses to a
// centered card on mobile/tablet so the existing form layout still works.
// Server component on purpose so the brand copy ships in the initial HTML.

import Link from 'next/link'
import type { ReactNode } from 'react'

interface AuthShellProps {
  title: string
  subtitle: string
  children: ReactNode
}

const BRAND_BULLETS = [
  {
    title: 'Offline-first cashier',
    body: 'Sales work with zero internet. Sync drains in the background once you reconnect.',
  },
  {
    title: 'Tingi-aware inventory',
    body: 'Per-piece stock is the source of truth. Pack math is derived — never fractional, never wrong.',
  },
  {
    title: 'BIR-ready receipts',
    body: 'Provisional receipt format ready for accreditation. Single switch flips the wording.',
  },
  {
    title: 'Free forever for solo cashiers',
    body: 'Tier A Free covers one cashier on one phone. Upgrade only when you need more lanes.',
  },
]

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col bg-ink-50 lg:flex-row">
      {/* Brand rail — visible on lg+ as a left pane, hidden on mobile */}
      <aside
        className="hidden flex-col justify-between gap-8 bg-gradient-to-br from-teal-700 to-teal-900 p-10 text-white lg:flex lg:w-[44%] lg:max-w-[520px]"
        aria-hidden="true"
      >
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-2xl font-semibold text-white no-underline">
            TD POS
          </Link>
          <p className="m-0 text-[15px] text-white/85">
            The operating system for Philippine business.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <p className="m-0 text-[28px] font-semibold leading-tight">
            &ldquo;Tama ang stock mo. Lagi.&rdquo;
          </p>
          <p className="m-0 text-[14px] text-white/80">Your stock is correct. Always.</p>
        </div>

        <ul className="flex list-none flex-col gap-4 p-0">
          {BRAND_BULLETS.map((item) => (
            <li key={item.title} className="flex gap-3">
              <span
                className="mt-1 inline-block size-2 shrink-0 rounded-full bg-amber-400"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-0.5">
                <p className="m-0 text-[14px] font-semibold text-white">{item.title}</p>
                <p className="m-0 text-[13px] text-white/80">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <nav className="flex items-center gap-3 text-[13px] text-white/75" aria-label="Marketing">
          <Link href="/pricing" className="text-white/85 underline-offset-2 hover:underline">
            Pricing
          </Link>
          <span aria-hidden="true">·</span>
          <span>BIR accreditation pending</span>
        </nav>
      </aside>

      {/* Form pane */}
      <section className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <header className="mb-5 flex flex-col gap-2">
            {/* Mobile brand cap — shown when the rail is hidden */}
            <Link
              href="/"
              className="text-[15px] font-semibold text-teal-700 no-underline lg:hidden"
            >
              TD POS
            </Link>
            <h1 className="m-0 text-[26px] font-semibold leading-tight text-ink-900">{title}</h1>
            <p className="m-0 text-[14px] text-ink-600">{subtitle}</p>
          </header>

          <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-sm">{children}</div>

          <footer className="mt-5 flex items-center justify-between gap-3 text-[12px] text-ink-500">
            <span>BIR-ready provisional dashboard.</span>
            <Link
              href="/pricing"
              className="text-teal-700 no-underline underline-offset-2 hover:underline"
            >
              Compare tiers
            </Link>
          </footer>
        </div>
      </section>
    </main>
  )
}

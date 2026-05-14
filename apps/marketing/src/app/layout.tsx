// Marketing root layout. Polished for v0.9 visual QA: clearer header
// hierarchy (logo-mark + tagline), three-link nav (Pricing / Privacy /
// Terms) with a prominent "Start free" call-to-action, and a footer
// that mirrors the web dashboard footer (BIR-ready disclaimer + legal
// links) so the brand reads consistent across marketing and product.

import type { Metadata } from 'next'
import Link from 'next/link'

import './globals.css'

export const metadata: Metadata = {
  title: 'TD POS — Offline-first POS for Philippine business',
  description:
    'Tama ang stock mo. Lagi. Offline-first cashier, tingi inventory, and owner monitoring for stores that cannot afford wrong stock.',
}

function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-baseline gap-2 text-ink-900">
          <span className="text-base font-semibold">TD POS</span>
          <span className="hidden text-[12px] text-ink-500 sm:inline">
            Tama ang stock mo. Lagi.
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-[13px] font-semibold text-ink-600">
          <Link href="/pricing" className="hover:text-teal-700">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-teal-700">
            Privacy
          </Link>
          <Link href="/terms" className="hidden hover:text-teal-700 sm:inline">
            Terms
          </Link>
          <Link
            href="/pricing"
            className="rounded-md bg-teal-700 px-3 py-1.5 text-white hover:bg-teal-800"
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MarketingNav />
        {children}
        <footer className="border-t border-ink-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 text-[12px] text-ink-500 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="m-0 font-semibold text-ink-700">TD POS</p>
              <p className="m-0">
                Tama ang stock mo. Lagi. · BIR-ready provisional cashier formats. BIR accreditation
                pending.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/pricing" className="hover:text-teal-700">
                Pricing
              </Link>
              <Link href="/privacy" className="hover:text-teal-700">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-teal-700">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}

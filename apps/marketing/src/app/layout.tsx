import type { Metadata } from 'next'
import Link from 'next/link'

import './globals.css'

export const metadata: Metadata = {
  title: 'TD POS',
  description: 'Offline-first POS for Philippine business.',
}

function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="text-base font-semibold text-ink-900">
          TD POS
        </Link>
        <nav className="flex items-center gap-3 text-[13px] font-semibold text-ink-600">
          <Link href="/pricing" className="hover:text-teal-700">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-teal-700">
            Privacy
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
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-[12px] text-ink-500 sm:flex-row sm:items-center sm:justify-between">
            <p className="m-0">TD POS - Tama ang stock mo. Lagi.</p>
            <div className="flex gap-3">
              <Link href="/terms" className="hover:text-teal-700">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-teal-700">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}

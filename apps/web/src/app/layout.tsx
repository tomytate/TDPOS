import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
  title: 'TD POS — Owner Dashboard',
  description: 'Tama ang stock mo. Lagi.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="m-0 bg-ink-50 text-ink-900 font-sans antialiased">{children}</body>
    </html>
  )
}

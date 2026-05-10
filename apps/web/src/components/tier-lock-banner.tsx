// Server Component banner that renders above paid management surfaces when
// the current tier doesn't unlock them. Pure presentational — pages decide
// when to render it from `entitlements.isSurfaceEnabled(surface)`.
//
// At v0.1 these surfaces are mostly scaffolded; guarded Server Actions return
// clear lock / scaffold states until the real W0.8 mutations land.

import type { ReactNode } from 'react'

interface TierLockBannerProps {
  tierLabel: string
  surfaceLabel: string
  unlockedAt: string
  copy?: ReactNode
}

export function TierLockBanner({ tierLabel, surfaceLabel, unlockedAt, copy }: TierLockBannerProps) {
  return (
    <aside
      role="note"
      className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-4"
    >
      <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-amber-700">
        {tierLabel} — read-only
      </p>
      <p className="m-0 text-sm text-ink-700">
        {copy ?? (
          <>
            {surfaceLabel} is read-only on your current tier. Upgrade to{' '}
            <span className="font-semibold">{unlockedAt}</span> to add and edit.
          </>
        )}
      </p>
    </aside>
  )
}

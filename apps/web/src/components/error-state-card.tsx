// Shared error-state card. Replaces the inline `<div role="status"
// className="amber-200 bg-amber-50 ...">` pattern that was repeated
// across every dashboard page with one component that adds an icon,
// a title, and a body, while keeping the same tone tokens for
// continuity. The previous inline shape was functional but felt raw
// next to the rest of the v0.9 polished surfaces.
//
// Used by /products, /branches, /users, /modules, /devices when a
// query fails or Supabase isn't configured.

import type { ReactNode } from 'react'

export type ErrorStateTone = 'warn' | 'danger'

interface ErrorStateCardProps {
  title: string
  body?: ReactNode
  tone?: ErrorStateTone
  children?: ReactNode
}

const TONE_STYLES: Record<ErrorStateTone, { border: string; bg: string; title: string }> = {
  warn: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    title: 'text-amber-700',
  },
  danger: {
    border: 'border-danger-500/40',
    bg: 'bg-danger-500/10',
    title: 'text-danger-600',
  },
}

function GlyphFor({ tone }: { tone: ErrorStateTone }) {
  const color = tone === 'danger' ? 'text-danger-600' : 'text-amber-600'
  return (
    <svg
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 ${color}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  )
}

export function ErrorStateCard({ title, body, tone = 'warn', children }: ErrorStateCardProps) {
  const styles = TONE_STYLES[tone]
  return (
    <div role="status" className={`rounded-lg border ${styles.border} ${styles.bg} p-4 text-sm`}>
      <div className="flex items-start gap-3">
        <GlyphFor tone={tone} />
        <div className="flex-1">
          <p className={`m-0 text-[13px] font-semibold ${styles.title}`}>{title}</p>
          {body ? <p className="m-0 mt-1 text-[13px] text-ink-700">{body}</p> : null}
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
      </div>
    </div>
  )
}

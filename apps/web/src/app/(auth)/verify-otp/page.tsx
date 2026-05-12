'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef } from 'react'
import { useActionState } from 'react'

import { AuthShell } from '../auth-shell'
import { verifyOtpAction, type VerifyActionState } from './actions'

const initialState: VerifyActionState = { status: 'idle' }

function VerifyOtpForm() {
  const params = useSearchParams()
  const phone = params.get('phone') ?? ''
  const [state, formAction, isPending] = useActionState(verifyOtpAction, initialState)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the OTP field on mount so the user can paste/type the code
  // straight from their SMS app without an extra tap.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="phone" value={phone} />
      <label htmlFor="token" className="text-[13px] font-medium text-ink-700">
        One-time code
      </label>
      <input
        ref={inputRef}
        id="token"
        name="token"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        maxLength={6}
        minLength={6}
        pattern="\d{6}"
        placeholder="123456"
        disabled={isPending}
        aria-describedby="token-help"
        className="rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-ink-900 placeholder:text-ink-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:bg-ink-100"
      />
      <p id="token-help" className="m-0 text-[12px] text-ink-500">
        Sent to <span className="font-medium text-ink-700">{phone || 'your phone'}</span>. Codes
        expire after a few minutes.
      </p>
      {state.status === 'error' ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger-500/40 bg-danger-500/10 px-3 py-2 text-[13px] text-danger-600"
        >
          <span aria-hidden="true">⚠</span>
          <span>{state.message}</span>
        </div>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg border-0 bg-teal-700 px-3 py-2.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-100 focus:ring-offset-2 disabled:cursor-progress disabled:opacity-70"
      >
        {isPending ? 'Verifying…' : 'Verify and sign in'}
      </button>
      <div className="mt-1 flex items-center justify-between gap-3 text-[13px]">
        <Link
          href={phone ? `/login?phone=${encodeURIComponent(phone)}` : '/login'}
          className="text-teal-700 no-underline underline-offset-2 hover:underline"
        >
          Resend code
        </Link>
        <Link
          href="/login"
          className="text-ink-500 no-underline underline-offset-2 hover:text-ink-700 hover:underline"
        >
          Use a different number
        </Link>
      </div>
    </form>
  )
}

function VerifyOtpFallback() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <div className="h-4 w-1/3 rounded bg-ink-200" />
      <div className="h-12 rounded-lg bg-ink-100" />
      <div className="h-3 w-2/3 rounded bg-ink-100" />
      <div className="h-11 rounded-lg bg-ink-200" />
    </div>
  )
}

export default function VerifyOtpPage() {
  return (
    <AuthShell
      title="Verify your code"
      subtitle="Enter the 6-digit code from the SMS we just sent."
    >
      <Suspense fallback={<VerifyOtpFallback />}>
        <VerifyOtpForm />
      </Suspense>
    </AuthShell>
  )
}

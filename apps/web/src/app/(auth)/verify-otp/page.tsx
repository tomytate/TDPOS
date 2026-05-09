'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useActionState } from 'react'

import { verifyOtpAction, type VerifyActionState } from './actions'

const initialState: VerifyActionState = { status: 'idle' }

function VerifyOtpForm() {
  const params = useSearchParams()
  const phone = params.get('phone') ?? ''
  const [state, formAction, isPending] = useActionState(verifyOtpAction, initialState)

  return (
    <section className="w-full max-w-sm rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h1 className="m-0 text-[22px] font-semibold text-teal-700">Verify code</h1>
        <p className="mt-1 text-sm text-ink-600">
          Enter the 6-digit code we sent to {phone || 'your phone'}.
        </p>
      </header>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="phone" value={phone} />
        <label htmlFor="token" className="text-[13px] font-medium text-ink-700">
          One-time code
        </label>
        <input
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
          className="rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-ink-900 placeholder:text-ink-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:bg-ink-100"
        />
        {state.status === 'error' ? (
          <p role="alert" className="m-0 text-[13px] text-danger-600">
            {state.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border-0 bg-teal-700 px-3 py-2.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-progress disabled:opacity-70"
        >
          {isPending ? 'Verifying…' : 'Verify and sign in'}
        </button>
        <Link
          href="/login"
          className="mt-1 text-center text-[13px] text-teal-700 no-underline hover:text-teal-800"
        >
          Use a different number
        </Link>
      </form>
    </section>
  )
}

export default function VerifyOtpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={null}>
        <VerifyOtpForm />
      </Suspense>
    </main>
  )
}

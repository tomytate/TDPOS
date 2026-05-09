'use client'

import { useActionState } from 'react'

import { sendOtpAction, type LoginActionState } from './actions'

const initialState: LoginActionState = { status: 'idle' }

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(sendOtpAction, initialState)

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-sm rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
        <header className="mb-4">
          <h1 className="m-0 text-[22px] font-semibold text-teal-700">TD POS</h1>
          <p className="mt-1 text-sm text-ink-600">
            Owner dashboard. Sign in with your Philippine mobile number.
          </p>
        </header>

        <form action={formAction} className="flex flex-col gap-3">
          <label htmlFor="phone" className="text-[13px] font-medium text-ink-700">
            Mobile number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="09171234567"
            disabled={isPending}
            className="rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-base text-ink-900 placeholder:text-ink-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:bg-ink-100 disabled:text-ink-500"
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
            {isPending ? 'Sending OTP…' : 'Send one-time code'}
          </button>
        </form>

        <footer className="mt-5 text-xs text-ink-500">
          BIR-ready provisional dashboard. BIR accreditation pending.
        </footer>
      </section>
    </main>
  )
}

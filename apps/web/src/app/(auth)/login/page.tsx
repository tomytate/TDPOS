'use client'

import { useEffect, useRef } from 'react'
import { useActionState } from 'react'

import { AuthShell } from '../auth-shell'
import { sendOtpAction, type LoginActionState } from './actions'

const initialState: LoginActionState = { status: 'idle' }

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(sendOtpAction, initialState)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the phone field on mount so the owner can start typing
  // immediately. iOS Safari requires a user-gesture for focus()
  // on most inputs, but the next.js client-component mount counts.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <AuthShell title="Sign in" subtitle="Owner dashboard — enter your Philippine mobile number.">
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="phone" className="text-[13px] font-medium text-ink-700">
          Mobile number
        </label>
        <input
          ref={inputRef}
          id="phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="09171234567"
          disabled={isPending}
          aria-describedby="phone-help"
          className="rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-base text-ink-900 placeholder:text-ink-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:bg-ink-100 disabled:text-ink-500"
        />
        <p id="phone-help" className="m-0 text-[12px] text-ink-500">
          We&rsquo;ll send a 6-digit code via SMS. Enter your PH mobile number — leading 0 or +63
          both work.
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
          {isPending ? 'Sending code…' : 'Send one-time code'}
        </button>
      </form>
    </AuthShell>
  )
}

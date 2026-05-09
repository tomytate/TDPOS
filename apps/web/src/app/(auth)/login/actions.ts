'use server'

import { redirect } from 'next/navigation'

import { normalizePhPhone, isValidPhPhone } from '@tdpos/shared'

import { getServerSupabase } from '@/lib/supabase/server'

export type LoginActionState = { status: 'idle' } | { status: 'error'; message: string }

export async function sendOtpAction(
  _previous: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const rawPhone = String(formData.get('phone') ?? '').trim()
  const phone = normalizePhPhone(rawPhone)

  if (!isValidPhPhone(phone)) {
    return {
      status: 'error',
      message: 'Enter a valid Philippine mobile number, e.g. 09171234567.',
    }
  }

  let supabase
  try {
    supabase = await getServerSupabase()
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Supabase not configured.',
    }
  }

  const { error } = await supabase.auth.signInWithOtp({ phone })
  if (error) {
    return { status: 'error', message: error.message }
  }

  redirect(`/verify-otp?phone=${encodeURIComponent(phone)}`)
}

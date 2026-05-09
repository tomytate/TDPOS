'use server'

import { redirect } from 'next/navigation'

import { isValidPhPhone } from '@tdpos/shared'

import { getServerSupabase } from '@/lib/supabase/server'

export type VerifyActionState = { status: 'idle' } | { status: 'error'; message: string }

export async function verifyOtpAction(
  _previous: VerifyActionState,
  formData: FormData,
): Promise<VerifyActionState> {
  const phone = String(formData.get('phone') ?? '').trim()
  const token = String(formData.get('token') ?? '').trim()

  if (!isValidPhPhone(phone)) {
    return { status: 'error', message: 'Phone number is invalid. Restart sign-in.' }
  }
  if (!/^\d{6}$/.test(token)) {
    return { status: 'error', message: 'Enter the 6-digit code.' }
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

  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  if (error) {
    return { status: 'error', message: error.message }
  }

  redirect('/dashboard')
}

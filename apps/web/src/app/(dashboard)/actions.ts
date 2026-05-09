'use server'

import { redirect } from 'next/navigation'

import { getServerSupabase } from '@/lib/supabase/server'

export async function signOutAction() {
  try {
    const supabase = await getServerSupabase()
    await supabase.auth.signOut()
  } catch {
    // If env isn't configured the user has no session anyway; fall through.
  }
  redirect('/login')
}

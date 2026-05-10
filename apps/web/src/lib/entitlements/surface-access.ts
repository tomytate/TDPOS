import 'server-only'

import {
  SURFACE_LABELS,
  getMinimumTierForSurface,
  getTierDefinition,
  type TierSurface,
} from '@tdpos/shared'

import { getServerSupabase } from '@/lib/supabase/server'

export type SurfaceAccessFailureReason =
  | 'supabase_unconfigured'
  | 'unauthenticated'
  | 'query_failed'
  | 'tier_locked'
  | 'limit_exceeded'

export type SurfaceAccessResult =
  | { ok: true }
  | {
      ok: false
      reason: SurfaceAccessFailureReason
      status: 401 | 403 | 502 | 503
      message: string
    }

export function describeSurfaceUnlock(surface: TierSurface): string {
  const surfaceMeta = SURFACE_LABELS[surface]
  const requiredTier = getTierDefinition(getMinimumTierForSurface(surface))
  return `${surfaceMeta.label} unlocks at ${requiredTier.publicName}.`
}

export async function checkSurfaceAccess(surface: TierSurface): Promise<SurfaceAccessResult> {
  let supabase: Awaited<ReturnType<typeof getServerSupabase>>
  try {
    supabase = await getServerSupabase()
  } catch {
    return {
      ok: false,
      reason: 'supabase_unconfigured',
      status: 503,
      message: 'Supabase is not configured.',
    }
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  if (claimsError || !claimsData?.claims) {
    return {
      ok: false,
      reason: 'unauthenticated',
      status: 401,
      message: 'Sign in to continue.',
    }
  }

  const { data, error } = await supabase.rpc('current_business_can_use_surface', {
    p_surface: surface,
  })

  if (error) {
    return {
      ok: false,
      reason: 'query_failed',
      status: 502,
      message: error.message,
    }
  }

  if (data !== true) {
    return {
      ok: false,
      reason: 'tier_locked',
      status: 403,
      message: describeSurfaceUnlock(surface),
    }
  }

  return { ok: true }
}

type LimitName = 'products' | 'branches' | 'users'
type CountedTable = 'products' | 'branches' | 'users'

export async function checkInsertLimit(params: {
  table: CountedTable
  limit: LimitName
}): Promise<SurfaceAccessResult> {
  let supabase: Awaited<ReturnType<typeof getServerSupabase>>
  try {
    supabase = await getServerSupabase()
  } catch {
    return {
      ok: false,
      reason: 'supabase_unconfigured',
      status: 503,
      message: 'Supabase is not configured.',
    }
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  if (claimsError || !claimsData?.claims) {
    return {
      ok: false,
      reason: 'unauthenticated',
      status: 401,
      message: 'Sign in to continue.',
    }
  }

  const { data: businessId, error: businessError } = await supabase.rpc('current_business_id')
  if (businessError || !businessId) {
    return {
      ok: false,
      reason: 'query_failed',
      status: 502,
      message: businessError?.message ?? 'No business found for this user.',
    }
  }

  const { count, error: countError } = await supabase
    .from(params.table)
    .select('id', { count: 'exact', head: true })

  if (countError) {
    return {
      ok: false,
      reason: 'query_failed',
      status: 502,
      message: countError.message,
    }
  }

  const requestedCount = (count ?? 0) + 1
  const { error: limitError } = await supabase.rpc('assert_business_limit', {
    p_business_id: businessId,
    p_limit_name: params.limit,
    p_requested_count: requestedCount,
  })

  if (limitError) {
    return {
      ok: false,
      reason: limitError.message.startsWith('limit_exceeded:') ? 'limit_exceeded' : 'query_failed',
      status: limitError.message.startsWith('limit_exceeded:') ? 403 : 502,
      message: limitError.message,
    }
  }

  return { ok: true }
}

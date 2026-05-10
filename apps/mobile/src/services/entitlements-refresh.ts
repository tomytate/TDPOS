import { useAuthStore } from '@/stores/auth-store'
import {
  normalizeSubscriptionTier,
  resolveTierModuleState,
  type ModuleName,
  type SubscriptionTier,
} from '@tdpos/shared'

interface SupabaseEntitlementsRow {
  subscription_tier: string | null
  module_state: Record<string, boolean> | null
  entitlements_valid_until: string | null
}

interface MaybeSingleResult {
  maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }>
}

export interface SupabaseEntitlementsClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): MaybeSingleResult
    }
  }
}

export type EntitlementsRefreshOutcome =
  | {
      ok: true
      subscriptionTier: SubscriptionTier
      modules: Record<ModuleName, boolean>
      entitlementsValidUntil: string | null
    }
  | {
      ok: false
      reason: 'signed_out' | 'query_failed' | 'business_not_found'
      message?: string
    }

export async function refreshEntitlementsFromSupabase(params: {
  supabase: SupabaseEntitlementsClient
  businessId?: string | null
}): Promise<EntitlementsRefreshOutcome> {
  const businessId = params.businessId ?? useAuthStore.getState().businessId
  if (!businessId) return { ok: false, reason: 'signed_out' }

  const { data, error } = await params.supabase
    .from('businesses')
    .select('subscription_tier, module_state, entitlements_valid_until')
    .eq('id', businessId)
    .maybeSingle()

  if (error) return { ok: false, reason: 'query_failed', message: error.message }
  if (!data) return { ok: false, reason: 'business_not_found' }

  const row = data as SupabaseEntitlementsRow
  const subscriptionTier = normalizeSubscriptionTier(row.subscription_tier)
  const modules = resolveTierModuleState(subscriptionTier, row.module_state)
  const entitlementsValidUntil = row.entitlements_valid_until ?? null

  useAuthStore.getState().setEntitlements({
    subscriptionTier,
    modules,
    entitlementsValidUntil,
  })

  return {
    ok: true,
    subscriptionTier,
    modules,
    entitlementsValidUntil,
  }
}

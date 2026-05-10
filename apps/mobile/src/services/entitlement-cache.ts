import { isTierSurfaceEnabled, type SubscriptionTier, type TierSurface } from '@tdpos/shared'

const ENTITLEMENT_STALE_GRACE_MS = 7 * 24 * 60 * 60 * 1000

export type EntitlementCacheStatus =
  | {
      status: 'fresh'
      managerSurfacesAllowed: true
      message: string
    }
  | {
      status: 'stale' | 'unknown'
      managerSurfacesAllowed: false
      message: string
    }

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : null
}

export function getEntitlementCacheStatus(
  entitlementsValidUntil: string | null | undefined,
  now = Date.now(),
): EntitlementCacheStatus {
  const validUntil = parseTime(entitlementsValidUntil)

  if (validUntil === null) {
    return {
      status: 'unknown',
      managerSurfacesAllowed: false,
      message: 'No entitlement expiry is cached yet. Cashier sales remain available.',
    }
  }

  if (now <= validUntil + ENTITLEMENT_STALE_GRACE_MS) {
    return {
      status: 'fresh',
      managerSurfacesAllowed: true,
      message: 'Cached entitlements are fresh enough for owner and manager surfaces.',
    }
  }

  return {
    status: 'stale',
    managerSurfacesAllowed: false,
    message:
      'Cached entitlements are more than 7 days past their expiry. Reconnect to refresh owner and manager surfaces.',
  }
}

export function canUseMobileSurfaceFromCache(params: {
  tier: SubscriptionTier
  surface: TierSurface
  entitlementsValidUntil?: string | null
  now?: number
}): {
  allowed: boolean
  reason: 'allowed' | 'tier_locked' | 'entitlements_stale'
  cacheStatus: EntitlementCacheStatus
} {
  const { tier, surface, entitlementsValidUntil, now } = params
  const tierAllowsSurface = isTierSurfaceEnabled(tier, surface)
  const cacheStatus = getEntitlementCacheStatus(entitlementsValidUntil, now)

  if (!tierAllowsSurface) {
    return { allowed: false, reason: 'tier_locked', cacheStatus }
  }

  if (surface === 'mobile.tier_a_cashier') {
    return { allowed: true, reason: 'allowed', cacheStatus }
  }

  if (!cacheStatus.managerSurfacesAllowed) {
    return { allowed: false, reason: 'entitlements_stale', cacheStatus }
  }

  return { allowed: true, reason: 'allowed', cacheStatus }
}

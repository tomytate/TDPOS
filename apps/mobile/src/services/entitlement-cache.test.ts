import { describe, expect, test } from 'bun:test'

import { canUseMobileSurfaceFromCache, getEntitlementCacheStatus } from './entitlement-cache'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// getEntitlementCacheStatus
// ---------------------------------------------------------------------------

describe('getEntitlementCacheStatus', () => {
  test('returns unknown when no expiry is cached', () => {
    expect(getEntitlementCacheStatus(null).status).toBe('unknown')
    expect(getEntitlementCacheStatus(undefined).status).toBe('unknown')
    expect(getEntitlementCacheStatus(null).managerSurfacesAllowed).toBe(false)
  })

  test('returns fresh when within the 7-day grace period', () => {
    const validUntil = new Date(Date.now() + 60_000).toISOString()
    const result = getEntitlementCacheStatus(validUntil)
    expect(result.status).toBe('fresh')
    expect(result.managerSurfacesAllowed).toBe(true)
  })

  test('returns fresh when exactly at grace boundary', () => {
    const now = Date.now()
    const validUntil = new Date(now - SEVEN_DAYS_MS).toISOString()
    const result = getEntitlementCacheStatus(validUntil, now)
    expect(result.status).toBe('fresh')
  })

  test('returns stale when past the 7-day grace period', () => {
    const now = Date.now()
    const validUntil = new Date(now - SEVEN_DAYS_MS - 1).toISOString()
    const result = getEntitlementCacheStatus(validUntil, now)
    expect(result.status).toBe('stale')
    expect(result.managerSurfacesAllowed).toBe(false)
  })

  test('returns unknown for invalid date strings', () => {
    const result = getEntitlementCacheStatus('not-a-date')
    expect(result.status).toBe('unknown')
  })
})

// ---------------------------------------------------------------------------
// canUseMobileSurfaceFromCache
// ---------------------------------------------------------------------------

describe('canUseMobileSurfaceFromCache', () => {
  const freshExpiry = new Date(Date.now() + 86_400_000).toISOString()
  const staleExpiry = new Date(Date.now() - SEVEN_DAYS_MS - 60_000).toISOString()

  test('tier A cashier is always allowed regardless of cache status', () => {
    const result = canUseMobileSurfaceFromCache({
      tier: 'tier_a_free',
      surface: 'mobile.tier_a_cashier',
      entitlementsValidUntil: null,
    })
    expect(result.allowed).toBe(true)
    expect(result.reason).toBe('allowed')
  })

  test('tier-locked surface returns tier_locked', () => {
    const result = canUseMobileSurfaceFromCache({
      tier: 'tier_a_free',
      surface: 'mobile.hq_rollup',
      entitlementsValidUntil: freshExpiry,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('tier_locked')
  })

  test('paid surface with fresh entitlements is allowed', () => {
    const result = canUseMobileSurfaceFromCache({
      tier: 'tier_e_enterprise',
      surface: 'mobile.hq_rollup',
      entitlementsValidUntil: freshExpiry,
    })
    expect(result.allowed).toBe(true)
    expect(result.reason).toBe('allowed')
  })

  test('paid surface with stale entitlements fails closed', () => {
    const result = canUseMobileSurfaceFromCache({
      tier: 'tier_e_enterprise',
      surface: 'mobile.hq_rollup',
      entitlementsValidUntil: staleExpiry,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('entitlements_stale')
  })

  test('paid surface with no cached expiry fails closed', () => {
    const result = canUseMobileSurfaceFromCache({
      tier: 'tier_b_pro',
      surface: 'mobile.tablet_pos',
      entitlementsValidUntil: null,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('entitlements_stale')
  })
})

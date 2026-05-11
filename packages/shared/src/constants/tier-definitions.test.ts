import { describe, expect, test } from 'bun:test'

import {
  LEGACY_TIER_MAP,
  SUBSCRIPTION_TIERS,
  SURFACE_LABELS,
  TIER_A_FREE,
  TIER_DEFINITIONS,
  getLockedTierSurfaces,
  getMinimumTierForSurface,
  getTierDefinition,
  getTierModuleState,
  getTierSurfaces,
  getUnlockedTierSurfaces,
  isLegacySubscriptionTier,
  isSubscriptionTier,
  isTierSurfaceEnabled,
  normalizeSubscriptionTier,
} from '../constants/index'
import type { SubscriptionTier, TierSurface } from '../types/index'

// ---------------------------------------------------------------------------
// Tier definitions structural integrity
// ---------------------------------------------------------------------------

describe('TIER_DEFINITIONS', () => {
  test('defines exactly five canonical tiers', () => {
    expect(SUBSCRIPTION_TIERS).toEqual([
      'tier_a_free',
      'tier_b_pro',
      'tier_c_plus',
      'tier_d_premium',
      'tier_e_enterprise',
    ])
    expect(Object.keys(TIER_DEFINITIONS)).toHaveLength(5)
  })

  test('every tier has required structural fields', () => {
    for (const tier of SUBSCRIPTION_TIERS) {
      const def = TIER_DEFINITIONS[tier]
      expect(def.publicName).toBeTruthy()
      expect(def.shortLabel).toBeTruthy()
      expect(def.segment).toBeTruthy()
      expect(def.description).toBeTruthy()
      expect(def.uiSource).toBeTruthy()
      expect(def.uiMode).toBeTruthy()
      expect(typeof def.maxProducts === 'number' || def.maxProducts === null).toBe(true)
      expect(typeof def.maxDevices === 'number' || def.maxDevices === null).toBe(true)
      expect(typeof def.maxUsers === 'number' || def.maxUsers === null).toBe(true)
      expect(Array.isArray(def.surfaces)).toBe(true)
      expect(def.surfaces.length).toBeGreaterThan(0)
    }
  })

  test('tier A is the only free tier', () => {
    expect(TIER_DEFINITIONS.tier_a_free.pricePhpMonthly).toBe(0)
    for (const tier of SUBSCRIPTION_TIERS) {
      if (tier === 'tier_a_free') continue
      const price = TIER_DEFINITIONS[tier].pricePhpMonthly
      // Paid tiers are either a positive number or null (contact us)
      expect(price === null || price > 0).toBe(true)
    }
  })

  test('higher tiers unlock strictly more surfaces than lower tiers', () => {
    for (let i = 1; i < SUBSCRIPTION_TIERS.length; i++) {
      const prev = TIER_DEFINITIONS[SUBSCRIPTION_TIERS[i - 1]!].surfaces
      const curr = TIER_DEFINITIONS[SUBSCRIPTION_TIERS[i]!].surfaces
      expect(curr.length).toBeGreaterThanOrEqual(prev.length)
      // Every surface in the lower tier is also in the higher tier
      for (const surface of prev) {
        expect(curr).toContain(surface)
      }
    }
  })

  test('tier A price is zero, paid tiers have non-zero or null (contact us) prices', () => {
    expect(TIER_DEFINITIONS.tier_a_free.pricePhpMonthly).toBe(0)
    for (const tier of SUBSCRIPTION_TIERS) {
      if (tier === 'tier_a_free') continue
      const price = TIER_DEFINITIONS[tier].pricePhpMonthly
      expect(price === null || price > 0).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Legacy tier migration
// ---------------------------------------------------------------------------

describe('legacy tier migration', () => {
  test('LEGACY_TIER_MAP covers all six old values', () => {
    const legacyNames = ['free', 'starter', 'growth', 'pro', 'business', 'enterprise']
    for (const name of legacyNames) {
      expect(isLegacySubscriptionTier(name)).toBe(true)
      const mapped = LEGACY_TIER_MAP[name as keyof typeof LEGACY_TIER_MAP]
      expect(isSubscriptionTier(mapped)).toBe(true)
    }
  })

  test('normalizeSubscriptionTier resolves legacy values to canonical', () => {
    expect(normalizeSubscriptionTier('free')).toBe('tier_a_free')
    expect(normalizeSubscriptionTier('enterprise')).toBe('tier_e_enterprise')
    expect(normalizeSubscriptionTier('starter')).toBe('tier_b_pro')
  })

  test('normalizeSubscriptionTier passes canonical values through', () => {
    for (const tier of SUBSCRIPTION_TIERS) {
      expect(normalizeSubscriptionTier(tier)).toBe(tier)
    }
  })

  test('normalizeSubscriptionTier defaults null/unknown to tier_a_free', () => {
    expect(normalizeSubscriptionTier(null)).toBe(TIER_A_FREE)
    expect(normalizeSubscriptionTier(undefined)).toBe(TIER_A_FREE)
    expect(normalizeSubscriptionTier('nonexistent')).toBe(TIER_A_FREE)
  })
})

// ---------------------------------------------------------------------------
// Surface visibility and tier gating
// ---------------------------------------------------------------------------

describe('surface visibility', () => {
  test('every surface in SURFACE_LABELS belongs to a tier', () => {
    const allSurfaces = Object.keys(SURFACE_LABELS) as TierSurface[]
    for (const surface of allSurfaces) {
      const tier = getMinimumTierForSurface(surface)
      expect(isSubscriptionTier(tier)).toBe(true)
    }
  })

  test('tier A cashier is available on every tier', () => {
    for (const tier of SUBSCRIPTION_TIERS) {
      expect(isTierSurfaceEnabled(tier, 'mobile.tier_a_cashier')).toBe(true)
    }
  })

  test('tier E surfaces are only available on tier E', () => {
    const eSurfaces: TierSurface[] = [
      'mobile.hq_rollup',
      'mobile.self_service_kiosk',
      'mobile.returns_warranty',
    ]
    for (const surface of eSurfaces) {
      expect(isTierSurfaceEnabled('tier_a_free', surface)).toBe(false)
      expect(isTierSurfaceEnabled('tier_b_pro', surface)).toBe(false)
      expect(isTierSurfaceEnabled('tier_c_plus', surface)).toBe(false)
      expect(isTierSurfaceEnabled('tier_d_premium', surface)).toBe(false)
      expect(isTierSurfaceEnabled('tier_e_enterprise', surface)).toBe(true)
    }
  })

  test('getUnlockedTierSurfaces returns only surfaces accessible at the given tier', () => {
    const freeUnlocked = getUnlockedTierSurfaces('tier_a_free')
    expect(freeUnlocked.length).toBeGreaterThan(0)
    for (const surface of freeUnlocked) {
      expect(isTierSurfaceEnabled('tier_a_free', surface)).toBe(true)
    }
  })

  test('getLockedTierSurfaces returns only surfaces NOT accessible at the given tier', () => {
    const freeLocked = getLockedTierSurfaces('tier_a_free')
    for (const surface of freeLocked) {
      expect(isTierSurfaceEnabled('tier_a_free', surface)).toBe(false)
    }
  })

  test('tier E enterprise has the fewest locked surfaces', () => {
    const enterpriseLocked = getLockedTierSurfaces('tier_e_enterprise')
    // Tier E may still have marketing-only surfaces it doesn't list
    for (const other of SUBSCRIPTION_TIERS) {
      if (other === 'tier_e_enterprise') continue
      expect(getLockedTierSurfaces(other).length).toBeGreaterThanOrEqual(enterpriseLocked.length)
    }
  })

  test('getTierSurfaces filters by group', () => {
    const mobileSurfaces = getTierSurfaces('mobile')
    for (const surface of mobileSurfaces) {
      expect(SURFACE_LABELS[surface].group).toBe('mobile')
    }

    const webSurfaces = getTierSurfaces('web')
    for (const surface of webSurfaces) {
      expect(SURFACE_LABELS[surface].group).toBe('web')
    }
  })
})

// ---------------------------------------------------------------------------
// Module state derivation
// ---------------------------------------------------------------------------

describe('tier module state', () => {
  test('tier A has all modules disabled', () => {
    const modules = getTierModuleState('tier_a_free')
    for (const value of Object.values(modules)) {
      expect(value).toBe(false)
    }
  })

  test('higher tiers enable progressively more modules', () => {
    let prevCount = 0
    for (const tier of SUBSCRIPTION_TIERS) {
      const modules = getTierModuleState(tier)
      const enabledCount = Object.values(modules).filter(Boolean).length
      expect(enabledCount).toBeGreaterThanOrEqual(prevCount)
      prevCount = enabledCount
    }
  })

  test('getTierDefinition returns undefined for invalid tier', () => {
    const result = getTierDefinition('invalid' as SubscriptionTier)
    expect(result).toBeUndefined()
  })
})

---
name: tier-entitlement-gating
description: Use this skill when working on tier gates, surface access, module unlocks, subscription logic, upgrade flows, or entitlement caching. Every new feature must be gated by tier. The canonical tier definitions live in @tdpos/shared.
version: 1.0.0
---

# Tier Entitlement Gating

## ⚠️ CRITICAL RULE

**Never hardcode tier names, limits, or module unlocks.** Always read from `TIER_DEFINITIONS` in `packages/shared/src/constants/index.ts`. This is the single source of truth for mobile, web, Supabase, and marketing.

## The Five Canonical Tiers

```typescript
type TierKey = 'tier_a_free' | 'tier_b_pro' | 'tier_c_plus' | 'tier_d_premium' | 'tier_e_enterprise'
```

| Key | Public Name | Segment | Max Products | Max Branches | Max Users |
| --- | --- | --- | --- | --- | --- |
| `tier_a_free` | Tier A Free | Sari-sari / micro-stall | 50 | 1 | 1 |
| `tier_b_pro` | Tier B Pro | Mini-mart | 500 | 1 | 3 |
| `tier_c_plus` | Tier C Plus | Convenience | 2,000 | 3 | 10 |
| `tier_d_premium` | Tier D Premium | Supermarket | 10,000 | 5 | 25 |
| `tier_e_enterprise` | Tier E Enterprise | Mall chain | Unlimited | Unlimited | Unlimited |

## Module Unlock Matrix

| Module | A | B | C | D | E |
| --- | --- | --- | --- | --- | --- |
| Basic POS (cashier) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inventory (tingi) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Barcode scanner | ❌ | ✅ | ✅ | ✅ | ✅ |
| Shift management | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manager approvals | ❌ | ❌ | ✅ | ✅ | ✅ |
| Multi-branch | ❌ | ❌ | ✅ | ✅ | ✅ |
| Kiosk mode | ❌ | ❌ | ❌ | ❌ | ✅ |
| Returns management | ❌ | ❌ | ❌ | ❌ | ✅ |
| Weighted PLU | ❌ | ❌ | ❌ | ✅ | ✅ |
| Web dashboard | ❌ | ✅ | ✅ | ✅ | ✅ |
| PDF exports | ❌ | ✅ | ✅ | ✅ | ✅ |
| Utang (credit) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Customer loyalty | ❌ | ❌ | ✅ | ✅ | ✅ |

## How to Gate a Feature

### Mobile (Surface Gate)

```typescript
import { TIER_DEFINITIONS } from '@tdpos/shared'
import { useAuthStore } from '@/stores/auth-store'

const tier = useAuthStore((s) => s.tier) ?? 'tier_a_free'
const definition = TIER_DEFINITIONS[tier]

// Check module access
if (!definition.modules.includes('barcode_scanner')) {
  return <UpgradePrompt feature="Barcode Scanner" requiredTier="tier_b_pro" />
}

// Check numeric limits
if (productCount >= definition.limits.maxProducts) {
  return <LimitReachedBanner limit="products" />
}
```

### Web Dashboard (Route Gate)

```typescript
// In server component or proxy.ts
const claims = await getClaims()
const tier = claims?.user_metadata?.tier ?? 'tier_a_free'
const def = TIER_DEFINITIONS[tier]

if (!def.surfaces.includes('web.dashboard')) {
  redirect('/upgrade')
}
```

### Supabase (RPC Gate)

```sql
-- Inside RPC function
SELECT tier INTO STRICT v_tier
  FROM businesses
  WHERE id = (SELECT business_id FROM users WHERE id = auth.uid());

IF v_tier NOT IN ('tier_b_pro', 'tier_c_plus', 'tier_d_premium', 'tier_e_enterprise') THEN
  RAISE EXCEPTION 'Feature not available on current tier';
END IF;
```

## Entitlement Cache Strategy

- **Source of truth:** Supabase `businesses.tier` column
- **Cache:** MMKV on mobile, session on web
- **Grace period:** 7 days — if cache is stale beyond 7 days AND network is unavailable, **fail closed** (block paid surfaces)
- **Refresh:** On app foreground, on sync cycle, on explicit subscription change

## Legacy Tier Migration

Old subscription values (`free`, `starter`, `growth`, `pro`, `business`, `enterprise`) map to the new tiers via `LEGACY_TIER_MAP` in `@tdpos/shared`. The migration ran via Supabase migration `20260510000000_tier_normalization.sql`.

## Modules Are Default OFF

- Every opt-in module (utang, loyalty, kiosk, returns, PLU) is hidden in UI when disabled
- "Hidden" means the screen/tab/button does not render — NOT greyed out
- Upgrade prompts only appear when the user navigates to a gated route

## Sources

- Tier definitions: `packages/shared/src/constants/index.ts` (`TIER_DEFINITIONS`, `LEGACY_TIER_MAP`)
- Surface gate implementation: `apps/mobile/app/(app)/surfaces/[surface].tsx`
- Upgrade screen: `apps/mobile/app/(app)/upgrade.tsx`, `apps/mobile/app/(app)/subscription.tsx`
- Supabase migration: `supabase/migrations/20260510000000_tier_normalization.sql`, `supabase/migrations/20260510000001_entitlement_guards.sql`
- Architecture: [../architecture.md](../architecture.md) (ADR-016 Five Canonical Product Tiers)
- Last verified: 2026-05-15

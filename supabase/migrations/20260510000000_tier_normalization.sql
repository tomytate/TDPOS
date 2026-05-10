-- TD POS — 5-tier scaffold normalization
-- Replaces the legacy six-tier subscription names with the canonical five
-- (tier_a_free | tier_b_pro | tier_c_plus | tier_d_premium | tier_e_enterprise).
-- Adds per-tenant entitlement columns (module_state, expiry, hard limits).
-- Source-of-truth helpers live in `packages/shared/src/constants/index.ts`
-- (`SUBSCRIPTION_TIERS`, `TIER_DEFINITIONS`, `LEGACY_TIER_MAP`,
-- `normalizeSubscriptionTier`, `getTierModuleState`).
--
-- Idempotent: every step uses IF NOT EXISTS / DO blocks so re-running
-- against a partially-applied database is safe.

-- ============================================================
-- 1. Normalize legacy subscription_tier values onto the canonical 5
-- ============================================================
UPDATE businesses
SET subscription_tier = CASE subscription_tier
  WHEN 'free' THEN 'tier_a_free'
  WHEN 'starter' THEN 'tier_b_pro'
  WHEN 'pro' THEN 'tier_b_pro'
  WHEN 'growth' THEN 'tier_c_plus'
  WHEN 'business' THEN 'tier_d_premium'
  WHEN 'enterprise' THEN 'tier_e_enterprise'
  ELSE subscription_tier
END
WHERE subscription_tier IN ('free', 'starter', 'pro', 'growth', 'business', 'enterprise');

-- Anything still null or off-list collapses to tier_a_free so the check
-- constraint added below cannot fail on existing rows.
UPDATE businesses
SET subscription_tier = 'tier_a_free'
WHERE subscription_tier IS NULL
   OR subscription_tier NOT IN (
        'tier_a_free',
        'tier_b_pro',
        'tier_c_plus',
        'tier_d_premium',
        'tier_e_enterprise'
      );

-- New businesses default to tier_a_free.
ALTER TABLE businesses ALTER COLUMN subscription_tier SET DEFAULT 'tier_a_free';

-- ============================================================
-- 2. Constrain to the canonical 5 going forward
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_subscription_tier_check'
  ) THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_subscription_tier_check
      CHECK (subscription_tier IN (
        'tier_a_free',
        'tier_b_pro',
        'tier_c_plus',
        'tier_d_premium',
        'tier_e_enterprise'
      ));
  END IF;
END;
$$;

-- ============================================================
-- 3. Add tier-companion columns
-- ============================================================
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS module_state JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS entitlements_valid_until TIMESTAMPTZ;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS max_products INTEGER;
ALTER TABLE businesses ALTER COLUMN max_branches DROP NOT NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS max_devices INTEGER;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS max_users INTEGER;

-- ============================================================
-- 4. Backfill default limits per tier (only where currently null)
-- ----------------------------------------------------------------
-- Mirrors `TIER_DEFINITIONS[tier].max*` from `@tdpos/shared`. Values are
-- starting points only; per-tenant overrides set non-null values that
-- this migration deliberately preserves.
-- ============================================================
UPDATE businesses
SET
  max_products = COALESCE(max_products, 50),
  max_devices  = COALESCE(max_devices, 1),
  max_users    = COALESCE(max_users, 1),
  max_branches = COALESCE(max_branches, 1)
WHERE subscription_tier = 'tier_a_free';

UPDATE businesses
SET
  max_products = COALESCE(max_products, 500),
  max_devices  = COALESCE(max_devices, 3),
  max_users    = COALESCE(max_users, 5),
  max_branches = COALESCE(max_branches, 1)
WHERE subscription_tier = 'tier_b_pro';

UPDATE businesses
SET
  max_products = COALESCE(max_products, 5000),
  max_devices  = COALESCE(max_devices, 10),
  max_users    = COALESCE(max_users, 20),
  max_branches = COALESCE(max_branches, 3)
WHERE subscription_tier = 'tier_c_plus';

UPDATE businesses
SET
  max_products = COALESCE(max_products, 50000),
  max_devices  = COALESCE(max_devices, 50),
  max_users    = COALESCE(max_users, 100),
  max_branches = COALESCE(max_branches, 10)
WHERE subscription_tier = 'tier_d_premium';

-- tier_e_enterprise rows keep nulls = unlimited; only backfill if currently null.
-- (No-op if already set; no-op if currently null since unlimited is the intent.)

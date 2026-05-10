-- TD POS — Entitlement guard functions
-- Server-side scaffold for the five canonical tiers. UI gates are useful, but
-- future product/branch/user/module mutations need database-side checks too.
-- These functions mirror `TIER_DEFINITIONS` from @tdpos/shared and provide a
-- stable RPC surface for Server Actions, Edge Functions, and future pgTAP tests.

-- ============================================================
-- 1. Tier normalization + rank
-- ============================================================
CREATE OR REPLACE FUNCTION public.normalize_subscription_tier(p_value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_value
    WHEN 'tier_a_free' THEN 'tier_a_free'
    WHEN 'tier_b_pro' THEN 'tier_b_pro'
    WHEN 'tier_c_plus' THEN 'tier_c_plus'
    WHEN 'tier_d_premium' THEN 'tier_d_premium'
    WHEN 'tier_e_enterprise' THEN 'tier_e_enterprise'
    WHEN 'free' THEN 'tier_a_free'
    WHEN 'starter' THEN 'tier_b_pro'
    WHEN 'pro' THEN 'tier_b_pro'
    WHEN 'growth' THEN 'tier_c_plus'
    WHEN 'business' THEN 'tier_d_premium'
    WHEN 'enterprise' THEN 'tier_e_enterprise'
    ELSE 'tier_a_free'
  END;
$$;

CREATE OR REPLACE FUNCTION public.tier_rank(p_tier TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE public.normalize_subscription_tier(p_tier)
    WHEN 'tier_a_free' THEN 1
    WHEN 'tier_b_pro' THEN 2
    WHEN 'tier_c_plus' THEN 3
    WHEN 'tier_d_premium' THEN 4
    WHEN 'tier_e_enterprise' THEN 5
    ELSE 1
  END;
$$;

-- ============================================================
-- 2. Static tier capability maps
-- ============================================================
CREATE OR REPLACE FUNCTION public.tier_includes_module(p_tier TEXT, p_module TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_module
    WHEN 'utang' THEN public.tier_rank(p_tier) >= 2
    WHEN 'customer_sms' THEN public.tier_rank(p_tier) >= 2
    WHEN 'loyalty' THEN public.tier_rank(p_tier) >= 3
    WHEN 'supplier_management' THEN public.tier_rank(p_tier) >= 3
    WHEN 'multi_branch' THEN public.tier_rank(p_tier) >= 3
    WHEN 'payroll' THEN public.tier_rank(p_tier) >= 4
    WHEN 'accounting_integration' THEN public.tier_rank(p_tier) >= 4
    WHEN 'franchise_management' THEN public.tier_rank(p_tier) >= 5
    WHEN 'public_api' THEN public.tier_rank(p_tier) >= 5
    ELSE FALSE
  END;
$$;

CREATE OR REPLACE FUNCTION public.tier_includes_surface(p_tier TEXT, p_surface TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_surface
    WHEN 'mobile.tier_a_cashier' THEN public.tier_rank(p_tier) >= 1
    WHEN 'mobile.tablet_pos' THEN public.tier_rank(p_tier) >= 2
    WHEN 'mobile.owner_lanes' THEN public.tier_rank(p_tier) >= 2
    WHEN 'mobile.shift_login' THEN public.tier_rank(p_tier) >= 2
    WHEN 'mobile.shift_handoff' THEN public.tier_rank(p_tier) >= 2
    WHEN 'mobile.convenience_counter' THEN public.tier_rank(p_tier) >= 3
    WHEN 'mobile.manager_phone' THEN public.tier_rank(p_tier) >= 3
    WHEN 'mobile.supermarket_counter' THEN public.tier_rank(p_tier) >= 4
    WHEN 'mobile.customer_display' THEN public.tier_rank(p_tier) >= 4
    WHEN 'mobile.backoffice_audit' THEN public.tier_rank(p_tier) >= 4
    WHEN 'mobile.weighted_plu' THEN public.tier_rank(p_tier) >= 4
    WHEN 'mobile.hq_rollup' THEN public.tier_rank(p_tier) >= 5
    WHEN 'mobile.self_service_kiosk' THEN public.tier_rank(p_tier) >= 5
    WHEN 'mobile.returns_warranty' THEN public.tier_rank(p_tier) >= 5
    WHEN 'web.overview' THEN public.tier_rank(p_tier) >= 1
    WHEN 'web.products' THEN public.tier_rank(p_tier) >= 2
    WHEN 'web.users' THEN public.tier_rank(p_tier) >= 2
    WHEN 'web.devices' THEN public.tier_rank(p_tier) >= 2
    WHEN 'web.modules' THEN public.tier_rank(p_tier) >= 2
    WHEN 'web.audit' THEN public.tier_rank(p_tier) >= 2
    WHEN 'web.branches' THEN public.tier_rank(p_tier) >= 3
    WHEN 'web.sync' THEN public.tier_rank(p_tier) >= 3
    WHEN 'web.exports' THEN public.tier_rank(p_tier) >= 3
    WHEN 'web.hq' THEN public.tier_rank(p_tier) >= 5
    WHEN 'marketing.pricing' THEN TRUE
    ELSE FALSE
  END;
$$;

-- ============================================================
-- 3. Current tenant entitlement checks
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_business_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT business_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_business_can_use_surface(p_surface TEXT)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_subscription_tier TEXT;
  v_entitlements_valid_until TIMESTAMPTZ;
BEGIN
  SELECT b.subscription_tier, b.entitlements_valid_until
  INTO v_subscription_tier, v_entitlements_valid_until
  FROM public.businesses b
  WHERE b.id = public.current_business_id()
  LIMIT 1;

  IF v_subscription_tier IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_entitlements_valid_until IS NOT NULL AND v_entitlements_valid_until < now() THEN
    RETURN public.tier_includes_surface('tier_a_free', p_surface);
  END IF;

  RETURN public.tier_includes_surface(v_subscription_tier, p_surface);
END;
$$;

CREATE OR REPLACE FUNCTION public.current_business_can_use_module(p_module TEXT)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_subscription_tier TEXT;
  v_module_state JSONB;
  v_entitlements_valid_until TIMESTAMPTZ;
  v_tier_unlocked BOOLEAN;
  v_override BOOLEAN;
BEGIN
  SELECT b.subscription_tier, b.module_state, b.entitlements_valid_until
  INTO v_subscription_tier, v_module_state, v_entitlements_valid_until
  FROM public.businesses b
  WHERE b.id = public.current_business_id()
  LIMIT 1;

  IF v_subscription_tier IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_entitlements_valid_until IS NOT NULL AND v_entitlements_valid_until < now() THEN
    RETURN FALSE;
  END IF;

  v_tier_unlocked := public.tier_includes_module(v_subscription_tier, p_module);
  IF NOT v_tier_unlocked THEN
    RETURN FALSE;
  END IF;

  IF v_module_state IS NOT NULL AND v_module_state ? p_module THEN
    IF jsonb_typeof(v_module_state -> p_module) <> 'boolean' THEN
      RETURN FALSE;
    END IF;

    v_override := (v_module_state ->> p_module)::BOOLEAN;
    RETURN v_override AND v_tier_unlocked;
  END IF;

  RETURN v_tier_unlocked;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_business_entitlement_snapshot()
RETURNS TABLE (
  subscription_tier TEXT,
  module_state JSONB,
  entitlements_valid_until TIMESTAMPTZ,
  max_products INTEGER,
  max_branches INTEGER,
  max_devices INTEGER,
  max_users INTEGER
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT
    public.normalize_subscription_tier(b.subscription_tier),
    b.module_state,
    b.entitlements_valid_until,
    b.max_products,
    b.max_branches,
    b.max_devices,
    b.max_users
  FROM public.businesses b
  WHERE b.id = public.current_business_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_business_entitlements(p_business_id UUID)
RETURNS TABLE (
  subscription_tier TEXT,
  module_state JSONB,
  entitlements_valid_until TIMESTAMPTZ,
  max_products INTEGER,
  max_branches INTEGER,
  max_devices INTEGER,
  max_users INTEGER
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT
    public.normalize_subscription_tier(b.subscription_tier),
    b.module_state,
    b.entitlements_valid_until,
    b.max_products,
    b.max_branches,
    b.max_devices,
    b.max_users
  FROM public.businesses b
  WHERE b.id = p_business_id
    AND b.id = public.current_business_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.business_limit_value(p_business_id UUID, p_limit_name TEXT)
RETURNS INTEGER
LANGUAGE PLPGSQL
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  SELECT CASE p_limit_name
    WHEN 'products' THEN b.max_products
    WHEN 'branches' THEN b.max_branches
    WHEN 'devices' THEN b.max_devices
    WHEN 'users' THEN b.max_users
    ELSE NULL
  END
  INTO v_limit
  FROM public.businesses b
  WHERE b.id = p_business_id
    AND b.id = public.current_business_id()
  LIMIT 1;

  IF p_limit_name NOT IN ('products', 'branches', 'devices', 'users') THEN
    RAISE EXCEPTION 'unknown_limit:%', p_limit_name;
  END IF;

  RETURN v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_business_limit(
  p_business_id UUID,
  p_limit_name TEXT,
  p_requested_count INTEGER
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
SECURITY INVOKER
AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  IF p_requested_count < 0 THEN
    RAISE EXCEPTION 'invalid_requested_count:%', p_requested_count;
  END IF;

  v_limit := public.business_limit_value(p_business_id, p_limit_name);

  IF v_limit IS NULL THEN
    RETURN TRUE;
  END IF;

  IF p_requested_count <= v_limit THEN
    RETURN TRUE;
  END IF;

  RAISE EXCEPTION 'limit_exceeded:%:%:%', p_limit_name, p_requested_count, v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_subscription_tier(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tier_rank(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tier_includes_module(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tier_includes_surface(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_business_can_use_surface(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_business_can_use_module(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_business_entitlement_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_entitlements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_limit_value(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_business_limit(UUID, TEXT, INTEGER) TO authenticated;

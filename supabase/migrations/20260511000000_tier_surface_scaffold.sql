-- TD POS — Paid-tier surface scaffold tables
--
-- These tables lay the backend shape for Tier B-E workflows without turning
-- them into production workflows yet. Every table is tenant-scoped by
-- business_id and protected by the same auth.uid() -> users.business_id RLS
-- pattern as the foundation schema.

-- ============================================================
-- DEVICES / LANES
-- ============================================================
CREATE TABLE IF NOT EXISTS business_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID REFERENCES branches(id),
  install_id TEXT NOT NULL,
  device_name TEXT,
  surface TEXT NOT NULL DEFAULT 'mobile.tier_a_cashier',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lost')),
  last_seen_at TIMESTAMPTZ,
  entitlement_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  sync_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, install_id)
);

ALTER TABLE business_devices ADD COLUMN IF NOT EXISTS sync_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE INDEX IF NOT EXISTS idx_business_devices_branch
  ON business_devices(business_id, branch_id, status);

CREATE OR REPLACE FUNCTION public.enforce_business_device_limit()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
DECLARE
  v_limit INTEGER;
  v_existing_count INTEGER;
BEGIN
  SELECT max_devices
  INTO v_limit
  FROM businesses
  WHERE id = NEW.business_id;

  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO v_existing_count
  FROM business_devices
  WHERE business_id = NEW.business_id
    AND install_id <> NEW.install_id
    AND status <> 'lost';

  IF v_existing_count >= v_limit THEN
    RAISE EXCEPTION 'limit_exceeded:devices:%:%', v_existing_count + 1, v_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_devices_limit_guard ON business_devices;

CREATE TRIGGER business_devices_limit_guard
  BEFORE INSERT ON business_devices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_business_device_limit();

-- ============================================================
-- SHIFT SESSIONS / HANDOFF
-- ============================================================
CREATE TABLE IF NOT EXISTS shift_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  user_id UUID REFERENCES users(id),
  device_id UUID REFERENCES business_devices(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'voided')),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_cash NUMERIC NOT NULL DEFAULT 0,
  expected_cash NUMERIC,
  counted_cash NUMERIC,
  variance NUMERIC,
  handoff_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_sessions_open
  ON shift_sessions(business_id, branch_id, status, opened_at DESC);

-- ============================================================
-- MANAGER APPROVALS
-- ============================================================
CREATE TABLE IF NOT EXISTS manager_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID REFERENCES branches(id),
  requested_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  surface TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'expired')),
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_manager_approvals_pending
  ON manager_approval_requests(business_id, status, created_at DESC);

-- ============================================================
-- WEIGHTED PLU PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS weighted_plu_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  product_id UUID NOT NULL REFERENCES products(id),
  plu_code TEXT NOT NULL,
  unit_label TEXT NOT NULL DEFAULT 'kg',
  price_basis TEXT NOT NULL DEFAULT 'per_kg' CHECK (price_basis IN ('per_kg', 'per_gram')),
  tare_grams INTEGER NOT NULL DEFAULT 0,
  rounding_mode TEXT NOT NULL DEFAULT 'nearest_centavo'
    CHECK (rounding_mode IN ('nearest_centavo', 'up_centavo', 'down_centavo')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, plu_code)
);

CREATE INDEX IF NOT EXISTS idx_weighted_plu_profiles_product
  ON weighted_plu_profiles(business_id, product_id, is_active);

-- ============================================================
-- SELF-SERVICE KIOSK ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS kiosk_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  device_id UUID REFERENCES business_devices(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'awaiting_staff', 'confirmed', 'cancelled')),
  customer_label TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kiosk_orders_status
  ON kiosk_orders(business_id, branch_id, status, created_at DESC);

-- ============================================================
-- RETURNS / WARRANTY REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  original_sale_id UUID REFERENCES sales(id),
  compensating_sale_id UUID REFERENCES sales(id),
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'completed')),
  reason_code TEXT NOT NULL,
  reason_note TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_return_requests_status
  ON return_requests(business_id, branch_id, status, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE business_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business_devices_select" ON business_devices;
CREATE POLICY "business_devices_select" ON business_devices FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "business_devices_insert" ON business_devices;
CREATE POLICY "business_devices_insert" ON business_devices FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "business_devices_update" ON business_devices;
CREATE POLICY "business_devices_update" ON business_devices FOR UPDATE
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()))
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

ALTER TABLE shift_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shift_sessions_select" ON shift_sessions;
CREATE POLICY "shift_sessions_select" ON shift_sessions FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "shift_sessions_insert" ON shift_sessions;
CREATE POLICY "shift_sessions_insert" ON shift_sessions FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "shift_sessions_update" ON shift_sessions;
CREATE POLICY "shift_sessions_update" ON shift_sessions FOR UPDATE
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()))
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

ALTER TABLE manager_approval_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manager_approval_requests_select" ON manager_approval_requests;
CREATE POLICY "manager_approval_requests_select" ON manager_approval_requests FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "manager_approval_requests_insert" ON manager_approval_requests;
CREATE POLICY "manager_approval_requests_insert" ON manager_approval_requests FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "manager_approval_requests_update" ON manager_approval_requests;
CREATE POLICY "manager_approval_requests_update" ON manager_approval_requests FOR UPDATE
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()))
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

ALTER TABLE weighted_plu_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weighted_plu_profiles_select" ON weighted_plu_profiles;
CREATE POLICY "weighted_plu_profiles_select" ON weighted_plu_profiles FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "weighted_plu_profiles_insert" ON weighted_plu_profiles;
CREATE POLICY "weighted_plu_profiles_insert" ON weighted_plu_profiles FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "weighted_plu_profiles_update" ON weighted_plu_profiles;
CREATE POLICY "weighted_plu_profiles_update" ON weighted_plu_profiles FOR UPDATE
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()))
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

ALTER TABLE kiosk_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kiosk_orders_select" ON kiosk_orders;
CREATE POLICY "kiosk_orders_select" ON kiosk_orders FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "kiosk_orders_insert" ON kiosk_orders;
CREATE POLICY "kiosk_orders_insert" ON kiosk_orders FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "kiosk_orders_update" ON kiosk_orders;
CREATE POLICY "kiosk_orders_update" ON kiosk_orders FOR UPDATE
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()))
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "return_requests_select" ON return_requests;
CREATE POLICY "return_requests_select" ON return_requests FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "return_requests_insert" ON return_requests;
CREATE POLICY "return_requests_insert" ON return_requests FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
DROP POLICY IF EXISTS "return_requests_update" ON return_requests;
CREATE POLICY "return_requests_update" ON return_requests FOR UPDATE
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()))
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

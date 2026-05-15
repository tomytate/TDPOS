-- TD POS — Device pairing codes
--
-- Web owners/managers issue a short-lived code from the Devices page; a
-- signed-in mobile app consumes it to bind the local install id to a branch,
-- cashier code, and mobile surface. The code itself is never stored, only a
-- SHA-256 hash plus a last-4 hint for the dashboard.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS device_pairing_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  created_by UUID REFERENCES users(id),
  pairing_code_hash TEXT NOT NULL,
  pairing_code_last4 TEXT NOT NULL,
  branch_code TEXT NOT NULL CHECK (branch_code ~ '^[A-Z0-9]{3,5}$'),
  cashier_code TEXT NOT NULL CHECK (cashier_code ~ '^[A-Z0-9]{2,5}$'),
  device_name TEXT,
  surface TEXT NOT NULL DEFAULT 'mobile.tier_a_cashier',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'consumed', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 minutes',
  consumed_by UUID REFERENCES users(id),
  consumed_install_id TEXT,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_pairing_codes_business_status
  ON device_pairing_codes(business_id, status, expires_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_pairing_codes_active_hash
  ON device_pairing_codes(business_id, pairing_code_hash)
  WHERE status = 'active';

ALTER TABLE device_pairing_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_pairing_codes_select" ON device_pairing_codes;
CREATE POLICY "device_pairing_codes_select" ON device_pairing_codes FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "device_pairing_codes_insert" ON device_pairing_codes;
CREATE POLICY "device_pairing_codes_insert" ON device_pairing_codes FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "device_pairing_codes_update" ON device_pairing_codes;
CREATE POLICY "device_pairing_codes_update" ON device_pairing_codes FOR UPDATE
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()))
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION public.consume_device_pairing_code(
  p_pairing_code TEXT,
  p_install_id TEXT
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_business_id UUID;
  v_normalized_code TEXT;
  v_hash TEXT;
  v_code device_pairing_codes%ROWTYPE;
  v_branch branches%ROWTYPE;
  v_limit INTEGER;
  v_device_count INTEGER;
  v_existing_device BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT business_id INTO v_business_id
  FROM users
  WHERE id = v_uid
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'account_not_provisioned');
  END IF;

  v_normalized_code := regexp_replace(upper(coalesce(p_pairing_code, '')), '[^A-Z0-9]', '', 'g');
  IF length(v_normalized_code) < 8 OR length(v_normalized_code) > 16 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  UPDATE device_pairing_codes
  SET status = 'expired'
  WHERE business_id = v_business_id
    AND status = 'active'
    AND expires_at <= now();

  v_hash := encode(digest(v_normalized_code, 'sha256'), 'hex');

  SELECT * INTO v_code
  FROM device_pairing_codes
  WHERE business_id = v_business_id
    AND pairing_code_hash = v_hash
    AND status = 'active'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF NOT public.tier_includes_surface(
    (SELECT subscription_tier FROM businesses WHERE id = v_business_id),
    v_code.surface
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'surface_locked');
  END IF;

  SELECT * INTO v_branch
  FROM branches
  WHERE id = v_code.branch_id
    AND business_id = v_business_id
    AND is_active = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'branch_unavailable');
  END IF;

  SELECT max_devices INTO v_limit
  FROM businesses
  WHERE id = v_business_id;

  SELECT EXISTS (
    SELECT 1 FROM business_devices
    WHERE business_id = v_business_id
      AND install_id = p_install_id
  ) INTO v_existing_device;

  IF v_limit IS NOT NULL AND NOT v_existing_device THEN
    SELECT COUNT(*)::INTEGER INTO v_device_count
    FROM business_devices
    WHERE business_id = v_business_id
      AND status <> 'lost';

    IF v_device_count + 1 > v_limit THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'limit_exceeded',
        'requested', v_device_count + 1,
        'limit', v_limit
      );
    END IF;
  END IF;

  UPDATE device_pairing_codes
  SET
    status = 'consumed',
    consumed_by = v_uid,
    consumed_install_id = p_install_id,
    consumed_at = now()
  WHERE id = v_code.id;

  RETURN jsonb_build_object(
    'ok', true,
    'pairing_code_id', v_code.id,
    'branch_id', v_branch.id,
    'branch_name', v_branch.name,
    'branch_code', v_code.branch_code,
    'cashier_code', v_code.cashier_code,
    'device_name', v_code.device_name,
    'surface', v_code.surface
  );
END
$$;

GRANT EXECUTE ON FUNCTION public.consume_device_pairing_code(TEXT, TEXT) TO authenticated;

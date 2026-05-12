-- TD POS - Customer PII erasure scaffold
--
-- Customer rows can be linked from sales, payments, and future loyalty/utang
-- flows, so privacy erasure must not delete the row. This migration adds a
-- tenant-scoped RPC that blanks customer PII while retaining the stable
-- customer id for historical transaction references.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS pii_erased BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS erased_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS erased_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS erasure_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_erased
  ON customers (business_id, erased_at)
  WHERE erased_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.erase_customer_pii(
  p_customer_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_business_id UUID;
  v_role TEXT;
  v_customer customers%ROWTYPE;
  v_reason TEXT := NULLIF(BTRIM(COALESCE(p_reason, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'unauthenticated');
  END IF;

  SELECT u.business_id, u.role
  INTO v_business_id, v_role
  FROM users u
  WHERE u.id = v_uid
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'account_not_provisioned');
  END IF;

  IF v_role NOT IN ('owner', 'manager') THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'forbidden');
  END IF;

  SELECT *
  INTO v_customer
  FROM customers c
  WHERE c.id = p_customer_id
    AND c.business_id = v_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'not_found');
  END IF;

  IF v_customer.pii_erased OR v_customer.erased_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', TRUE,
      'customer_id', p_customer_id,
      'erased', TRUE,
      'already_erased', TRUE
    );
  END IF;

  UPDATE customers
  SET
    name = 'Erased customer',
    phone = NULL,
    barangay = NULL,
    points_balance = 0,
    total_utang = 0,
    pii_erased = TRUE,
    erased_at = now(),
    erased_by = v_uid,
    erasure_reason = v_reason
  WHERE id = p_customer_id
    AND business_id = v_business_id;

  INSERT INTO audit_logs (
    business_id,
    user_id,
    action,
    resource_type,
    resource_id,
    before,
    after
  )
  VALUES (
    v_business_id,
    v_uid,
    'customer.pii_erased',
    'customer',
    p_customer_id,
    jsonb_build_object(
      'pii_erased', FALSE,
      'had_phone', v_customer.phone IS NOT NULL,
      'had_barangay', v_customer.barangay IS NOT NULL,
      'had_points_balance', v_customer.points_balance <> 0,
      'had_utang_balance', v_customer.total_utang <> 0
    ),
    jsonb_build_object(
      'pii_erased', TRUE,
      'name_replaced', TRUE,
      'phone_cleared', TRUE,
      'barangay_cleared', TRUE,
      'balances_zeroed', TRUE,
      'reason_provided', v_reason IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'customer_id', p_customer_id,
    'erased', TRUE,
    'already_erased', FALSE
  );
END
$$;

GRANT EXECUTE ON FUNCTION public.erase_customer_pii(UUID, TEXT) TO authenticated;

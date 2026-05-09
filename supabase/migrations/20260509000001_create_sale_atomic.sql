-- TD POS — atomic remote sale creation (P6.4 hardening)
-- Creates the sale row and all sale_items in one Postgres transaction.
-- Inventory deltas remain separate `apply_inventory_delta` calls because they
-- have their own race-safe idempotency keys in applied_operations.

CREATE OR REPLACE FUNCTION create_sale_atomic(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_business UUID;
  v_sale_id UUID;
  v_client_operation_id UUID;
  v_business_id UUID;
  v_branch_id UUID;
  v_user_id UUID;
  v_customer_id UUID;
  v_receipt_number TEXT;
  v_expected_items INTEGER;
  v_existing_items INTEGER;
  v_existing_sale sales%ROWTYPE;
  v_item JSONB;
  v_product_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  SELECT business_id INTO v_user_business
  FROM users
  WHERE id = auth.uid();

  IF v_user_business IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'tenant_violation');
  END IF;

  v_client_operation_id := (p_payload ->> 'client_operation_id')::UUID;
  v_sale_id := (p_payload ->> 'sale_id')::UUID;
  v_business_id := COALESCE(NULLIF(p_payload ->> 'business_id', '')::UUID, v_user_business);
  v_branch_id := (p_payload ->> 'branch_id')::UUID;
  v_user_id := NULLIF(p_payload ->> 'user_id', '')::UUID;
  v_customer_id := NULLIF(p_payload ->> 'customer_id', '')::UUID;
  v_receipt_number := p_payload ->> 'receipt_number';
  v_expected_items := jsonb_array_length(p_payload -> 'items');
  v_created_at := to_timestamp((p_payload ->> 'device_local_time')::DOUBLE PRECISION);

  IF v_client_operation_id IS DISTINCT FROM v_sale_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sale_id_mismatch');
  END IF;

  IF v_business_id IS DISTINCT FROM v_user_business THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'tenant_violation');
  END IF;

  IF v_expected_items IS NULL OR v_expected_items < 1 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_sale_items');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM branches
    WHERE id = v_branch_id
      AND business_id = v_business_id
      AND is_active = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'tenant_violation');
  END IF;

  IF v_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = v_user_id
      AND business_id = v_business_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'tenant_violation');
  END IF;

  IF v_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM customers
    WHERE id = v_customer_id
      AND business_id = v_business_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'tenant_violation');
  END IF;

  SELECT * INTO v_existing_sale
  FROM sales
  WHERE id = v_sale_id;

  IF FOUND THEN
    IF v_existing_sale.business_id IS DISTINCT FROM v_business_id THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'tenant_violation');
    END IF;

    SELECT COUNT(*) INTO v_existing_items
    FROM sale_items
    WHERE sale_id = v_sale_id;

    IF v_existing_items IS DISTINCT FROM v_expected_items THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'sale_replay_mismatch');
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'replayed', true,
      'sale_id', v_existing_sale.id,
      'receipt_number', v_existing_sale.receipt_number
    );
  END IF;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_payload -> 'items')
  LOOP
    v_product_id := (v_item ->> 'product_id')::UUID;

    IF NOT EXISTS (
      SELECT 1
      FROM products
      WHERE id = v_product_id
        AND business_id = v_business_id
        AND is_active = true
    ) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'product_not_found');
    END IF;
  END LOOP;

  INSERT INTO sales (
    id,
    business_id,
    branch_id,
    user_id,
    customer_id,
    total_amount,
    payment_method,
    status,
    is_utang,
    utang_balance,
    receipt_number,
    created_at
  ) VALUES (
    v_sale_id,
    v_business_id,
    v_branch_id,
    v_user_id,
    v_customer_id,
    (p_payload ->> 'total_amount')::NUMERIC,
    p_payload ->> 'payment_method',
    'completed',
    (p_payload ->> 'is_utang')::BOOLEAN,
    NULLIF(p_payload ->> 'utang_balance', '')::NUMERIC,
    v_receipt_number,
    v_created_at
  );

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_payload -> 'items')
  LOOP
    INSERT INTO sale_items (
      id,
      sale_id,
      product_id,
      pieces_sold,
      was_sold_as,
      unit_price,
      discount,
      subtotal
    ) VALUES (
      (v_item ->> 'sale_item_id')::UUID,
      v_sale_id,
      (v_item ->> 'product_id')::UUID,
      (v_item ->> 'pieces_sold')::INTEGER,
      v_item ->> 'was_sold_as',
      (v_item ->> 'unit_price')::NUMERIC,
      0,
      (v_item ->> 'subtotal')::NUMERIC
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'sale_id', v_sale_id,
    'receipt_number', v_receipt_number
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing_sale
    FROM sales
    WHERE id = v_sale_id;

    IF FOUND AND v_existing_sale.business_id IS NOT DISTINCT FROM v_business_id THEN
      RETURN jsonb_build_object(
        'ok', true,
        'replayed', true,
        'sale_id', v_existing_sale.id,
        'receipt_number', v_existing_sale.receipt_number
      );
    END IF;

    RETURN jsonb_build_object('ok', false, 'reason', 'unique_violation');
END;
$$;

GRANT EXECUTE ON FUNCTION create_sale_atomic(JSONB) TO authenticated;

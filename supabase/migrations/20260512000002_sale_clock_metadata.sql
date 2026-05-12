-- TD POS - Sale clock metadata scaffold
--
-- Captures the device wall-clock context that produced each receipt date.
-- `created_at` remains the local device sale time because offline receipt
-- numbers are date-namespaced by the cashier device. `received_at` records
-- the server insertion time so future reports can detect clock skew.

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS device_timezone TEXT,
  ADD COLUMN IF NOT EXISTS synced_server_time_at_last_handshake TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION prevent_sales_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'sales rows are immutable: DELETE not allowed';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.business_id IS DISTINCT FROM OLD.business_id
       OR NEW.branch_id IS DISTINCT FROM OLD.branch_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.is_utang IS DISTINCT FROM OLD.is_utang
       OR NEW.utang_balance IS DISTINCT FROM OLD.utang_balance
       OR NEW.receipt_number IS DISTINCT FROM OLD.receipt_number
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.device_timezone IS DISTINCT FROM OLD.device_timezone
       OR NEW.synced_server_time_at_last_handshake IS DISTINCT FROM OLD.synced_server_time_at_last_handshake
       OR NEW.received_at IS DISTINCT FROM OLD.received_at
    THEN
      RAISE EXCEPTION 'sales rows are immutable: only synced_at may change';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_immutability ON sales;
CREATE TRIGGER sales_immutability
  BEFORE UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION prevent_sales_mutation();

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
  v_device_timezone TEXT;
  v_last_handshake_at TIMESTAMPTZ;
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
  v_device_timezone := NULLIF(BTRIM(COALESCE(p_payload ->> 'device_timezone', '')), '');

  IF NULLIF(p_payload ->> 'synced_server_time_at_last_handshake', '') IS NOT NULL THEN
    v_last_handshake_at := (p_payload ->> 'synced_server_time_at_last_handshake')::TIMESTAMPTZ;
  END IF;

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
    created_at,
    device_timezone,
    synced_server_time_at_last_handshake,
    received_at
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
    v_created_at,
    v_device_timezone,
    v_last_handshake_at,
    now()
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

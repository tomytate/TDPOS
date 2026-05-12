-- TD POS - Inventory adjustment reason scaffold
--
-- Keeps physical stock takes on the same idempotent inventory-delta rail as
-- sales while separating the audit log type (`adjustment`) from the
-- manager-entered adjustment reason (`damage`, `expiry`, etc.).

DROP FUNCTION IF EXISTS apply_inventory_delta(UUID, UUID, UUID, INTEGER, TEXT, UUID);

CREATE OR REPLACE FUNCTION apply_inventory_delta(
  p_client_operation_id UUID,
  p_product_id UUID,
  p_branch_id UUID,
  p_delta INTEGER,
  p_reason TEXT DEFAULT 'sale',
  p_sale_id UUID DEFAULT NULL,
  p_log_type TEXT DEFAULT NULL,
  p_reason_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_user_business UUID;
  v_won_race BOOLEAN := false;
  v_new_stock INTEGER;
  v_existing_status TEXT;
  v_existing_result JSONB;
  v_result JSONB;
  v_log_type TEXT;
  v_reason TEXT;
  v_reason_note TEXT;
  v_reason_text TEXT;
BEGIN
  SELECT business_id INTO v_user_business FROM users WHERE id = auth.uid();
  SELECT business_id INTO v_business_id FROM products WHERE id = p_product_id;

  IF v_user_business IS NULL OR v_user_business IS DISTINCT FROM v_business_id THEN
    RAISE EXCEPTION 'tenant_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM branches
    WHERE id = p_branch_id
      AND business_id = v_business_id
  ) THEN
    RAISE EXCEPTION 'tenant_violation';
  END IF;

  v_reason := COALESCE(NULLIF(BTRIM(p_reason), ''), 'sale');
  v_reason_note := NULLIF(BTRIM(COALESCE(p_reason_note, '')), '');
  v_log_type := COALESCE(
    NULLIF(BTRIM(COALESCE(p_log_type, '')), ''),
    CASE
      WHEN v_reason IN ('sale', 'stock_in', 'transfer') THEN v_reason
      ELSE 'adjustment'
    END
  );

  IF v_log_type NOT IN ('stock_in', 'sale', 'adjustment', 'transfer') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_inventory_log_type');
  END IF;

  v_reason_text := CASE
    WHEN v_reason_note IS NULL THEN v_reason
    ELSE v_reason || ': ' || v_reason_note
  END;

  INSERT INTO applied_operations (business_id, client_operation_id, status, applied_at)
  VALUES (v_business_id, p_client_operation_id, 'in_progress', now())
  ON CONFLICT (business_id, client_operation_id) DO NOTHING
  RETURNING true INTO v_won_race;

  IF NOT COALESCE(v_won_race, false) THEN
    SELECT status, result INTO v_existing_status, v_existing_result
    FROM applied_operations
    WHERE business_id = v_business_id AND client_operation_id = p_client_operation_id;

    IF v_existing_status = 'completed' OR v_existing_status = 'failed' THEN
      RETURN v_existing_result || jsonb_build_object('replayed', true);
    ELSE
      RETURN jsonb_build_object('ok', false, 'reason', 'concurrent_in_progress', 'retry_after_ms', 500);
    END IF;
  END IF;

  UPDATE products
    SET stock_pieces = stock_pieces + p_delta
    WHERE id = p_product_id AND stock_pieces + p_delta >= 0
    RETURNING stock_pieces INTO v_new_stock;

  IF v_new_stock IS NULL THEN
    v_result := jsonb_build_object('ok', false, 'reason', 'insufficient_stock_or_not_found');
    UPDATE applied_operations SET status = 'failed', result = v_result, completed_at = now()
    WHERE business_id = v_business_id AND client_operation_id = p_client_operation_id;
    RETURN v_result;
  END IF;

  INSERT INTO inventory_logs(id, product_id, branch_id, type, pieces_delta, reason, user_id)
  VALUES (
    gen_random_uuid(),
    p_product_id,
    p_branch_id,
    v_log_type,
    p_delta,
    v_reason_text,
    auth.uid()
  );

  v_result := jsonb_build_object('ok', true, 'new_stock_pieces', v_new_stock);
  UPDATE applied_operations SET status = 'completed', result = v_result, completed_at = now()
  WHERE business_id = v_business_id AND client_operation_id = p_client_operation_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_inventory_delta TO authenticated;

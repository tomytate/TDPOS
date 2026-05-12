-- TD POS - Tenant export audit marker
--
-- The tenant-data export Edge Function is mostly read-only, but exporting
-- tenant data is sensitive enough to audit. This RPC records that audit event
-- exactly once per client_operation_id and returns the caller's business id
-- for the Edge Function's explicit admin-side tenant filters.

CREATE OR REPLACE FUNCTION public.record_tenant_export(p_client_operation_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_business_id UUID;
  v_role TEXT;
  v_won_race BOOLEAN := FALSE;
  v_result JSONB;
  v_existing_result JSONB;
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

  IF v_role <> 'owner' THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'forbidden');
  END IF;

  v_result := jsonb_build_object(
    'ok', TRUE,
    'business_id', v_business_id,
    'user_id', v_uid,
    'action', 'tenant.exported'
  );

  INSERT INTO applied_operations (
    business_id,
    client_operation_id,
    status,
    result,
    applied_at,
    completed_at
  )
  VALUES (
    v_business_id,
    p_client_operation_id,
    'completed',
    v_result,
    now(),
    now()
  )
  ON CONFLICT (business_id, client_operation_id) DO NOTHING
  RETURNING TRUE INTO v_won_race;

  IF NOT COALESCE(v_won_race, FALSE) THEN
    SELECT result
    INTO v_existing_result
    FROM applied_operations
    WHERE business_id = v_business_id
      AND client_operation_id = p_client_operation_id;

    RETURN COALESCE(v_existing_result, v_result)
      || jsonb_build_object('replayed', TRUE);
  END IF;

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
    'tenant.exported',
    'business',
    v_business_id,
    NULL,
    jsonb_build_object(
      'client_operation_id', p_client_operation_id,
      'export_format', 'json',
      'contains_pii', TRUE
    )
  );

  RETURN v_result || jsonb_build_object('replayed', FALSE);
END
$$;

GRANT EXECUTE ON FUNCTION public.record_tenant_export(UUID) TO authenticated;

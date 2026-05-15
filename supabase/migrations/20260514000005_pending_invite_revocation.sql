-- TD POS - Pending invite revocation
--
-- Keeps invite history while letting owners/managers revoke an open invite
-- without deleting rows or touching auth.users.

ALTER TABLE pending_invites
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

DROP INDEX IF EXISTS idx_pending_invites_open;
CREATE UNIQUE INDEX idx_pending_invites_open
  ON pending_invites (business_id, phone)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

DROP INDEX IF EXISTS idx_pending_invites_phone_open;
CREATE INDEX idx_pending_invites_phone_open
  ON pending_invites (phone)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.consume_pending_invite(p_phone TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_invite pending_invites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'consume_pending_invite: unauthenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE id = v_uid) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_invite
  FROM pending_invites
  WHERE phone = p_phone
    AND consumed_at IS NULL
    AND revoked_at IS NULL
  ORDER BY invited_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  PERFORM public.assert_business_limit(
    v_invite.business_id,
    'users',
    (SELECT COUNT(*)::INTEGER + 1 FROM users WHERE business_id = v_invite.business_id)
  );

  INSERT INTO users (id, phone, role, business_id)
  VALUES (v_uid, p_phone, v_invite.role, v_invite.business_id);

  UPDATE pending_invites
  SET consumed_at = now(), consumed_by = v_uid
  WHERE id = v_invite.id;

  RETURN v_invite.id;
END
$$;

CREATE OR REPLACE FUNCTION public.business_user_population(p_business_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::INTEGER FROM users WHERE business_id = p_business_id)
    + (SELECT COUNT(*)::INTEGER FROM pending_invites
        WHERE business_id = p_business_id
          AND consumed_at IS NULL
          AND revoked_at IS NULL);
$$;

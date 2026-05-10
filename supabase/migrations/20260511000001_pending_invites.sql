-- TD POS — Pending invites
--
-- `users.id` must equal `auth.users.id` (FK enforced for the auth join).
-- That means an owner can't pre-create a `users` row for an invitee who
-- hasn't signed in yet — so invitations live in this companion table and
-- get consumed on the invitee's first OTP sign-in.
--
-- Idempotent like the rest of the migrations.

CREATE TABLE IF NOT EXISTS pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier'
    CHECK (role IN ('owner', 'manager', 'cashier', 'tindera')),
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at TIMESTAMPTZ,
  consumed_by UUID REFERENCES users(id)
);

-- One open invite per (business, phone). Consumed invites are kept for
-- audit; the partial unique index leaves them out of the constraint.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_invites_open
  ON pending_invites (business_id, phone)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pending_invites_phone_open
  ON pending_invites (phone)
  WHERE consumed_at IS NULL;

ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped read + write. The consume RPC below uses SECURITY DEFINER
-- to bypass these policies so an unauthenticated-yet-not-fully-provisioned
-- user (auth.users row exists, no users row yet) can still consume their
-- own invite without seeing other tenants' invites.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'pending_invites' AND policyname = 'pending_invites_select'
  ) THEN
    CREATE POLICY pending_invites_select ON pending_invites FOR SELECT
      USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'pending_invites' AND policyname = 'pending_invites_insert'
  ) THEN
    CREATE POLICY pending_invites_insert ON pending_invites FOR INSERT
      WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'pending_invites' AND policyname = 'pending_invites_update'
  ) THEN
    CREATE POLICY pending_invites_update ON pending_invites FOR UPDATE
      USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()))
      WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));
  END IF;
END $$;

-- Atomic consume — runs on the invitee's first sign-in, before the bootstrap
-- has populated the users row. Returns the consumed invite id when a match
-- exists, NULL otherwise. Caller must already be authenticated; the function
-- refuses if there is already a users row for the auth.uid (idempotent if
-- replayed after a successful first consume).
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

  -- If the user is already provisioned, nothing to do.
  IF EXISTS (SELECT 1 FROM users WHERE id = v_uid) THEN
    RETURN NULL;
  END IF;

  -- One open invite per (business, phone) — idx_pending_invites_open enforces
  -- it. We pick the most recent open invite if duplicates somehow appear.
  SELECT * INTO v_invite
  FROM pending_invites
  WHERE phone = p_phone AND consumed_at IS NULL
  ORDER BY invited_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Tier limit gate: refuse if the business is at max_users. The check
  -- happens here (not at invite-creation) so an over-invite scenario fails
  -- closed at consume time with a clear error the bootstrap can surface.
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

GRANT EXECUTE ON FUNCTION public.consume_pending_invite(TEXT) TO authenticated;

-- Helper used by Server Actions to pre-flight invite creation. Returns the
-- combined count of provisioned users + open pending invites so the action
-- can compare against businesses.max_users without re-implementing the math.
CREATE OR REPLACE FUNCTION public.business_user_population(p_business_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::INTEGER FROM users WHERE business_id = p_business_id)
    + (SELECT COUNT(*)::INTEGER FROM pending_invites
        WHERE business_id = p_business_id AND consumed_at IS NULL);
$$;

GRANT EXECUTE ON FUNCTION public.business_user_population(UUID) TO authenticated;

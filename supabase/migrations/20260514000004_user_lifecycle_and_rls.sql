-- TD POS - User lifecycle and tenant staff visibility
--
-- Owner/manager web pages need to list staff in the same tenant. The initial
-- users policy allowed only self-read, which was safe but blocked management.
-- This migration adds lifecycle columns and definer helpers so RLS can avoid
-- recursive self-queries on the users table.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

CREATE OR REPLACE FUNCTION public.current_business_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM users
  WHERE id = auth.uid()
    AND COALESCE(is_active, true)
  LIMIT 1;
$$;

DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_update" ON users;

CREATE POLICY users_select_self_or_staff_manager ON users FOR SELECT
  USING (
    id = auth.uid()
    OR (
      business_id = public.current_business_id()
      AND public.current_user_role() IN ('owner', 'manager')
    )
  );

CREATE POLICY users_update_self_or_staff_manager ON users FOR UPDATE
  USING (
    id = auth.uid()
    OR (
      business_id = public.current_business_id()
      AND public.current_user_role() IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    business_id = public.current_business_id()
  );

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

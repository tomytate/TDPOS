-- TD POS — Business limit triggers (defense-in-depth)
--
-- Server Actions in apps/web call `assert_business_limit` before inserting,
-- and `consume_pending_invite` enforces the user limit at consume time.
-- These BEFORE-INSERT triggers are the second line of defense: any path
-- that reaches the table directly (Edge Function, future RPC, raw SQL)
-- still fails closed when the tenant is over its `max_*` allowance.
--
-- `business_devices_limit_guard` already exists in
-- 20260511000000_tier_surface_scaffold.sql; this migration adds the
-- products / branches / users / pending_invites equivalents.

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_business_product_limit()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_business_limit(
    NEW.business_id,
    'products',
    (SELECT COUNT(*)::INTEGER + 1 FROM products WHERE business_id = NEW.business_id)
  );
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS products_limit_guard ON products;
CREATE TRIGGER products_limit_guard
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_business_product_limit();

-- ============================================================
-- BRANCHES
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_business_branch_limit()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_business_limit(
    NEW.business_id,
    'branches',
    (SELECT COUNT(*)::INTEGER + 1 FROM branches WHERE business_id = NEW.business_id)
  );
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS branches_limit_guard ON branches;
CREATE TRIGGER branches_limit_guard
  BEFORE INSERT ON branches
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_business_branch_limit();

-- ============================================================
-- USERS
-- ----------------------------------------------------------------
-- The users-only limit (NOT combined with open invites). When
-- consume_pending_invite inserts a users row, the still-open
-- pending_invite row is being consumed in the same transaction; if
-- this trigger counted invites it would over-count by one and falsely
-- reject legitimate consume operations near the limit. INSERT into
-- pending_invites uses the combined-population check via its own
-- trigger below.
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_business_user_limit()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_business_limit(
    NEW.business_id,
    'users',
    (SELECT COUNT(*)::INTEGER + 1 FROM users WHERE business_id = NEW.business_id)
  );
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS users_limit_guard ON users;
CREATE TRIGGER users_limit_guard
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_business_user_limit();

-- ============================================================
-- PENDING_INVITES
-- ----------------------------------------------------------------
-- Combined population: provisioned users + open invites. An owner
-- inviting their N+1th seat after already at max_users fails here even
-- if the Server Action's pre-check is bypassed.
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_pending_invite_limit()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_business_limit(
    NEW.business_id,
    'users',
    public.business_user_population(NEW.business_id) + 1
  );
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS pending_invites_limit_guard ON pending_invites;
CREATE TRIGGER pending_invites_limit_guard
  BEFORE INSERT ON pending_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_pending_invite_limit();

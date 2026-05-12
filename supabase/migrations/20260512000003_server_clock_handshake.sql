-- TD POS - Server clock handshake
--
-- Read-only RPC used by mobile devices after a successful authenticated
-- entitlement refresh. The cached value lets local checkout reject brand-new
-- receipts when the device clock has drifted too far from the last server
-- contact while still allowing offline idempotent sale replays.

CREATE OR REPLACE FUNCTION server_clock_handshake()
RETURNS TIMESTAMPTZ
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT now();
$$;

GRANT EXECUTE ON FUNCTION server_clock_handshake() TO authenticated;

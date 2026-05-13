-- TD POS — Device recovery metadata
--
-- A lost cashier device is not just a status flip. Support needs to know
-- when it was reported, who reported it, and whether a replacement is being
-- prepared before a new install id starts heartbeating into the same branch.

ALTER TABLE business_devices
  ADD COLUMN IF NOT EXISTS lost_reported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lost_reported_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS replacement_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recovery_note TEXT;

CREATE INDEX IF NOT EXISTS idx_business_devices_recovery
  ON business_devices(business_id, status, lost_reported_at DESC)
  WHERE status = 'lost';

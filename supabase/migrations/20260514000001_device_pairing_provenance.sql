-- TD POS — Device pairing provenance
--
-- `business_devices` records whether a device is still on the bootstrap
-- fallback identity or has consumed an owner-issued pairing code. Checkout
-- blocks fallback devices locally; these columns make the same state visible
-- to owners and support.

ALTER TABLE business_devices
  ADD COLUMN IF NOT EXISTS device_pairing_status TEXT NOT NULL DEFAULT 'fallback',
  ADD COLUMN IF NOT EXISTS device_pairing_id UUID REFERENCES device_pairing_codes(id),
  ADD COLUMN IF NOT EXISTS device_paired_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_devices_pairing_status_check'
      AND conrelid = 'business_devices'::regclass
  ) THEN
    ALTER TABLE business_devices
      ADD CONSTRAINT business_devices_pairing_status_check
      CHECK (device_pairing_status IN ('unpaired', 'fallback', 'paired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_business_devices_pairing_status
  ON business_devices(business_id, device_pairing_status, last_seen_at DESC);

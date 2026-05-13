-- TD POS - Sale void links
--
-- Sales stay immutable. Voids are represented by a compensating sale row and
-- a durable link back to the original sale so reports, receipts, and support
-- diagnostics can explain the correction without rewriting history.

CREATE TABLE IF NOT EXISTS sale_voids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  original_sale_id UUID NOT NULL REFERENCES sales(id),
  compensating_sale_id UUID NOT NULL REFERENCES sales(id),
  reason TEXT NOT NULL CHECK (
    reason IN ('wrong_item', 'customer_cancelled', 'duplicate_sale', 'cashier_error', 'other')
  ),
  reason_note TEXT,
  voided_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(original_sale_id),
  UNIQUE(compensating_sale_id)
);

CREATE INDEX IF NOT EXISTS idx_sale_voids_business_created
  ON sale_voids(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sale_voids_original
  ON sale_voids(original_sale_id);

ALTER TABLE sale_voids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_voids_select" ON sale_voids;
CREATE POLICY "sale_voids_select" ON sale_voids FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "sale_voids_insert" ON sale_voids;
CREATE POLICY "sale_voids_insert" ON sale_voids FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION prevent_sale_voids_mutation()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  RAISE EXCEPTION 'sale_voids rows are immutable: % not allowed', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS sale_voids_immutability ON sale_voids;
CREATE TRIGGER sale_voids_immutability
  BEFORE UPDATE OR DELETE ON sale_voids
  FOR EACH ROW EXECUTE FUNCTION prevent_sale_voids_mutation();

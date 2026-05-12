-- TD POS - Stock take count snapshots
--
-- Durable cycle-count scaffold for Stock Accuracy Score. Adjustment deltas
-- still flow through `apply_inventory_delta`; this table preserves the count
-- snapshot needed to explain the score later.

CREATE TABLE IF NOT EXISTS stock_take_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  product_id UUID NOT NULL REFERENCES products(id),
  counted_stock_pieces INTEGER NOT NULL CHECK (counted_stock_pieces >= 0),
  system_stock_pieces_before INTEGER NOT NULL CHECK (system_stock_pieces_before >= 0),
  pieces_delta INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('count_correction', 'damage', 'theft', 'expiry', 'other')),
  reason_note TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_take_counts_latest
  ON stock_take_counts(business_id, product_id, created_at DESC);

ALTER TABLE stock_take_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_take_counts_select" ON stock_take_counts;
CREATE POLICY "stock_take_counts_select" ON stock_take_counts FOR SELECT
  USING (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "stock_take_counts_insert" ON stock_take_counts;
CREATE POLICY "stock_take_counts_insert" ON stock_take_counts FOR INSERT
  WITH CHECK (business_id = (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE OR REPLACE FUNCTION prevent_stock_take_counts_mutation()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  RAISE EXCEPTION 'stock_take_counts rows are immutable: % not allowed', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS stock_take_counts_immutability ON stock_take_counts;
CREATE TRIGGER stock_take_counts_immutability
  BEFORE UPDATE OR DELETE ON stock_take_counts
  FOR EACH ROW EXECUTE FUNCTION prevent_stock_take_counts_mutation();
